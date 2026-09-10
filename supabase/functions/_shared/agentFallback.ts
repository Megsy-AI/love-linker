/**
 * Model fallback that uses OUR OWN providers only.
 *
 * The chat functions prefer the workspace's Model Studio credentials. When no
 * key is configured (or every key fails) we do NOT fall back to any third-party
 * chat gateway: the turn is handed to the cloud agents the product already runs
 * on — Browser Use Cloud first, Hyperbrowser second. They bring their own LLMs,
 * so a full answer still comes back.
 *
 * The result is re-emitted as an OpenAI-compatible chat-completions stream, so
 * every existing client (streamChat, fastChat) renders it unchanged.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { runCloudAgent } from "./cloudAgents.ts";
import { dataServiceKey, dataUrl } from "./dataProject.ts";

/** Label reported back to the client as the model that answered. */
export const AGENT_MODEL = "megsy-agent";

const encoder = new TextEncoder();

function admin() {
  const url = dataUrl();
  const key = dataServiceKey();
  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false } }) as any;
  } catch {
    return null;
  }
}

type Msg = { role?: string; content?: unknown };

function asText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: any) => (typeof part === "string" ? part : typeof part?.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

/** Turns the chat payload into a single goal the browser agent can execute. */
function buildGoal(payload: Record<string, unknown>): string {
  const messages = Array.isArray(payload.messages) ? (payload.messages as Msg[]) : [];
  const history = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${asText(m.content)}`)
    .join("\n");
  const last = [...messages].reverse().find((m) => m.role === "user");
  const question = asText(last?.content).trim();
  return [
    "You are Megsy. Answer the user's latest message completely, in the same language they used.",
    "Use the browser only when live information is needed; otherwise answer directly from knowledge.",
    history ? `Conversation so far:\n${history}` : "",
    question ? `Latest message: ${question}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 20_000);
}

function chunk(id: string, delta: Record<string, unknown>, finish: string | null) {
  return `data: ${JSON.stringify({
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: AGENT_MODEL,
    choices: [{ index: 0, delta, finish_reason: finish }],
  })}\n\n`;
}

/**
 * Runs the turn on the cloud agents and returns an OpenAI-compatible response
 * (SSE when `payload.stream`, JSON otherwise). Returns null when no agent key
 * is available, so the caller can surface its own error.
 */
export async function callAgentFallback(
  payload: Record<string, unknown>,
): Promise<Response | null> {
  const goal = buildGoal(payload);
  if (!goal) return null;
  const db = admin();
  const streaming = payload.stream === true;
  const id = `agent-${crypto.randomUUID()}`;

  if (!streaming) {
    const run = await runCloudAgent(db, goal, { budgetMs: 180_000 });
    if (!run?.text) return null;
    return new Response(
      JSON.stringify({
        id,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: AGENT_MODEL,
        choices: [{ index: 0, message: { role: "assistant", content: run.text }, finish_reason: "stop" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  let started = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      const keepAlive = setInterval(() => send(`: keep-alive ${Date.now()}\n\n`), 10_000);
      try {
        const run = await runCloudAgent(db, goal, {
          budgetMs: 240_000,
          // Live progress becomes reasoning-style deltas so the thinking panel
          // keeps moving while the agent works.
          onStep: (step) => {
            started = true;
            send(
              chunk(
                id,
                { role: "assistant", reasoning_content: `${step.title}${step.url ? ` — ${step.url}` : ""}\n` },
                null,
              ),
            );
          },
        });
        const text = run?.text?.trim();
        if (!text) {
          if (!started) {
            // Nothing ran at all: let the caller decide what to show.
            clearInterval(keepAlive);
            controller.error(new Error("agent_unavailable"));
            return;
          }
          send(chunk(id, { role: "assistant", content: "" }, "stop"));
        } else {
          for (let i = 0; i < text.length; i += 400) {
            send(chunk(id, { role: "assistant", content: text.slice(i, i + 400) }, null));
          }
          send(chunk(id, { role: "assistant", content: "" }, "stop"));
        }
        send("data: [DONE]\n\n");
      } catch (error) {
        console.error("agent fallback failed", error);
        send(chunk(id, { role: "assistant", content: "" }, "stop"));
        send("data: [DONE]\n\n");
      } finally {
        clearInterval(keepAlive);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

/** True when a Browser Use key (or the data project holding the pool) exists. */
export function hasAgentProvider(): boolean {
  return Boolean(Deno.env.get("BROWSER_USE_API_KEY")?.trim() || dataServiceKey());
}

