/**
 * Semantic user memory for the MEGSY chat turn.
 *
 * recall()   — scores the user's stored facts against the current question and
 *              returns a compact block for the system prompt (no model call, so
 *              it costs nothing in time-to-first-token).
 * remember() — after the turn, a small model extracts durable facts and they are
 *              written back to `agent_memory`. Runs detached from the response.
 */

import type { CallFn } from "./orchestrator.ts";

const DOMAIN = "chat";
const MAX_RECALL = 12;
const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "you", "your", "من", "في", "على",
  "عن", "الي", "إلى", "هو", "هي", "ما", "مع", "ان", "أن", "كان", "ده", "دي",
]);

type MemoryRow = {
  kind: string;
  key: string;
  value: string;
  confidence: number;
  updated_at?: string | null;
};

function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) ?? []).filter((t) => !STOPWORDS.has(t));
}

function score(row: MemoryRow, wanted: Set<string>, question: string): number {
  const bag = new Set(tokens(`${row.key} ${row.value}`));
  let overlap = 0;
  for (const token of bag) if (wanted.has(token)) overlap += 1;
  // Rare-term weighting: matching a long distinctive token means more than a
  // short common one, so retrieval stays sharp as the memory store grows.
  let weighted = 0;
  for (const token of bag) if (wanted.has(token)) weighted += Math.min(1.5, token.length / 6);
  // Preferences and identity facts stay useful even without lexical overlap.
  const durable = /preference|identity|profile|style|constraint/i.test(row.kind) ? 1.2 : 0;
  // Direct key mention in the question is the strongest possible signal.
  const keyHit = row.key && question.toLowerCase().includes(row.key.toLowerCase().replace(/[_-]/g, " "))
    ? 1.5
    : 0;
  // Recency decay: a fact touched this week outranks a year-old duplicate.
  const ageDays = row.updated_at
    ? Math.max(0, (Date.now() - new Date(row.updated_at).getTime()) / 86_400_000)
    : 90;
  const recency = Math.exp(-ageDays / 120) * 0.8;
  return overlap + weighted + durable + keyHit + recency + (row.confidence || 0) * 0.5;
}


/**
 * Global memory identity.
 *
 * Memory is not a signed-in-only feature: a guest keeps their own memory too,
 * keyed by a deterministic UUID derived from their anonymous fingerprint, so
 * the assistant remembers them across turns and conversations on that device.
 */
export async function memoryIdentity(
  userId: string | null,
  fingerprint: string | null,
): Promise<string | null> {
  if (userId) return userId;
  const fp = (fingerprint ?? "").trim();
  if (fp.length < 8) return null;
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`megsy-guest-memory:${fp}`)),
  );
  const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Compact memory block for the system prompt, or "" when nothing is relevant. */
export async function recall(admin: any, userId: string | null, question: string): Promise<string> {
  if (!userId) return "";
  const [{ data }, { data: extra }] = await Promise.all([
    admin
      .from("agent_memory")
      .select("kind,key,value,confidence,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(300),
    // Second store written by `memory-extract`; both are read so nothing the
    // system ever learned about the user is invisible to the agent.
    admin
      .from("user_memory_entries")
      .select("kind,key,value,confidence,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(150)
      .then((r: any) => r, () => ({ data: [] })),
  ]);
  const seen = new Set<string>();
  const rows = ([...(data ?? []), ...(extra ?? [])] as MemoryRow[]).filter((row) => {
    const id = `${row.kind}:${row.key}`.toLowerCase();
    if (seen.has(id)) return false;
    seen.add(id);
    return Boolean(row.key && row.value);
  });
  if (!rows.length) return "";

  const wanted = new Set(tokens(question));
  const picked = rows
    .map((row) => ({ row, weight: score(row, wanted, question) }))
    .filter((entry) => entry.weight > 0.9)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_RECALL)
    .map(({ row }) => `- (${row.kind}) ${row.key}: ${String(row.value).slice(0, 300)}`);

  if (!picked.length) return "";

  return `USER MEMORY (facts remembered from earlier conversations — apply silently, never list them back, and prefer the current message when it contradicts them):\n${
    picked.join("\n")
  }`;
}

const EXTRACT_PROMPT =
  `Extract ONLY durable facts about the user worth remembering across future conversations.
Return JSON: {"facts":[{"kind":"preference|identity|project|constraint","key":"<short slug>","value":"<one sentence>"}]}
Rules: at most 4 facts, no facts about this single task, no transient details, no guesses, nothing the user did not state. Return {"facts":[]} when nothing qualifies.`;

/** Extracts and persists durable facts. Best-effort: never throws. */
export async function remember(
  admin: any,
  call: CallFn,
  userId: string | null,
  question: string,
  answer: string,
): Promise<void> {
  if (!userId || question.trim().length < 12) return;
  try {
    const raw = await call(["qwen3.8-flash", "qwen-flash", "qwen-plus"], {
      temperature: 0,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_PROMPT },
        {
          role: "user",
          content: `User said: ${question.slice(0, 3000)}\n\nAssistant replied: ${answer.slice(0, 2000)}`,
        },
      ],
    });
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim());
    const facts = Array.isArray(parsed?.facts) ? parsed.facts.slice(0, 4) : [];
    for (const fact of facts) {
      const kind = String(fact?.kind ?? "").trim().toLowerCase();
      const key = String(fact?.key ?? "").trim().slice(0, 120);
      const value = String(fact?.value ?? "").trim().slice(0, 600);
      if (!key || !value || !["preference", "identity", "project", "constraint"].includes(kind)) continue;
      const { data: existing } = await admin
        .from("agent_memory")
        .select("id")
        .eq("user_id", userId)
        .eq("domain", DOMAIN)
        .eq("kind", kind)
        .eq("key", key)
        .maybeSingle();
      if (existing?.id) {
        await admin.from("agent_memory")
          .update({ value, updated_at: new Date().toISOString(), last_used_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await admin.from("agent_memory").insert({
          user_id: userId,
          domain: DOMAIN,
          kind,
          key,
          value,
          confidence: 0.7,
        });
      }
    }
  } catch (error) {
    console.error("chat-alibaba memory write skipped", error);
  }
}
