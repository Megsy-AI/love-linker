/** @doc kashier-webhook — verifies Kashier payment notifications and marks kashier_orders paid/failed.
 *  A database trigger then grants credits and activates the plan. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-kashier-signature",
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

/** Constant-time compare of two hex strings. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Kashier signs the notification with an HMAC over a query string built from
 * the keys listed in `data.signatureKeys`, in that exact order.
 */
function buildSignedQuery(data: Record<string, unknown>) {
  const keys = Array.isArray(data.signatureKeys) ? (data.signatureKeys as string[]) : [];
  if (keys.length === 0) return null;
  return keys.map((k) => `${k}=${data[k] ?? ""}`).join("&");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("KASHIER_SECRET");
  if (!secret) return json({ error: "Kashier is not configured" }, 503);

  const raw = await req.text();
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const data = (event.data ?? {}) as Record<string, unknown>;
  const headerSignature = req.headers.get("x-kashier-signature") ?? "";
  const signedQuery = buildSignedQuery(data);
  if (!signedQuery || !headerSignature) return json({ error: "missing signature" }, 401);

  const expected = await hmacHex(secret, signedQuery);
  if (!safeEqual(expected.toLowerCase(), headerSignature.trim().toLowerCase())) {
    return json({ error: "invalid signature" }, 401);
  }

  const orderId = String(data.merchantOrderId ?? data.orderId ?? "");
  if (!orderId) return json({ error: "missing order id" }, 400);

  const status = String(data.status ?? "").toUpperCase();
  const nextStatus = status === "SUCCESS" || status === "PAID"
    ? "paid"
    : status === "FAILURE" || status === "FAILED" || status === "DECLINED"
      ? "failed"
      : "pending";

  // Only move a pending order forward — replays cannot re-grant a paid order.
  const { data: updated, error } = await admin
    .from("kashier_orders")
    .update({
      status: nextStatus,
      kashier_ref: String(data.transactionId ?? data.kashierOrderId ?? "") || null,
      raw: event,
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", orderId)
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, order_id: orderId, status: updated?.status ?? "unchanged" });
});
