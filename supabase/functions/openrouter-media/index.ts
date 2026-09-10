/** @doc openrouter-media — multi-purpose gateway kept for backwards compatibility.
 *  kind: "auth"     → email/OTP auth helpers (check-email, send-otp, verify-otp,
 *                     signup, update-password)
 *  kind: "checkout" → Dodo Payments (global/USD) checkout, delegating to the
 *                     same catalogue used by the dodo-checkout function.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isEmail = (v: unknown) =>
  typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

async function findUserByEmail(email: string) {
  // listUsers is paginated; the filter query is supported by GoTrue admin API.
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const target = email.toLowerCase();
  return data?.users?.find((u) => (u.email ?? "").toLowerCase() === target) ?? null;
}

async function sendCode(email: string, code: string) {
  const res = await admin.functions.invoke("send-email", {
    body: {
      to: email,
      template: "code",
      subject: "Your Megsy verification code",
      variables: { code },
    },
  });
  return !res.error;
}

// ──────────────────────────────────────────────────────────── auth
async function handleAuth(payload: Record<string, unknown>) {
  const action = String(payload.action ?? "");
  const email = String(payload.email ?? "").trim().toLowerCase();

  if (action !== "check-email" && !isEmail(email)) {
    return json({ error: "A valid email is required" }, 400);
  }

  switch (action) {
    case "check-email": {
      if (!isEmail(email)) return json({ error: "A valid email is required" }, 400);
      const user = await findUserByEmail(email);
      let twoFactor = false;
      if (user) {
        const { data: profile } = await admin
          .from("profiles")
          .select("two_factor_enabled")
          .eq("id", user.id)
          .maybeSingle();
        twoFactor = !!profile?.two_factor_enabled;
      }
      return json({ exists: !!user, two_factor_enabled: twoFactor });
    }

    case "send-otp": {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await admin.from("otp_codes").update({ used: true }).eq("email", email).eq("used", false);
      const { error } = await admin.from("otp_codes").insert({
        email,
        code,
        used: false,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
      if (error) return json({ success: false, error: error.message }, 500);
      const sent = await sendCode(email, code);
      if (!sent) return json({ success: false, error: "Could not send the code email" }, 502);
      return json({ success: true });
    }

    case "verify-otp": {
      const code = String(payload.code ?? "").trim();
      if (!/^\d{4,8}$/.test(code)) return json({ success: false, error: "Invalid code" }, 400);
      const { data: row } = await admin
        .from("otp_codes")
        .select("id,expires_at,used")
        .eq("email", email)
        .eq("code", code)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!row) return json({ success: false, error: "Invalid code" }, 200);
      if (new Date(row.expires_at).getTime() < Date.now()) {
        return json({ success: false, error: "This code has expired" }, 200);
      }
      await admin.from("otp_codes").update({ used: true }).eq("id", row.id);
      return json({ success: true });
    }

    case "signup": {
      const password = String(payload.password ?? "");
      if (password.length < 8) {
        return json({ success: false, error: "Password must be at least 8 characters" }, 400);
      }
      const existing = await findUserByEmail(email);
      if (existing) return json({ success: false, error: "already_exists", exists: true }, 200);
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, user_id: data.user?.id ?? null });
    }

    case "update-password": {
      const password = String(payload.password ?? "");
      if (password.length < 8) {
        return json({ success: false, error: "Password must be at least 8 characters" }, 400);
      }
      const user = await findUserByEmail(email);
      if (!user) return json({ success: false, error: "Account not found" }, 404);
      // Only allowed straight after a verified OTP for this email.
      const { data: verified } = await admin
        .from("otp_codes")
        .select("id")
        .eq("email", email)
        .eq("used", true)
        .gte("expires_at", new Date(Date.now() - 15 * 60_000).toISOString())
        .limit(1)
        .maybeSingle();
      if (!verified) return json({ success: false, error: "Verify your email first" }, 403);
      const { error } = await admin.auth.admin.updateUserById(user.id, { password });
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true });
    }

    default:
      return json({ error: `unknown auth action: ${action}` }, 400);
  }
}

// ──────────────────────────────────────────────────────────── checkout
async function handleCheckout(req: Request, payload: Record<string, unknown>) {
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  const res = await admin.functions.invoke("dodo-checkout", {
    body: {
      interval: payload.interval ?? "monthly",
      tier: payload.tier ?? "pro",
      offer: payload.offer ?? null,
      product_id: payload.product_id ?? null,
      country: payload.country ?? undefined,
    },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.error) return json({ error: res.error.message }, 502);
  const data = res.data as Record<string, unknown> | null;
  const url = (data?.checkout_url as string) ?? (data?.url as string) ?? null;
  if (!url) return json({ error: (data?.error as string) ?? "Checkout failed" }, 502);
  return json({ url, checkout_url: url, order_id: data?.order_id ?? null });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const kind = String(payload.kind ?? "");
  try {
    if (kind === "auth") return await handleAuth(payload);
    if (kind === "checkout") return await handleCheckout(req, payload);
    return json({ error: `unknown kind: ${kind || "(none)"}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "request failed" }, 500);
  }
});
