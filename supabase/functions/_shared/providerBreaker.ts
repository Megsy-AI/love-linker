/**
 * @doc Per-instance circuit breaker for model providers.
 *
 * Billing/auth rejections (401/402/403) are not transient: once a provider or a
 * model answers with one, every later request in the same minutes gets the same
 * answer. Retrying it costs the user real latency — on a dead account the fast
 * lane spent ~6s walking a ladder of 402s before falling back.
 *
 * So a hard rejection opens the breaker for that provider (and for that
 * provider+model) for a short window; callers skip it with no network round
 * trip and go straight to the next option. Rate limits get a much shorter
 * window because they really do clear on their own.
 *
 * State is per isolate on purpose: no DB write on the hot path, and a cold
 * start naturally re-probes the provider.
 */

const openUntil = new Map<string, number>();

// Short on purpose: the account can be topped up at any moment, so the breaker
// only absorbs the immediate burst of repeat rejections and then re-probes.
const HARD_MS = 60 * 1000; // 401/402/403 — needs a human (top-up / new key)
const SOFT_MS = 45 * 1000; // 429 — clears by itself

/** True when this provider (optionally this model) is currently short-circuited. */
export function providerBlocked(provider: string, model?: string): boolean {
  const now = Date.now();
  for (const key of [provider, model ? `${provider}:${model}` : null]) {
    if (!key) continue;
    const until = openUntil.get(key);
    if (until === undefined) continue;
    if (until > now) return true;
    openUntil.delete(key);
  }
  return false;
}

/** Records a failed status; opens the breaker for hard rejections and 429s. */
export function noteProviderFailure(provider: string, model: string, status: number): void {
  if (openUntil.size > 500) openUntil.clear();
  if ([401, 402, 403].includes(status)) {
    // The whole provider is unusable, not just this model: the account is the
    // thing that was rejected.
    openUntil.set(provider, Date.now() + HARD_MS);
    return;
  }
  if (status === 429) openUntil.set(`${provider}:${model}`, Date.now() + SOFT_MS);
}

/** A success clears any open breaker so recovery is immediate after a top-up. */
export function noteProviderSuccess(provider: string, model?: string): void {
  openUntil.delete(provider);
  if (model) openUntil.delete(`${provider}:${model}`);
}
