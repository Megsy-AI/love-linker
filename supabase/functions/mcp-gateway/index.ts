/** @doc Edge-function port of api/mcp.ts — MCP gateway (tool servers the user
 *  connected). Ported so this feature also works in the deployed app, not
 *  just via the local vite dev middleware. */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleMcpGateway, type GatewayPayload } from "../_shared/mcp/gatewayCore.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!bearer) {
    return new Response(JSON.stringify({ ok: false, error: "Not signed in" }), {
      status: 401,
      headers: corsHeaders,
    });
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await admin.auth.getUser(bearer);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ ok: false, error: "Not signed in" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const body = (await req.json().catch(() => null)) as GatewayPayload | null;
  try {
    const result = await handleMcpGateway(body ? { ...body, token: bearer } : body);
    return new Response(JSON.stringify(result.body), { status: result.status, headers: corsHeaders });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "mcp_failed" }),
      { status: 500, headers: corsHeaders },
    );
  }
});
