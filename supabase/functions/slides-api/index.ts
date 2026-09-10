/**
 * @doc slides-api
 * Support endpoint for the slides feature (see src/components/chat/ImageSlidesCard.tsx
 * and the `pptx_jobs` table).
 *
 * Actions (POST JSON { action, ... }):
 *  - images_pdf: proxy-fetch a remote PDF and stream it back with CORS
 *    headers so the browser's pdf.js can render it (some CDNs block direct
 *    cross-origin fetches).
 *  - create: { prompt, doc_type? } — insert a row into `pptx_jobs` (status
 *    "queued") owned by the caller; a worker/back-office process picks it up.
 *  - status: { id } — read back a `pptx_jobs` row the caller owns.
 *  - export: { id } — return the finished file URL for a `pptx_jobs` row.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getCallerUser(db: ReturnType<typeof admin>, req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = String(body.action || "");
  const db = admin();

  // ------------------------------------------------------------ images_pdf
  if (action === "images_pdf") {
    const url = String(body.url || "");
    if (!/^https?:\/\//i.test(url)) return json({ error: "valid url is required" }, 400);
    try {
      const upstream = await fetch(url);
      if (!upstream.ok || !upstream.body) {
        return json({ error: `upstream fetch failed (${upstream.status})` }, 502);
      }
      return new Response(upstream.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": upstream.headers.get("content-type") || "application/pdf",
        },
      });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "proxy failed" }, 502);
    }
  }

  // -------------------------------------------------------------- authed
  const user = await getCallerUser(db, req);
  if (!user) return json({ error: "auth_required", message: "Please sign in to continue." }, 401);

  if (action === "create") {
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return json({ error: "prompt is required" }, 400);
    const doc_type = String(body.doc_type || "pptx");
    const { data, error } = await db
      .from("pptx_jobs")
      .insert({ user_id: user.id, prompt, doc_type, status: "queued" })
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ job: data });
  }

  if (action === "status") {
    const id = String(body.id || "");
    if (!id) return json({ error: "id is required" }, 400);
    const { data, error } = await db
      .from("pptx_jobs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: "not found" }, 404);
    return json({ job: data });
  }

  if (action === "export") {
    const id = String(body.id || "");
    if (!id) return json({ error: "id is required" }, 400);
    const { data, error } = await db
      .from("pptx_jobs")
      .select("id,status,file_url,file_name")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: "not found" }, 404);
    if (data.status !== "done" || !data.file_url) {
      return json({ error: "not ready", status: data.status }, 409);
    }
    return json({ url: data.file_url, file_name: data.file_name });
  }

  return json({ error: "unknown action" }, 400);
});
