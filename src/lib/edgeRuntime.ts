/**
 * Edge function routing.
 *
 * The heavy endpoints (chat, computer, long runs) can be hosted on a SECOND
 * Supabase account so their CPU/invocation load never touches the project that
 * holds the tables, auth users and storage. Point the app at that compute
 * project with two env vars — leave them unset and everything keeps calling the
 * primary project exactly as before:
 *
 *   VITE_COMPUTE_SUPABASE_URL=https://<compute-ref>.supabase.co
 *   VITE_COMPUTE_SUPABASE_ANON_KEY=<compute anon key>
 *
 * On the compute project the deployed functions need `DATA_SUPABASE_URL`,
 * `DATA_SUPABASE_ANON_KEY` and `DATA_SUPABASE_SERVICE_ROLE_KEY` secrets so they
 * read/write the primary database and verify primary-project JWTs
 * (`supabase/functions/_shared/dataProject.ts`).
 */

const PRIMARY_URL = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const PRIMARY_ANON = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "");

const COMPUTE_URL = String(import.meta.env.VITE_COMPUTE_SUPABASE_URL || "").replace(/\/$/, "");
const COMPUTE_ANON = String(import.meta.env.VITE_COMPUTE_SUPABASE_ANON_KEY || "");

/** Functions that move to the compute account when it is configured. */
const COMPUTE_FUNCTIONS = new Set([
  "chat-alibaba",
  "chat-fast",
  "computer-agent",
  "long-run",
  "deep-research",
  "agent-tick",
]);

/** True when a second Supabase account is configured for compute. */
export const hasComputeProject = Boolean(COMPUTE_URL && COMPUTE_ANON);

function routesToCompute(fn: string): boolean {
  if (!hasComputeProject) return false;
  return COMPUTE_FUNCTIONS.has(fn.split("/")[0]);
}

/** Full URL for an edge function, honouring the compute account. */
export function edgeUrl(fn: string): string {
  const base = routesToCompute(fn) ? COMPUTE_URL : PRIMARY_URL;
  return `${base}/functions/v1/${fn}`;
}

/** Anon key that matches the project the function is deployed to. */
export function edgeAnonKey(fn: string): string {
  return routesToCompute(fn) ? COMPUTE_ANON : PRIMARY_ANON;
}

/**
 * Headers for a direct fetch to an edge function. `token` is the caller's
 * primary-project access token when signed in; guests fall back to the anon key
 * of the hosting project.
 */
export function edgeHeaders(fn: string, token?: string | null): Record<string, string> {
  const apikey = edgeAnonKey(fn);
  return {
    "Content-Type": "application/json",
    apikey,
    Authorization: `Bearer ${token || apikey}`,
  };
}
