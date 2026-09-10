/**
 * Lets an edge function run on a *different* Supabase account than the one that
 * owns the data.
 *
 * Deploying the heavy functions (chat, computer, long runs) to a second, empty
 * Supabase project keeps their CPU/invocation load off the project that holds
 * the tables, auth users and storage. When that happens the function's own
 * `SUPABASE_*` env points at the compute project, which has no schema, so every
 * query would fail.
 *
 * Set these secrets on the compute project to point the function back at the
 * data project (they are optional — with nothing set, behaviour is unchanged):
 *   DATA_SUPABASE_URL
 *   DATA_SUPABASE_ANON_KEY
 *   DATA_SUPABASE_SERVICE_ROLE_KEY
 */

const trim = (v: string | undefined) => (v ?? "").trim().replace(/\/$/, "");

/** Base URL of the project that owns the tables and the auth users. */
export function dataUrl(): string {
  return trim(Deno.env.get("DATA_SUPABASE_URL")) || trim(Deno.env.get("SUPABASE_URL"));
}

/** Anon key of the data project — used to verify caller JWTs. */
export function dataAnonKey(): string {
  return (
    (Deno.env.get("DATA_SUPABASE_ANON_KEY") ?? "").trim() ||
    (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim()
  );
}

/** Service role key of the data project — used for privileged reads/writes. */
export function dataServiceKey(): string {
  return (
    (Deno.env.get("DATA_SUPABASE_SERVICE_ROLE_KEY") ?? "").trim() ||
    (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim()
  );
}

/** Expected `iss` claim for JWTs minted by the data project. */
export function dataIssuer(): string {
  return `${dataUrl()}/auth/v1`;
}

/** True when this deployment is compute-only (data lives elsewhere). */
export function isComputeOnly(): boolean {
  return !!trim(Deno.env.get("DATA_SUPABASE_URL"));
}
