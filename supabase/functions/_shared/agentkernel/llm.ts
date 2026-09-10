/**
 * Server-only LLM bridge for the agent kernel.
 *
 * The kernel runs from cron ticks where there is no user JWT, so it cannot go
 * through the user-facing chat function. It talks to abliteration.ai directly
 * (the project's only text-model provider) using the rotatable key pool.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { callModel, MODELS } from "../abliteration.ts";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * One non-streaming completion. Returns "" on any failure so the caller can
 * degrade gracefully instead of killing a long run.
 */
export async function askModel(
  supabase: SupabaseClient,
  system: string,
  user: string,
): Promise<string> {
  const result = await callModel(supabase as unknown as { from: (t: string) => any }, [MODELS.standard], {
    stream: false,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ] satisfies LlmMessage[],
  });
  if (!result) {
    console.error("agentkernel llm has no usable key");
    return "";
  }
  const data = (await result.response.json().catch(() => null)) as
    | { choices?: { message?: { content?: string } }[] }
    | null;
  return data?.choices?.[0]?.message?.content ?? "";
}

/** Same call, parsing the first JSON object/array in the reply. */
export async function askJson<T>(
  supabase: SupabaseClient,
  system: string,
  user: string,
): Promise<T | null> {
  return extractJson<T>(await askModel(supabase, system, user));
}

export function extractJson<T>(text: string): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  const opener = candidate[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < candidate.length; i += 1) {
    const ch = candidate[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === opener) depth += 1;
    else if (ch === closer) {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
