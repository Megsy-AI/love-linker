/** @doc dodo-checkout — creates a Dodo Payments checkout session (global/USD payments)
 *  and a pending dodo_orders row. Kashier stays the Arabic/EGP path. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Dodo catalogue key -> { plan, amount (USD), credits }. Keys match the
// `interval` column of public.dodo_products.
const PLANS: Record<string, { plan: string; amount: number; credits: number }> = {
  monthly: { plan: "pro", amount: 20, credits: 1000 },
  monthly_intro: { plan: "pro", amount: 7, credits: 1000 },
  monthly_winback: { plan: "pro", amount: 5, credits: 1000 },
  yearly: { plan: "pro", amount: 160, credits: 12000 },
  yearly_winback: { plan: "pro", amount: 149, credits: 12000 },
};

// Legacy SKUs still sent by older clients -> catalogue key.
const SKU_TO_KEY: Record<string, string> = {
  plan_pro_m: "monthly",
  plan_pro_m_first: "monthly_intro",
  plan_pro_m_winback: "monthly_winback",
  plan_pro_y: "yearly",
  plan_pro_y_winback: "yearly_winback",
  plan_elite_m: "monthly",
  plan_elite_m_first: "monthly_intro",
  plan_elite_y: "yearly",
};

/** Resolves the catalogue key from any of sku / interval / trial / offer. */
function resolveKey(p: Record<string, unknown>): string | null {
  const sku = String(p.sku ?? "").trim();
  if (sku && SKU_TO_KEY[sku]) return SKU_TO_KEY[sku];

  const raw = String(p.interval ?? p.plan_interval ?? "monthly").toLowerCase();
  const yearly = /year|annual|y$/.test(raw);
  const offer = String(p.offer ?? "").toLowerCase();
  const winback = p.winback === true || /winback|win_back|return/.test(offer);
  const intro = p.trial === true || p.intro === true || /intro|first|trial/.test(offer);

  if (yearly) return winback ? "yearly_winback" : "yearly";
  if (winback) return "monthly_winback";
  if (intro) return "monthly_intro";
  return "monthly";
}


const API_BASE = (Deno.env.get("DODO_PAYMENTS_ENVIRONMENT") || "live_mode") === "test_mode"
  ? "https://test.dodopayments.com"
  : "https://live.dodopayments.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("DODO_PAYMENTS_API_KEY");
  if (!apiKey) return json({ error: "Dodo Payments is not configured" }, 503);

  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const sku = String(payload.sku ?? "");
  const key = resolveKey(payload);
  const info = key ? PLANS[key] : null;
  if (!key || !info) return json({ error: "unknown plan" }, 400);

  // Resolve the exact Dodo product for this catalogue key.
  const { data: product } = await admin
    .from("dodo_products")
    .select("product_id,interval")
    .eq("interval", key)
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const productId = String(payload.product_id ?? "") || product?.product_id || "";
  if (!productId) {
    return json({ error: `No Dodo product configured for "${key}"` }, 503);
  }
  const isSubscription = true; // every catalogue entry is a recurring plan

  const orderId = `dodo_${crypto.randomUUID()}`;
  const siteUrl = Deno.env.get("SITE_URL") || "https://megsyai.com";

  const { error: insertErr } = await admin.from("dodo_orders").insert({
    order_id: orderId,
    user_id: user.id,
    amount: info.amount,
    currency: "USD",
    credits: info.credits,
    plan: info.plan,
    status: "pending",
    raw: { sku, plan_key: key, product_id: productId },
  });

  if (insertErr) return json({ error: insertErr.message }, 500);

  const body = {
    payment_link: true,
    return_url: `${siteUrl}/billing/success?provider=dodo&order=${orderId}`,
    customer: { email: user.email ?? "", name: user.user_metadata?.full_name ?? user.email ?? "" },
    billing: {
      city: String(payload.city ?? "NA"),
      country: String(payload.country ?? "US"),
      state: String(payload.state ?? "NA"),
      street: String(payload.street ?? "NA"),
      zipcode: String(payload.zipcode ?? "00000"),
    },
    metadata: { order_id: orderId, user_id: user.id, sku, credits: String(info.credits), plan: info.plan },
    ...(isSubscription
      ? { product_id: productId, quantity: 1 }
      : { product_cart: [{ product_id: productId, quantity: 1 }] }),
  };

  const res = await fetch(`${API_BASE}/${isSubscription ? "subscriptions" : "payments"}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    await admin.from("dodo_orders").update({ status: "failed", raw: data }).eq("order_id", orderId);
    return json({ error: `Dodo error ${res.status}`, details: data }, 502);
  }

  const checkoutUrl = data.payment_link || data.checkout_url || data.url;
  await admin
    .from("dodo_orders")
    .update({
      dodo_payment_id: data.payment_id ?? null,
      dodo_subscription_id: data.subscription_id ?? null,
      raw: data,
    })
    .eq("order_id", orderId);

  return json({ ok: true, checkout_url: checkoutUrl, order_id: orderId });
});
