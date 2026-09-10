/** @doc report-error — records a client-side error into admin_error_log (anonymous callers allowed). */
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const message = String(payload.message ?? "").slice(0, 5000);
  if (!message) return json({ error: "message required" }, 400);
  const source = String(payload.source ?? "client").slice(0, 200);

  // Best-effort caller identity: never block on a bad/missing token.
  let userId: string | null = null;
  let userEmail: string | null = null;
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (token) {
    try {
      const { data } = await admin.auth.getUser(token);
      if (data?.user) {
        userId = data.user.id;
        userEmail = data.user.email ?? null;
      }
    } catch {
      // ignore — anonymous report
    }
  }

  const { error } = await admin.from("admin_error_log").insert({
    source: source || "client",
    route: payload.route ? String(payload.route).slice(0, 500) : null,
    message,
    raw_error: payload.raw_error ? String(payload.raw_error).slice(0, 20000) : null,
    context: payload.context ?? {},
    user_agent: payload.user_agent ? String(payload.user_agent).slice(0, 500) : null,
    user_id: userId,
    user_email: userEmail,
  });

  if (error) {
    console.error("report-error insert failed", error);
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
});
