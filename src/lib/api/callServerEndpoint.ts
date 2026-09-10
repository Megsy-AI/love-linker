/** @doc Small shared helper that routes API calls to the local /api/* dev
 *  handlers (Vite middleware, only wired up locally) in dev, and to the
 *  matching deployed Supabase edge function in production/preview builds.
 *  Keeps the request/response contract identical either way.
 */
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://qdnqxjzjecaieuavagvq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkbnF4anpqZWNhaWV1YXZhZ3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MDY1NTcsImV4cCI6MjEwNDA4MjU1N30.eFK_7U7MRlktAAnQQ_9d4k7tF8N3qZ3QGhKVhH6C3Tg";

/** Maps a local `/api/<name>` path to its deployed edge function name. */
const EDGE_FUNCTION_NAMES: Record<string, string> = {
  mcp: "mcp-gateway",
  "web-search": "web-search",
  "read-url": "read-url",
};

/**
 * Endpoints that ALWAYS go to the deployed edge function, dev included: their
 * model/search provider keys live only in Supabase function secrets, so the
 * local `/api/*` handler would fail with a "not configured" error.
 */
const ALWAYS_EDGE = new Set(["deep-research"]);

/**
 * POSTs JSON to `/api/<name>` in dev, or to the deployed edge function of the
 * same feature in production/preview. Always attaches the caller's access
 * token (edge functions require it; the dev route ignores the extra header
 * when it isn't needed) plus the anon key on the edge-function path.
 */
export async function callServerEndpoint(name: keyof typeof EDGE_FUNCTION_NAMES | string, body: unknown): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (import.meta.env.DEV && !ALWAYS_EDGE.has(String(name))) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`/api/${name}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  const fnName = EDGE_FUNCTION_NAMES[name] ?? name;
  return fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
}
