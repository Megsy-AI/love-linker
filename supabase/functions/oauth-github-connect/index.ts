/** @doc oauth-github-connect — starts/completes the GitHub OAuth flow used to
 *  link a GitHub account for repo pushes. State is tracked in
 *  github_oauth_states; the resulting access token is stored in
 *  agent_credentials (site = "github").
 */
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

const GITHUB_CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID");
const GITHUB_CLIENT_SECRET = Deno.env.get("GITHUB_CLIENT_SECRET");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return json({ configured: false, error: "GitHub OAuth is not configured on the backend yet (missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET)" });
  }

  const code = payload.code ? String(payload.code) : null;
  const stateFromClient = payload.state ? String(payload.state) : null;
  const redirectOrigin = String(payload.redirect_origin || "");

  try {
    // -------------------------------------------------------------- callback
    if (code) {
      if (!stateFromClient) return json({ error: "missing state" }, 400);
      const { data: stateRow, error: stateErr } = await admin
        .from("github_oauth_states")
        .select("*")
        .eq("state", stateFromClient)
        .eq("user_id", user.id)
        .maybeSingle();
      if (stateErr || !stateRow) return json({ error: "invalid or expired state" }, 400);
      await admin.from("github_oauth_states").delete().eq("state", stateFromClient);

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${redirectOrigin}/auth/callback/github`,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
        return json({ error: tokenData.error_description || tokenData.error || "GitHub token exchange failed" }, 502);
      }
      const accessToken = tokenData.access_token as string;

      const ghUserRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "megsy-app" },
      });
      const ghUser = await ghUserRes.json();
      if (!ghUserRes.ok) return json({ error: "Failed to fetch GitHub user" }, 502);

      const { error: upsertErr } = await admin.from("agent_credentials").upsert({
        user_id: user.id,
        site: "github",
        username: ghUser.login,
        password: accessToken,
        site_url: ghUser.html_url,
        notes: JSON.stringify({ id: ghUser.id, avatar_url: ghUser.avatar_url }),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,site" });
      if (upsertErr) return json({ error: upsertErr.message }, 500);

      return json({ ok: true, connected: true, account_name: ghUser.login });
    }

    // ---------------------------------------------------------------- start
    const { data: existing } = await admin
      .from("agent_credentials")
      .select("username")
      .eq("user_id", user.id)
      .eq("site", "github")
      .maybeSingle();
    if (existing) {
      return json({ connected: true, account_name: existing.username });
    }

    const state = crypto.randomUUID();
    const redirectTo = payload.redirect_to ? String(payload.redirect_to) : null;
    const { error: insertErr } = await admin.from("github_oauth_states").insert({
      state,
      user_id: user.id,
      redirect_to: redirectTo,
    });
    if (insertErr) return json({ error: insertErr.message }, 500);

    const redirectUri = `${redirectOrigin}/auth/callback/github`;
    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", "repo read:user");
    authorizeUrl.searchParams.set("state", state);

    return json({ authorize_url: authorizeUrl.toString(), connected: false });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "GitHub OAuth failed" }, 500);
  }
});
