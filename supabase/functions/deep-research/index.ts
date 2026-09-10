/** @doc Deep Research endpoint (ported from the dev-only `api/deep-research.ts`).
 * Streams the research run as SSE using the exact event shapes the client parses.
 */
import { corsHeaders } from "../_shared/cors.ts";
import { guardRequest, guardResponse } from "../_shared/apiAuth.ts";
import { streamDeepResearch, type ResearchPayload } from "./core.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authenticate + rate limit BEFORE any model, search or streaming work.
  const guard = await guardRequest(req, "deep-research");
  if (!guard.ok) return guardResponse(guard, corsHeaders);

  const payload = (await req.json().catch(() => null)) as ResearchPayload | null;
  try {
    const resp = await streamDeepResearch(payload ?? {});
    const headers = new Headers(resp.headers);
    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
    return new Response(resp.body, { status: resp.status, headers });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "research_failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
