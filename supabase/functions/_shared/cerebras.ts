/**
 * Cerebras Inference — primary text-model provider (OpenAI-compatible).
 *
 * Endpoint: https://api.cerebras.ai/v1/chat/completions
 * Key: function secret `CEREBRAS_API_KEY`.
 *
 * The public endpoints serve a small catalog, so every agent role is mapped onto
 * one of them (verified live against /v1/models). The largest served model
 * (gpt-oss-120b, 120B params) is the default for all real work:
 *   - gpt-oss-120b   → chat, workers, manager, planner, coding, research, final
 *   - qwen-3.8-27b   → cheap lane only (titles, memory extraction, classifiers)
 *   - gemma-4-31b    → last-resort fallback
 * Requested ids that this provider does not serve (Kimi, GLM, abliterated-*)
 * are mapped onto the closest role model instead of 404-ing.
 */

const BASE = Deno.env.get("CEREBRAS_API_BASE") || "https://api.cerebras.ai/v1";

export const CEREBRAS_MODELS = {
  fast: "qwen-3.8-27b",
  worker: "gpt-oss-120b",
  manager: "gpt-oss-120b",
} as const;

/** Every id the provider serves, in fallback order. */
export const CEREBRAS_LADDER: string[] = [
  "gpt-oss-120b",
  "qwen-3.8-27b",
  "gemma-4-31b",
];


const ENV_NAMES = ["CEREBRAS_API_KEY", "CEREBRAS_KEY", "cerebras"];

export function cerebrasKey(): string {
  for (const name of ENV_NAMES) {
    const value = Deno.env.get(name)?.trim();
    if (value && value.length > 12) return value;
  }
  return "";
}

export function hasCerebras(): boolean {
  return cerebrasKey().length > 0;
}

/** Role → model. `role` wins; otherwise the requested id decides the lane. */
export function cerebrasModelFor(requested?: string | null, role?: string | null): string {
  const r = (role ?? "").trim().toLowerCase();
  if (r) {
    if (/(manager|planner|orchestrat|final|review|deep|research|code|coder)/.test(r)) {
      return CEREBRAS_MODELS.manager;
    }
    if (/(fast|title|memory|classif|extract|cheap|light)/.test(r)) return CEREBRAS_MODELS.fast;
    return CEREBRAS_MODELS.worker;
  }
  const id = (requested ?? "").trim().toLowerCase();
  if (!id) return CEREBRAS_MODELS.worker;
  if (CEREBRAS_LADDER.includes(id)) return id;
  if (/(gemma)/.test(id)) return CEREBRAS_MODELS.fast;
  if (/(oss|120b|large|max|ultra|pro|opus|thinking|reason|glm|kimi)/.test(id)) {
    return CEREBRAS_MODELS.manager;
  }
  if (/(flash|turbo|mini|fast|small|lite)/.test(id)) return CEREBRAS_MODELS.fast;
  return CEREBRAS_MODELS.worker;
}

/** Fields Cerebras rejects or ignores are dropped so callers keep one payload. */
export function cerebrasPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const {
    enable_thinking: _et,
    thinking_budget: _tb,
    enable_search: _es,
    search_options: _so,
    incremental_output: _io,
    result_format: _rf,
    include_reasoning: _ir,
    web_search_options: _ws,
    reasoning_effort,
    agentRole: _role,
    ...rest
  } = payload as Record<string, any>;

  const out: Record<string, unknown> = { ...rest };
  // gpt-oss-120b is the only reasoning-capable id here; the rest reject the field.
  if (reasoning_effort && out.model === CEREBRAS_MODELS.manager) {
    out.reasoning_effort = reasoning_effort === "none" ? "low" : reasoning_effort;
  }
  return out;
}

import {
  noteProviderFailure,
  noteProviderSuccess,
  providerBlocked,
} from "./providerBreaker.ts";
import { noteKeyFail, noteKeyOk, vaultKeys, type VaultKey } from "./keyVault.ts";

export interface CerebrasResult {
  response: Response;
  model: string;
}

/** Vault keys first (rotated, auto-banned), then the function secret. */
async function candidateKeys(): Promise<VaultKey[]> {
  const keys = await vaultKeys("cerebras").catch(() => [] as VaultKey[]);
  const env = cerebrasKey();
  if (env && !keys.some((k) => k.key === env)) keys.push({ id: "", key: env });
  return keys;
}

/**
 * One chat-completions call against Cerebras. Every key in the vault is tried
 * before giving up, so a single exhausted key never reaches the user as an
 * error. Returns null only when the provider is genuinely unusable.
 */
export async function callCerebras(
  models: string[],
  payload: Record<string, unknown>,
  role?: string | null,
): Promise<CerebrasResult | null> {
  const keys = await candidateKeys();
  if (!keys.length) return null;

  const preferred = models.length
    ? models.map((m) => cerebrasModelFor(m, role))
    : [cerebrasModelFor(null, role)];
  const ladder = Array.from(new Set([...preferred, ...CEREBRAS_LADDER]));

  // Two passes: this provider rate-limits in short bursts, so a single 429 must
  // not push every caller onto a slower path.
  for (let pass = 0; pass < 2; pass++) {
    let sawRateLimit = false;
    for (const entry of keys) {
      for (const model of ladder) {
        if (entry.id === "" && providerBlocked("cerebras", model)) continue;
        const body = cerebrasPayload({ ...payload, model });
        try {
          const response = await fetch(`${BASE}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${entry.key}`,
            },
            body: JSON.stringify({ ...body, model }),
          });
          if (response.ok) {
            noteProviderSuccess("cerebras", model);
            void noteKeyOk(entry.id || null);
            return { response, model };
          }
          const detail = (await response.text().catch(() => "")).slice(0, 400);
          console.error(`cerebras ${model} [${response.status}]: ${detail}`);
          noteProviderFailure("cerebras", model, response.status);
          if ([401, 402, 403].includes(response.status)) {
            // This key is dead (bad or out of credit) — retire it and try the next.
            void noteKeyFail(entry.id || null, `${response.status}: ${detail}`);
            break;
          }
          if (response.status === 429) sawRateLimit = true;
        } catch (error) {
          console.error("cerebras request failed", error);
        }
      }
    }
    if (!sawRateLimit) break;
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  return null;
}
