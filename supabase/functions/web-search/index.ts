/** @doc Edge-function port of api/web-search.ts — Deep Research web lookups
 *  (keys live in Supabase, never in the client). */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { webSearch } from "../_shared/search/webSearchCore.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!bearer) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await admin.auth.getUser(bearer);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const body = (await req.json().catch(() => null)) as {
    query?: string;
    count?: number;
    offset?: number;
  } | null;

  try {
    const data = await webSearch(
      String(body?.query ?? ""),
      Number(body?.count ?? 8),
      Number(body?.offset ?? 0),
    );
    return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(
      JSON.stringify({ results: [], error: err instanceof Error ? err.message : "search failed" }),
      { status: 502, headers: corsHeaders },
    );
  }
});
