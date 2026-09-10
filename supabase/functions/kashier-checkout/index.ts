/** @doc kashier-checkout — creates a Kashier hosted-payment-page session and a pending kashier_orders row. */
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

// SKU -> { plan, amount (EGP), credits }. Keep in sync with billing copy.
const SKU_TABLE: Record<string, { plan: string; amount: number; credits: number }> = {
  plan_pro_m_first: { plan: "pro", amount: 249, credits: 1000 },
  plan_pro_m: { plan: "pro", amount: 499, credits: 1000 },
  plan_elite_m: { plan: "elite", amount: 999, credits: 3000 },
  plan_elite_m_first: { plan: "elite", amount: 499, credits: 3000 },
};

async function hmacHex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
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
  const method = String(payload.method ?? "card");
  const offer = payload.offer ? String(payload.offer) : null;
  const display = payload.display ? String(payload.display) : "en";

  const skuInfo = SKU_TABLE[sku];
  if (!skuInfo) return json({ error: "unknown sku" }, 400);

  const merchantId = Deno.env.get("KASHIER_MERCHANT_ID");
  const secret = Deno.env.get("KASHIER_SECRET");
  if (!merchantId || !secret) {
    return json({ error: "Kashier is not configured (missing KASHIER_MERCHANT_ID / KASHIER_SECRET)" }, 503);
  }

  const orderId = `ord_${crypto.randomUUID()}`;
  const currency = "EGP";
  const amount = skuInfo.amount;

  const { error: insertErr } = await admin.from("kashier_orders").insert({
    order_id: orderId,
    user_id: user.id,
    amount,
    currency,
    credits: skuInfo.credits,
    plan: skuInfo.plan,
    method,
    status: "pending",
    raw: { sku, offer, display },
  });
  if (insertErr) return json({ error: insertErr.message }, 500);

  // Kashier hosted checkout signature: path = "/?payment=" + merchantId + "." + orderId + "." + amount + "." + currency
  const path = `/?payment=${merchantId}.${orderId}.${amount}.${currency}`;
  const hash = await hmacHex(secret, path);

  const siteUrl = Deno.env.get("SITE_URL") || "https://megsyai.com";
  const redirectUrl = `${siteUrl}/billing/success?provider=kashier&order=${encodeURIComponent(orderId)}`;
  // Server-to-server notification: this is what actually credits the account,
  // so a closed browser tab can never lose a paid order.
  const serverWebhook = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kashier-webhook`;

  const params = new URLSearchParams({
    merchantId,
    orderId,
    amount: String(amount),
    currency,
    hash,
    mode: "live",
    merchantRedirect: redirectUrl,
    serverWebhook,
    display,
    paymentRequestId: orderId,
    metaData: JSON.stringify({ sku, offer, user_id: user.id }),
    type: "external",
    interactionSource: "ECommerce",
    allowedMethods: method === "wallet" ? "wallet" : "card",
  });


  const checkoutUrl = `https://checkout.kashier.io/?${params.toString()}`;

  return json({ ok: true, checkout_url: checkoutUrl, order_id: orderId });
});
