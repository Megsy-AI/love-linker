/**
 * @doc Shared auth + rate-limit boundary for edge functions ported from
 * `api/*.ts` (mirrors `src/lib/api/apiGuard.ts` + `authenticateRequest.ts`).
 *
 * `verify_jwt` is OFF for these functions in `supabase/config.toml` (so guests
 * and CORS preflights are not rejected before we can respond), which means
 * this module is the ONLY thing standing between an anonymous caller and the
 * underlying provider. Every handler MUST call `guardRequest` and return early
 * when `ok` is false, before doing any model/provider work.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dataAnonKey, dataUrl } from "./dataProject.ts";

export interface GuardResult {
  ok: boolean;
  status: number;
  error?: string;
  userId?: string;
  retryAfter?: number;
}

/** Requests per window, per user/IP, per endpoint. */
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "deep-research": { limit: 6, windowMs: 60 * 60 * 1000 },
  transcribe: { limit: 60, windowMs: 5 * 60 * 1000 },
  default: { limit: 180, windowMs: 5 * 60 * 1000 },
};

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function localRateLimit(endpoint: string, key: string): { ok: boolean; retryAfter: number } {
  const rule = RATE_LIMITS[endpoint] ?? RATE_LIMITS.default;
  const now = Date.now();
  const id = `${endpoint}:${key}`;
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + rule.windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > rule.limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown"
  );
}

/**
 * Authenticates the caller (a real Supabase user JWT — the anon key alone is
 * NOT accepted) and applies the endpoint's rate limit. Callers MUST return
 * early when `ok` is false — before any provider call.
 */
export async function guardRequest(request: Request, endpoint: string): Promise<GuardResult> {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "Unauthorized" };

  const client = createClient(dataUrl(), dataAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Unauthorized" };

  const rule = RATE_LIMITS[endpoint] ?? RATE_LIMITS.default;
  const { data: limitData, error: limitError } = await client.rpc("check_api_rate_limit", {
    _endpoint: endpoint,
    _request_limit: rule.limit,
    _window_seconds: Math.ceil(rule.windowMs / 1000),
  });

  let limited: { ok: boolean; retryAfter: number };
  if (limitError || !Array.isArray(limitData) || !limitData[0]) {
    // Persistent limiter unavailable — fall back to an in-memory per-instance
    // limiter rather than failing the request outright.
    limited = localRateLimit(endpoint, data.user.id);
  } else {
    limited = {
      ok: limitData[0].allowed === true,
      retryAfter: Number(limitData[0].retry_after ?? 0),
    };
  }
  if (!limited.ok) {
    return {
      ok: false,
      status: 429,
      error: "Too many requests. Please slow down and try again shortly.",
      retryAfter: limited.retryAfter,
    };
  }
  return { ok: true, status: 200, userId: data.user.id };
}

/** JSON error response for a failed guard, including `Retry-After` on 429. */
export function guardResponse(result: GuardResult, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: result.error ?? "Unauthorized" }), {
    status: result.status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {}),
      ...headers,
    },
  });
}
