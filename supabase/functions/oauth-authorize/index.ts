/** @doc oauth-authorize — Megsy acting as an OAuth 2.0 authorization server for
 *  third-party apps registered in oauth_clients. Supports:
 *   - action "info"      → consent-screen metadata for a client_id/redirect_uri
 *   - action "approve"   → issues a short-lived code in oauth_codes (needs a
 *                          signed-in Megsy user)
 *   - action "token"     → exchanges a code for an access token in
 *                          oauth_tokens (called server-to-server by the
 *                          third-party app with its client_secret, no Megsy
 *                          user session involved)
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

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const action = String(payload.action || "info");

  try {
    // ---------------------------------------------------------------- info
    if (action === "info") {
      const clientId = String(payload.client_id || "");
      const redirectUri = String(payload.redirect_uri || "");
      const scope = String(payload.scope || "read");
      if (!clientId || !redirectUri) return json({ error: "client_id and redirect_uri are required" }, 400);

      const { data: client, error } = await admin
        .from("oauth_clients")
        .select("client_id, name, logo_url, redirect_uris")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error || !client) return json({ error: "unknown client" }, 404);

      const validRedirect = Array.isArray(client.redirect_uris) && client.redirect_uris.includes(redirectUri);
      return json({
        name: client.name,
        logo_url: client.logo_url,
        scope,
        valid_redirect: validRedirect,
      });
    }

    // ------------------------------------------------------------- approve
    if (action === "approve") {
      const clientId = String(payload.client_id || "");
      const redirectUri = String(payload.redirect_uri || "");
      const scope = String(payload.scope || "read");
      const userId = String(payload.user_id || "");

      const authHeader = req.headers.get("Authorization") || "";
      const jwt = authHeader.replace("Bearer ", "");
      const { data: userData } = await admin.auth.getUser(jwt);
      const user = userData?.user;
      if (!user || user.id !== userId) return json({ error: "unauthorized" }, 401);

      const { data: client, error: clientErr } = await admin
        .from("oauth_clients")
        .select("client_id, redirect_uris")
        .eq("client_id", clientId)
        .maybeSingle();
      if (clientErr || !client) return json({ error: "unknown client" }, 404);
      if (!Array.isArray(client.redirect_uris) || !client.redirect_uris.includes(redirectUri)) {
        return json({ error: "redirect_uri not allowed" }, 400);
      }

      const code = crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error: insertErr } = await admin.from("oauth_codes").insert({
        code,
        client_id: clientId,
        user_id: user.id,
        redirect_uri: redirectUri,
        scope,
        expires_at: expiresAt,
        used: false,
      });
      if (insertErr) return json({ error: insertErr.message }, 500);

      return json({ code });
    }

    // --------------------------------------------------------------- token
    if (action === "token") {
      const clientId = String(payload.client_id || "");
      const clientSecret = String(payload.client_secret || "");
      const code = String(payload.code || "");
      const redirectUri = String(payload.redirect_uri || "");
      if (!clientId || !clientSecret || !code) {
        return json({ error: "client_id, client_secret and code are required" }, 400);
      }

      const { data: client, error: clientErr } = await admin
        .from("oauth_clients")
        .select("client_id, client_secret_hash")
        .eq("client_id", clientId)
        .maybeSingle();
      if (clientErr || !client) return json({ error: "invalid_client" }, 401);
      const secretHash = await sha256Hex(clientSecret);
      if (secretHash !== client.client_secret_hash) return json({ error: "invalid_client" }, 401);

      const { data: codeRow, error: codeErr } = await admin
        .from("oauth_codes")
        .select("*")
        .eq("code", code)
        .eq("client_id", clientId)
        .maybeSingle();
      if (codeErr || !codeRow) return json({ error: "invalid_grant" }, 400);
      if (codeRow.used) return json({ error: "invalid_grant", detail: "code already used" }, 400);
      if (new Date(codeRow.expires_at).getTime() < Date.now()) return json({ error: "invalid_grant", detail: "code expired" }, 400);
      if (redirectUri && codeRow.redirect_uri !== redirectUri) return json({ error: "invalid_grant", detail: "redirect_uri mismatch" }, 400);

      await admin.from("oauth_codes").update({ used: true }).eq("code", code);

      const accessToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { error: tokenErr } = await admin.from("oauth_tokens").insert({
        access_token: accessToken,
        client_id: clientId,
        user_id: codeRow.user_id,
        scope: codeRow.scope,
        expires_at: expiresAt,
      });
      if (tokenErr) return json({ error: tokenErr.message }, 500);

      return json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
        scope: codeRow.scope,
      });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "oauth-authorize failed" }, 500);
  }
});
