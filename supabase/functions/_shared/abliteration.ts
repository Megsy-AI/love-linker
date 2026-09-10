/**
 * Text-model routing.
 *
 * PRIMARY provider: Cerebras (see `cerebras.ts`) — every agent role gets its own
 * model (qwen-3.8-27b for workers/chat, gpt-oss-120b for manager/planner/final,
 * gemma-4-31b for the cheap lane). Pass `agentRole` in the payload to pick one.
 * FALLBACK provider: abliteration.ai (OpenAI-compatible), keys from the
 * rotatable `abliteration_keys` table and a function secret.
 *
 * Both surfaces are OpenAI-compatible, so every existing caller keeps its
 * payload/SSE contract. Browsing/computer work goes to Browser Use Cloud
 * (see `cloudAgents.ts`).
 */
import { callCerebras } from "./cerebras.ts";

const BASE = Deno.env.get("ABLITERATION_API_BASE") || "https://api.abliteration.ai/v1";


/** Model ladder, strongest first for heavy turns, `fast` for the fast lane. */
export const MODELS = {
  fast: "abliterated-model",
  standard: "abliterated-model-large-v2",
  large: "abliterated-model-large",
} as const;

/** Every model id the provider serves, in fallback order. */
export const MODEL_LADDER: string[] = [MODELS.standard, MODELS.fast, MODELS.large];

export interface ModelKey {
  id?: string;
  key: string;
}

interface Admin {
  from: (table: string) => any;
}

const ENV_NAMES = [
  "ABLITERATION_API_KEY",
  "ABLIT_API_KEY",
  "ABLIT_KEY",
  "ABLITERATION_KEY",
];

function envKeys(): string[] {
  const out: string[] = [];
  for (const name of ENV_NAMES) {
    const value = Deno.env.get(name)?.trim();
    if (value && value.length > 12 && !out.includes(value)) out.push(value);
  }
  return out;
}

/** Active keys: table pool first (rotatable), then the function secret. */
export async function modelKeys(admin: Admin | null): Promise<ModelKey[]> {
  const out: ModelKey[] = [];
  const seen = new Set<string>();
  if (admin) {
    try {
      const { data } = await admin
        .from("abliteration_keys")
        .select("id,api_key,cooldown_until")
        .eq("status", "active")
        .order("priority", { ascending: false })
        .order("last_used_at", { ascending: true, nullsFirst: true })
        .limit(10);
      const now = Date.now();
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const key = String(row.api_key ?? "").trim();
        const cooldown = row.cooldown_until as string | null;
        if (cooldown && new Date(cooldown).getTime() > now) continue;
        if (key.length > 12 && !seen.has(key)) {
          seen.add(key);
          out.push({ id: String(row.id), key });
        }
      }
    } catch (error) {
      console.error("abliteration key pool unavailable", error);
    }
  }
  for (const key of envKeys()) {
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ key });
    }
  }
  return out;
}

export function hasModelProvider(): boolean {
  return envKeys().length > 0;
}

/** Maps any legacy/model-picker id onto a model this provider actually serves. */
export function resolveModel(requested?: string | null): string {
  const id = (requested ?? "").trim().toLowerCase();
  if (!id) return MODELS.standard;
  if (MODEL_LADDER.includes(id)) return id;
  if (/(flash|turbo|mini|fast|small)/.test(id)) return MODELS.fast;
  if (/(max|large|ultra|pro|plus|opus|thinking|reason)/.test(id)) return MODELS.standard;
  return MODELS.standard;
}

/**
 * Rewrites a legacy DashScope-shaped payload into the OpenAI-compatible shape
 * abliteration.ai expects: provider-specific switches (`enable_thinking`,
 * `thinking_budget`, `enable_search`, …) become `reasoning_effort` /
 * `web_search_options`, and unknown fields are dropped instead of 400-ing.
 */
export function normalizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const {
    enable_thinking,
    thinking_budget,
    enable_search,
    search_options,
    incremental_output,
    result_format,
    reasoning_effort,
    ...rest
  } = payload as Record<string, any>;

  const thinking = enable_thinking !== false && enable_thinking !== undefined
    ? true
    : enable_thinking === false
    ? false
    : true;

  const out: Record<string, unknown> = { ...rest };
  out.reasoning_effort = reasoning_effort ?? (thinking ? "medium" : "none");
  // The reasoning trace is what the UI's thinking panel renders.
  out.include_reasoning = thinking;
  if (enable_search === true) out.web_search_options = {};
  if (search_options && enable_search === true) out.web_search_options = {};
  return out;
}

export interface ModelResponse {
  response: Response;
  model: string;
  keyId?: string;
}

/**
 * One chat-completions call. Tries each model on the ladder against each active
 * key; returns null only when nothing worked (caller decides the fallback).
 */
export async function callModel(
  admin: Admin | null,
  models: string[],
  payload: Record<string, unknown>,
): Promise<ModelResponse | null> {
  // Primary provider: Cerebras (per-role model split). Abliteration is fallback.
  const role = typeof (payload as Record<string, unknown>).agentRole === "string"
    ? String((payload as Record<string, unknown>).agentRole)
    : null;
  const cerebras = await callCerebras(models, payload, role);
  if (cerebras) return { response: cerebras.response, model: cerebras.model };

  const keys = await modelKeys(admin);
  if (!keys.length) {
    console.error("abliteration: no key configured");
    return null;
  }
  const ladder = Array.from(
    new Set([...(models.length ? models.map(resolveModel) : []), ...MODEL_LADDER]),
  );
  const { agentRole: _role, ...clean } = payload as Record<string, any>;
  const body = normalizePayload(clean);


  for (const model of ladder) {
    for (const entry of keys) {
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
          if (entry.id && admin) {
            void admin
              .from("abliteration_keys")
              .update({ last_used_at: new Date().toISOString(), last_error: null })
              .eq("id", entry.id);
          }
          return { response, model, keyId: entry.id };
        }
        const detail = (await response.text().catch(() => "")).slice(0, 400);
        console.error(`abliteration ${model} [${response.status}]: ${detail}`);
        if (entry.id && admin && [401, 402, 403, 429].includes(response.status)) {
          void admin
            .from("abliteration_keys")
            .update({
              last_error: `${response.status}: ${detail}`.slice(0, 500),
              ...(response.status === 429
                ? { cooldown_until: new Date(Date.now() + 120_000).toISOString() }
                : { status: "exhausted" }),
            })
            .eq("id", entry.id);
        }
        // A model-shaped rejection: move to the next model, not the next key.
        if (response.status === 404 || /model/i.test(detail)) break;
      } catch (error) {
        console.error("abliteration request failed", error);
      }
    }
  }
  return null;
}
