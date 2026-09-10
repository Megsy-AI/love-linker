import { supabase } from "@/integrations/supabase/client";

/**
 * The user's real plan can live in `subscriptions` (an active paid subscription)
 * while `profiles.plan` still says "free" — that mismatch made paid users see a
 * Free badge. This helper resolves the effective plan: an active, unexpired
 * subscription always wins over the profile column.
 */
export interface EffectivePlan {
  plan: string;
  isPaid: boolean;
}

const TTL_MS = 30_000;
let cachedUserId: string | null = null;
let cached: EffectivePlan | null = null;
let cachedAt = 0;
let inflight: Promise<EffectivePlan | null> | null = null;

export function invalidateEffectivePlan() {
  cachedUserId = null;
  cached = null;
  cachedAt = 0;
  inflight = null;
}

supabase.auth.onAuthStateChange(() => invalidateEffectivePlan());

export async function getActiveSubscriptionPlan(userId: string): Promise<EffectivePlan | null> {
  if (cachedUserId === userId && Date.now() - cachedAt < TTL_MS) return cached;
  if (inflight && cachedUserId === userId) return inflight;

  cachedUserId = userId;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let result: EffectivePlan | null = null;
    if (!error && data) {
      const status = String((data as any).status || "").toLowerCase();
      const end = (data as any).current_period_end
        ? new Date((data as any).current_period_end as string).getTime()
        : null;
      const active =
        (status === "active" || status === "trialing") && (end === null || end > Date.now());
      const plan = String((data as any).plan || "").toLowerCase();
      if (active && plan && plan !== "free") result = { plan, isPaid: true };
    }
    cached = result;
    cachedAt = Date.now();
    inflight = null;
    return result;
  })();
  return inflight;
}
