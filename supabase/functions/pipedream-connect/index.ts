/** @doc pipedream-connect — Pipedream Connect gateway: connect-token creation,
 *  listing connected accounts, listing/invoking app actions, disconnect.
 *  Backed by the Pipedream Connect REST API (https://pipedream.com/docs/connect).
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

const PD_CLIENT_ID = Deno.env.get("PIPEDREAM_CLIENT_ID");
const PD_CLIENT_SECRET = Deno.env.get("PIPEDREAM_CLIENT_SECRET");
const PD_PROJECT_ID = Deno.env.get("PIPEDREAM_PROJECT_ID");
const PD_ENVIRONMENT = Deno.env.get("PIPEDREAM_ENVIRONMENT") || "production";

const PD_API_BASE = "https://api.pipedream.com/v1";

function pdConfigured() {
  return !!(PD_CLIENT_ID && PD_CLIENT_SECRET && PD_PROJECT_ID);
}

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getPdAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at - 30_000 > Date.now()) {
    return cachedToken.access_token;
  }
  const res = await fetch(`${PD_API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: PD_CLIENT_ID,
      client_secret: PD_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pipedream auth failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (Number(data.expires_in ?? 3600) * 1000),
  };
  return cachedToken.access_token;
}

async function pdFetch(path: string, init: RequestInit = {}) {
  const token = await getPdAccessToken();
  const res = await fetch(`${PD_API_BASE}/connect/${PD_PROJECT_ID}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      "X-PD-Environment": PD_ENVIRONMENT,
      "Content-Type": "application/json",
    },
  });
  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const action = String(payload.action || "");

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  if (!pdConfigured()) {
    return json({
      configured: false,
      error: "Pipedream is not configured on the backend yet (missing PIPEDREAM_CLIENT_ID / PIPEDREAM_CLIENT_SECRET / PIPEDREAM_PROJECT_ID)",
    }, 200);
  }

  const externalUserId = user.id;

  try {
    // ------------------------------------------------------------ create_token
    if (action === "create_token") {
      const redirectOrigin = String(payload.redirect_origin || "");
      const res = await pdFetch("/tokens", {
        method: "POST",
        body: JSON.stringify({
          external_user_id: externalUserId,
          allowed_origins: redirectOrigin ? [redirectOrigin] : undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return json({ error: `Pipedream token error: ${res.status} ${text}` }, 502);
      }
      const data = await res.json();
      return json({
        token: data.token,
        expires_at: data.expires_at,
        connect_link_url: data.connect_link_url,
      });
    }

    // ------------------------------------------------------------ list_accounts
    if (action === "list_accounts") {
      const res = await pdFetch(`/accounts?external_user_id=${encodeURIComponent(externalUserId)}&include_credentials=false`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return json({ error: `Pipedream list_accounts error: ${res.status} ${text}`, accounts: [] }, 200);
      }
      const data = await res.json();
      const accounts = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      // Sync to pipedream_accounts so other parts of the app can query locally.
      for (const acc of accounts) {
        const appSlug = acc?.app?.name_slug ?? acc?.app?.slug ?? acc?.app_slug;
        const accountId = acc?.id ?? acc?.account_id;
        if (!appSlug || !accountId) continue;
        await admin.from("pipedream_accounts").upsert({
          user_id: user.id,
          external_user_id: externalUserId,
          app_slug: String(appSlug),
          account_id: String(accountId),
          account_name: acc?.name ?? acc?.external_id ?? null,
          healthy: acc?.healthy ?? true,
          metadata: acc,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,app_slug" });
      }

      return json({ accounts });
    }

    // ------------------------------------------------------------ list_actions
    if (action === "list_actions") {
      const appSlug = String(payload.app_slug || "");
      if (!appSlug) return json({ error: "app_slug is required" }, 400);
      const res = await pdFetch(`/actions?app=${encodeURIComponent(appSlug)}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return json({ error: `Pipedream list_actions error: ${res.status} ${text}` }, 502);
      }
      const data = await res.json();
      return json({ actions: Array.isArray(data?.data) ? data.data : data });
    }

    // ------------------------------------------------------------ invoke_action
    if (action === "invoke_action") {
      const componentId = String(payload.component_id || payload.id || "");
      if (!componentId) return json({ error: "component_id is required" }, 400);
      const res = await pdFetch("/actions/run", {
        method: "POST",
        body: JSON.stringify({
          id: componentId,
          external_user_id: externalUserId,
          configured_props: payload.configured_props ?? {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return json({ error: `Pipedream invoke_action error: ${res.status} ${JSON.stringify(data)}` }, 502);
      }
      return json({ result: data });
    }

    // ------------------------------------------------------------ disconnect
    if (action === "disconnect") {
      const appSlug = String(payload.app_slug || "");
      if (!appSlug) return json({ error: "app_slug is required" }, 400);
      const { data: row } = await admin
        .from("pipedream_accounts")
        .select("account_id")
        .eq("user_id", user.id)
        .eq("app_slug", appSlug)
        .maybeSingle();
      if (row?.account_id) {
        const res = await pdFetch(`/accounts/${encodeURIComponent(row.account_id)}`, { method: "DELETE" });
        if (!res.ok && res.status !== 404) {
          const text = await res.text().catch(() => "");
          return json({ error: `Pipedream disconnect error: ${res.status} ${text}` }, 502);
        }
      }
      await admin.from("pipedream_accounts").delete().eq("user_id", user.id).eq("app_slug", appSlug);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Pipedream request failed" }, 500);
  }
});
