/** @doc memory-extract — pulls durable user facts out of a chat turn and stores them. */
/**
 * POST JSON:
 *   { user_message, assistant_reply, conversation_id?, message_id? }
 *
 * Uses the Abliteration LLM to spot durable, worth-remembering facts about the
 * user (name, preferences, ongoing projects, etc.) and upserts them into
 * public.user_memory_entries (per-user long-term memory, matched by
 * match_user_memories elsewhere).
 *
 * Response: { saved: number, titles: string[] }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callModel } from "../_shared/abliteration.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

interface ExtractedMemory {
  title: string;
  summary: string;
  scope?: string;
}

const SYSTEM_PROMPT = `You extract durable, worth-remembering facts about a user from one chat turn.
Only return facts that will still be true/useful weeks from now: stable preferences, identity
details (name, job, location, family), ongoing projects, recurring goals, tools/stacks they use,
or explicit requests to "remember" something. Ignore small talk, one-off questions, and anything
transient (today's weather, this single task's status).

Return STRICT JSON only, no prose, in this exact shape:
{"memories": [{"title": "short label", "summary": "one factual sentence", "scope": "preference|identity|project|goal|other"}]}

If nothing is worth remembering, return {"memories": []}. Never invent facts not present in the turn.`;

function parseMemories(raw: string): ExtractedMemory[] {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    const list = Array.isArray(parsed?.memories) ? parsed.memories : [];
    return list
      .map((m: any) => ({
        title: String(m?.title ?? "").trim().slice(0, 200),
        summary: String(m?.summary ?? "").trim().slice(0, 1000),
        scope: typeof m?.scope === "string" ? m.scope.trim().slice(0, 40) : "other",
      }))
      .filter((m: ExtractedMemory) => m.title && m.summary);
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData } = token ? await admin.auth.getUser(token) : { data: { user: null } } as any;
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  const userMessage = String(body?.user_message ?? "").slice(0, 8000);
  const assistantReply = String(body?.assistant_reply ?? "").slice(0, 8000);
  const conversationId = body?.conversation_id ? String(body.conversation_id) : null;
  const messageId = body?.message_id ? String(body.message_id) : null;

  if (!userMessage.trim() && !assistantReply.trim()) {
    return json({ saved: 0, titles: [] });
  }

  try {
    const result = await callModel(admin, [], {
      agentRole: "memory",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `User said:\n${userMessage}\n\nAssistant replied:\n${assistantReply}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
      enable_thinking: false,
    });
    if (!result) return json({ saved: 0, titles: [] });

    const payload = await result.response.json().catch(() => null);
    const content = payload?.choices?.[0]?.message?.content ?? "";
    const memories = parseMemories(String(content));
    if (!memories.length) return json({ saved: 0, titles: [] });

    const rows = memories.map((m) => ({
      user_id: user.id,
      title: m.title,
      summary: m.summary,
      scope: m.scope ?? "other",
      slot_type: "fact",
      slot_key: m.title.toLowerCase().replace(/\s+/g, "_").slice(0, 100),
      slot_value: { conversation_id: conversationId, message_id: messageId },
    }));

    const { data: inserted, error: insertErr } = await admin
      .from("user_memory_entries")
      .upsert(rows, { onConflict: "user_id,slot_key", ignoreDuplicates: false })
      .select("title");
    if (insertErr) {
      // Fall back to plain insert if there's no unique constraint to upsert on.
      const { data: fallback, error: fallbackErr } = await admin
        .from("user_memory_entries")
        .insert(rows)
        .select("title");
      if (fallbackErr) return json({ saved: 0, titles: [], error: fallbackErr.message });
      return json({ saved: fallback?.length ?? 0, titles: (fallback ?? []).map((r: any) => r.title) });
    }

    return json({ saved: inserted?.length ?? 0, titles: (inserted ?? []).map((r: any) => r.title) });
  } catch (e) {
    return json({ saved: 0, titles: [], error: e instanceof Error ? e.message : "memory extraction failed" });
  }
});
