import { edgeAnonKey, edgeUrl } from "@/lib/edgeRuntime";
/**
 * Fast lane for simple chat turns.
 *
 * Sends the turn to the lightweight `chat-fast` edge function (Alibaba
 * DashScope / Qwen fast model) with almost no pre-flight work. The model
 * decides routing itself: if the turn needs tools, files, browsing, media or a
 * long task, its first token is `ESCALATE`, and we hand the turn over to the
 * full `chat-alibaba` path without showing anything to the user.
 */

type FastMsg = { role: "user" | "assistant"; content: unknown };

const FAST_URL = edgeUrl("chat-fast");

export function isFastLaneEligible(opts: {
  messages: FastMsg[];
  chatMode?: string;
  deepResearch?: boolean;
  /** Kept for callers; web search alone no longer blocks the fast lane. */
  searchExplicit?: boolean;
  computerUseEnabled?: boolean;
  activeAgent?: string;
  activeSkill?: unknown;
}): boolean {
  const { messages } = opts;
  // NOTE: the search flag must NOT block the fast lane. The web-search toggle
  // is on by default and the auto heuristic fires on trivial turns ("2+2?"),
  // so this used to send every simple message down the slow path (~9s).
  // `chat-fast` escalates by itself whenever a turn really needs live data.
  if (opts.deepResearch || opts.computerUseEnabled) return false;
  if (opts.activeAgent || opts.activeSkill) return false;
  // The chat page sends `normal` for a plain turn; `chat` is the legacy name.
  const mode = String(opts.chatMode || "normal").toLowerCase();
  if (mode !== "chat" && mode !== "normal") return false;
  if (!messages.length || messages.length > 60) return false;
  let total = 0;
  for (const m of messages) {
    if (typeof m.content !== "string") return false;
    // Never fast-lane a turn that already carries a tool/task trace.
    if (/\[tool:|\bESCALATE\b/.test(m.content)) return false;
    total += m.content.length;
  }
  return total > 0 && total < 20000;
}

export type FastChatOutcome = "answered" | "escalate";

export async function tryFastChat({
  messages,
  authToken,
  fingerprint,
  signal,
  onDelta,
  onModel,
  onUsage,
  onReasoning,
  force,
  thinking,
  maxTokens,
}: {
  messages: FastMsg[];
  authToken: string;
  fingerprint: string;
  signal?: AbortSignal;
  onDelta: (chunk: string) => void;
  onModel?: (model: string) => void;
  onUsage?: (usage: Record<string, number>) => void;
  /** Thinking/reasoning deltas (the fast model streams `reasoning_content`). */
  onReasoning?: (chunk: string) => void;
  /** Answer even when the turn looks complex (used as a rescue path). */
  force?: boolean;
  /** The user's deep-thinking toggle for this turn. */
  thinking?: boolean;
  /** Output budget for this turn (trivial turns use a small one for speed). */
  maxTokens?: number;
}): Promise<FastChatOutcome> {
  let resp: Response;
  const proxyBody = JSON.stringify({
    messages,
    lane: "fast",
    thinking: thinking === true,
    maxTokens: force ? 8192 : maxTokens,
  });
  /** Fallback runtime: this app's own serverless chat endpoint. */
  const viaProxy = () =>
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: proxyBody,
      signal,
    });
  try {
    // Primary runtime: this app's own serverless chat endpoint. It streams the
    // model's reasoning deltas, so the thinking panel always has content.
    resp = await viaProxy();
    if (!resp.ok || !(resp.headers.get("content-type") || "").includes("text/event-stream")) {
      try { await resp.body?.cancel(); } catch { /* ignore */ }
      throw new Error("PROXY_UNAVAILABLE");
    }
  } catch (proxyError) {
    if (signal?.aborted) throw proxyError;
  try {
    resp = await fetch(FAST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: edgeAnonKey("chat-fast"),
        Authorization: `Bearer ${authToken}`,
        "x-anon-fingerprint": fingerprint,
      },
      body: JSON.stringify({
        messages,
        thinking: thinking === true,
        ...(force ? { force: true, maxTokens: 8192 } : maxTokens ? { maxTokens } : {}),
      }),
      signal,
    });
    if (resp.status >= 500 || resp.status === 404) {
      try {
        await resp.body?.cancel();
      } catch {
        /* ignore */
      }
      resp = await viaProxy();
    }
  } catch (e) {
    if (signal?.aborted) throw e;
    return "escalate";
  }
  }



  const contentType = resp.headers.get("content-type") || "";
  if (!resp.ok || !resp.body || !contentType.includes("text/event-stream")) {
    // Any non-stream answer (including `{ escalate: true }`) means: use the
    // full chat path.
    try {
      await resp.body?.cancel();
    } catch {
      /* ignore */
    }
    return "escalate";
  }

  const modelUsed = resp.headers.get("x-model-used");
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let emitted = false;
  let sawAnyPayload = false;

  const handleContent = (content: string) => {
    sawAnyPayload = true;
    if (!emitted && modelUsed) onModel?.(modelUsed);
    emitted = true;
    // The edge function performs routing before opening an SSE response, so
    // every model token is now safe to render without an ESCALATE probe delay.
    onDelta(content);
  };

  const handleLine = (line: string) => {
    if (!line.startsWith("data: ")) return false;
    const jsonStr = line.slice(6).trim();
    if (jsonStr === "[DONE]") return true;
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed?.escalate) throw new Error("__ESCALATE__");
      if (parsed?.event === "escalate") throw new Error("__ESCALATE__");
      if (parsed?.usage && typeof parsed.usage === "object") onUsage?.(parsed.usage);
      const delta = parsed?.choices?.[0]?.delta;
      const reasoning =
        (delta?.reasoning_content as string | undefined) ??
        (delta?.reasoning as string | undefined);
      if (typeof reasoning === "string" && reasoning) {
        sawAnyPayload = true;
        onReasoning?.(reasoning);
      }
      const content = delta?.content;
      if (typeof content === "string" && content) handleContent(content);
    } catch (e) {
      if ((e as Error)?.message === "__ESCALATE__") throw e;
    }
    return false;
  };

  try {
    let done = false;
    while (!done) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;
      textBuffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, idx);
        textBuffer = textBuffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line || line.startsWith(":")) continue;
        if (handleLine(line)) {
          done = true;
          break;
        }
      }
    }
  } catch (e) {
    if ((e as Error)?.message === "__ESCALATE__") {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      // Content already shown to the user cannot be taken back, so only a
      // clean (nothing emitted) escalation is safe.
      return emitted ? "answered" : "escalate";
    }
    if (emitted) return "answered";
    throw e;
  }

  if (!sawAnyPayload && !emitted) return "escalate";
  return "answered";
}
