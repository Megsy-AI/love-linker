/**
 * @doc manus-proxy
 * OpenAI-compatible model endpoint used **only** by the OpenManus sandbox.
 *
 * The agent runs inside an isolated Novita sandbox and needs an OpenAI-style
 * `/chat/completions` URL. Pointing it straight at a provider would mean copying
 * provider keys into the sandbox, so instead the sandbox talks to this function
 * with the per-run token stored on `manus_runs.run_token`. The token is only
 * valid while that run is alive, and the real provider keys never leave Supabase.
 *
 * Routing itself is unchanged: `callModel` keeps Cerebras primary with the
 * abliteration.ai fallback, so the agent uses the exact same models as chat.
 *
 * POST <fn>/v1/chat/completions   body: OpenAI chat-completions payload
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callModel } from "../_shared/abliteration.ts";
import { dataServiceKey, dataUrl } from "../_shared/dataProject.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function admin() {
  return createClient(dataUrl(), dataServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  if (url.pathname.endsWith("/models")) {
    return json({
      object: "list",
      data: [{ id: "megsy", object: "model", owned_by: "megsy" }],
    });
  }
  if (!url.pathname.endsWith("/chat/completions")) return json({ error: "not found" }, 404);
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (token.length < 32) return json({ error: { message: "missing run token" } }, 401);

  const db = admin();
  const { data: run } = await db
    .from("manus_runs")
    .select("id,status")
    .eq("run_token", token)
    .maybeSingle();
  if (!run) return json({ error: { message: "invalid run token" } }, 401);
  if (!["queued", "running", "awaiting_input"].includes(String(run.status))) {
    return json({ error: { message: "run is not active" } }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: { message: "invalid JSON body" } }, 400);
  }

  // The agent's own model id is a placeholder; the ladder decides the real model.
  delete payload.model;
  const result = await callModel(db as unknown as { from: (t: string) => any }, [], {
    ...payload,
    agentRole: "worker",
  });
  if (!result) return json({ error: { message: "no model provider available" } }, 502);

  return new Response(result.response.body, {
    status: result.response.status,
    headers: {
      ...corsHeaders,
      "Content-Type": result.response.headers.get("content-type") ?? "application/json",
    },
  });
});
