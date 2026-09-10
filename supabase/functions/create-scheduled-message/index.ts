/** @doc create-scheduled-message — saves a recurring prompt for the signed-in
 *  user so the scheduler can run it later (cron + timezone aware). */
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Minimal 5-field cron validation (m h dom mon dow). */
function validCron(v: string) {
  const parts = v.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return parts.every((p) => /^[0-9*,\-/]+$/.test(p));
}

/** Next run for the common "m h * * *" / "m h * * d" shapes; null otherwise. */
function nextRunAt(cron: string): string | null {
  const [m, h, , , dow] = cron.trim().split(/\s+/);
  const minute = Number(m);
  const hour = Number(h);
  if (!Number.isFinite(minute) || !Number.isFinite(hour)) return null;
  const now = new Date();
  const next = new Date(now);
  next.setUTCSeconds(0, 0);
  next.setUTCHours(hour, minute, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  if (dow && dow !== "*") {
    const target = Number(dow.split(",")[0]);
    if (Number.isFinite(target)) {
      let guard = 0;
      while (next.getUTCDay() !== target % 7 && guard < 8) {
        next.setUTCDate(next.getUTCDate() + 1);
        guard += 1;
      }
    }
  }
  return next.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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

  const prompt = String(payload.prompt ?? "").trim();
  if (prompt.length < 2 || prompt.length > 4000) {
    return json({ error: "prompt must be between 2 and 4000 characters" }, 400);
  }
  const cron = String(payload.cron ?? "0 10 * * *").trim();
  if (!validCron(cron)) return json({ error: "invalid cron expression" }, 400);
  const timezone = String(payload.timezone ?? "UTC").slice(0, 64);
  const title = payload.title ? String(payload.title).slice(0, 200) : null;

  const { data, error } = await admin
    .from("scheduled_user_messages")
    .insert({
      user_id: user.id,
      prompt,
      schedule_cron: cron,
      timezone,
      title,
      enabled: true,
      next_run_at: nextRunAt(cron),
    })
    .select("id,next_run_at")
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, id: data.id, next_run_at: data.next_run_at });
});
