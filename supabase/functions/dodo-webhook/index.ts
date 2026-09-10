/** @doc dodo-webhook — receives Dodo Payments webhooks (Standard Webhooks signature),
 *  marks dodo_orders paid, grants credits and upgrades the user's plan. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, webhook-id, webhook-signature, webhook-timestamp",
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

function b64ToBytes(b64: string) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Standard Webhooks: sign "<id>.<timestamp>.<body>" with the base64 secret. */
async function verify(secretRaw: string, id: string, ts: string, body: string, header: string) {
  const secret = secretRaw.startsWith("whsec_") ? secretRaw.slice(6) : secretRaw;
  let keyBytes: Uint8Array;
  try {
    keyBytes = b64ToBytes(secret);
  } catch {
    keyBytes = new TextEncoder().encode(secret);
  }
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return header
    .split(" ")
    .map((p) => (p.includes(",") ? p.split(",")[1] : p))
    .some((p) => p === expected);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const raw = await req.text();
  const secret = Deno.env.get("DODO_WEBHOOK_SECRET");
  const id = req.headers.get("webhook-id") ?? "";
  const ts = req.headers.get("webhook-timestamp") ?? "";
  const sigHeader = req.headers.get("webhook-signature") ?? "";

  if (!secret) return json({ error: "DODO_WEBHOOK_SECRET is not configured" }, 503);
  if (!id || !ts || !sigHeader) return json({ error: "missing signature headers" }, 401);
  if (!(await verify(secret, id, ts, raw, sigHeader))) {
    return json({ error: "invalid signature" }, 401);
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const type = String(event?.type ?? "");
  const data = event?.data ?? {};
  const meta = data?.metadata ?? {};
  const orderId = String(meta.order_id ?? "");
  const userId = String(meta.user_id ?? "");

  // Idempotency: skip already-processed webhook ids.
  const { data: seen } = await admin
    .from("payment_events")
    .select("id")
    .eq("polar_event_id", `dodo_${id}`)
    .maybeSingle();
  if (seen) return json({ ok: true, duplicate: true });

  const success = [
    "payment.succeeded",
    "subscription.active",
    "subscription.renewed",
  ].includes(type);
  const failure = ["payment.failed", "payment.cancelled", "subscription.cancelled", "subscription.expired"]
    .includes(type);

  if (orderId) {
    await admin
      .from("dodo_orders")
      .update({
        status: success ? "paid" : failure ? "failed" : "pending",
        dodo_payment_id: data?.payment_id ?? null,
        dodo_subscription_id: data?.subscription_id ?? null,
        raw: event,
      })
      .eq("order_id", orderId);
  }

  if (success && userId) {
    const credits = Number(meta.credits ?? 0);
    const plan = String(meta.plan ?? "");
    if (credits > 0) {
      await admin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: credits,
        p_description: `dodo:${type}:${orderId}`,
      });
    }
    if (plan) {
      await admin.from("profiles").update({ plan }).eq("id", userId);
      const row = {
        plan,
        status: "active",
        currency: "USD",
        amount_cents: Math.round(Number(data?.total_amount ?? 0)),
        current_period_end: data?.next_billing_date ?? null,
      };
      const { data: existing } = await admin
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (existing?.id) {
        await admin.from("subscriptions").update(row).eq("id", existing.id);
      } else {
        await admin.from("subscriptions").insert({ user_id: userId, ...row });
      }
    }
  }

  if (failure && userId && String(type).startsWith("subscription")) {
    await admin.from("profiles").update({ plan: "free" }).eq("id", userId);
    await admin.from("subscriptions").update({ status: "cancelled" }).eq("user_id", userId);
  }

  await admin.from("payment_events").insert({
    user_id: userId || null,
    event_type: type,
    polar_event_id: `dodo_${id}`,
    payload: event,
  });

  return json({ ok: true });
});
