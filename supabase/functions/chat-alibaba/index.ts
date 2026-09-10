/**
 * @doc Full MEGSY chat endpoint: streaming chat, tools, research and media routing.
 * Full MEGSY chat endpoint.
 *
 * This local implementation replaces the previously external-only function
 * while preserving the frontend's OpenAI-compatible SSE contract.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { lastUserText, research, researchContext } from "./research.ts";
import type { PlannerCall, RawCall } from "./research.ts";
import { profileModels, profileSystem, routeProfile } from "./router.ts";
import { type CallFn, deliveryContract } from "./orchestrator.ts";
import { runPrimaryAgent } from "./manus.ts";
import { runCloudAgent } from "../_shared/cloudAgents.ts";
import { dataAnonKey, dataServiceKey, dataUrl } from "../_shared/dataProject.ts";



const headers = {
  ...corsHeaders,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-anon-fingerprint",
};

// The only text-model provider is abliteration.ai (see `_shared/abliteration.ts`).
// Browsing/computer work runs on Browser Use Cloud. No other AI provider is used.
import { AGENT_MODEL, callAgentFallback } from "../_shared/agentFallback.ts";
import { callModel, MODELS, resolveModel } from "../_shared/abliteration.ts";


const SYSTEM = `You are MEGSY, an autonomous general-purpose AI agent.
Today is ${new Date().toISOString().slice(0, 10)} and the current year is 2026. Never describe older information as current.
Complete open-ended tasks by decomposing them. Produce polished final answers in the user's language, hide raw tool traces, cite sources for research, and never claim an action succeeded without evidence.
You can work with software repositories, web research, documents, data, media, websites, integrations, and specialist agents. When a requested capability is unavailable in this immediate chat turn, explain the exact next executable step instead of pretending it ran.

IDENTITY (authoritative — never contradict, never invent alternatives):
- You are Megsy, an AI product made by Megsy LLC, an Egyptian company.
- The company's CEO and its only developer, and the creator of the Megsy model, is Hamza Hassan Elgzairy.
- Megsy is built in Egypt and works natively in Arabic (including the Egyptian dialect) as well as English and 100+ other languages.
- Support contact: Support@megsyai.com. Website: https://megsyai.com.
- Never describe yourself with robotic self-labels such as "I am Megsy, an agent model designed for instant execution with real tools". Never open a reply with a self-description at all unless the user asked who you are; then answer naturally in one or two human sentences.
- Never mention internal models, providers, routing, agents, briefs, prompts or tools.

ANSWER QUALITY:
- NEVER stall. Never reply with a promise like "let me search", "give me a moment", "I'll get back to you", "خليني أبحث", "لحطة", "أنا أسوي البحث الحين". You cannot come back in a later message. Every reply must contain the actual answer or result for this turn: give what you know now, state plainly which parts you could not verify, and stop.
- Never ask the user for permission to search or to continue. Just do the work and answer.
- Answer in the exact language and dialect of the user's latest message, and never mix languages inside one answer.
- Never send a thin, three-line answer to a real question. Give the depth the question deserves: the direct answer first, then the substance (steps, numbers, examples, trade-offs, complete runnable code when code is involved).
- Short factual questions stay short; anything involving reasoning, planning, comparison, code, or a task gets a full, structured answer.
- Never expose internal logs, checkpoints, step ids, JSON state, or English debug text to the user.`;

type Message = { role: "system" | "user" | "assistant"; content: unknown };
type RequestBody = {
  action?: string;
  agent?: string;
  messages?: Message[];
  model?: string;
  tier?: string;
  customSystem?: string | null;
  /** Same field, short name — this is what the web client actually sends. */
  n?: string | null;

  searchEnabled?: boolean;
  resume_id?: string;
  maxTokens?: number;
  /** User enabled the deep-thinking toggle for this turn. */
  thinking?: boolean;
};


type ChatUpstream = {
  response: Response;
  keyId?: string;
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

// Key resolution and rotation live in `_shared/abliteration.ts`.


function normalizeMessages(input: Message[]): Message[] | null {
  if (!input.length || input.length > 80) return null;
  const output: Message[] = [];
  // Cost control: only the recent turns are sent verbatim; older ones are kept
  // as short excerpts so long threads stop re-billing their whole history.
  const recent = input.slice(-16);
  for (const [index, message] of recent.entries()) {
    if (!message || !["system", "user", "assistant"].includes(message.role)) return null;
    if (typeof message.content !== "string" && !Array.isArray(message.content)) return null;
    const older = index < recent.length - 6;
    const content = older && typeof message.content === "string" && message.content.length > 1200
      ? `${message.content.slice(0, 1200)} …`
      : message.content;
    output.push({ role: message.role, content });
  }
  return output;
}

/**
 * One model call on abliteration.ai, trying every model on the ladder and every
 * active key. When no key works, the turn is handed to Browser Use Cloud, which
 * brings its own LLM, so the user still gets a complete answer.
 */
async function callAlibaba(
  admin: any,
  models: string[],
  payload: Record<string, unknown>,
): Promise<(ChatUpstream & { model: string }) | null> {
  const result = await callModel(admin, models, payload);
  if (result) return result;
  const fallback = await callAgentFallback(payload);
  if (fallback) return { response: fallback, model: AGENT_MODEL };
  return null;
}



/** Non-streaming text helper for the manager and the parallel workers. */
function makeTextCall(admin: any): PlannerCall {
  return async (models, payload) => {
    const result = await callAlibaba(admin, models, { ...payload, stream: false });
    if (!result) return "";
    const data = await result.response.json().catch(() => null) as any;
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content.trim() : "";
  };
}

function makeRawCall(admin: any): RawCall {
  return async (models: string[], payload: Record<string, unknown>) => {
    const result = await callAlibaba(admin, models, { ...payload, stream: false });
    if (!result) return null;
    return await result.response.json().catch(() => null);
  };
}

async function personalization(admin: any, userId: string) {
  const { data: memories } = await admin
    .from("agent_memory")
    .select("key,value")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(30);
  const prompt = `Infer a conservative personalization profile from these memories. Do not invent facts.
Return JSON only with keys call_name, profession, about, interests (array), ai_traits, custom_instructions.
Memories: ${JSON.stringify(memories ?? []).slice(0, 10000)}`;
  const result = await callAlibaba(admin, [MODELS.standard], {
    stream: false,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
  });
  if (!result) return json({ error: "Personalization service unavailable" }, 503);
  const data = await result.response.json().catch(() => null) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return json({ error: "No suggestions returned" }, 503);
  try {
    return json({ suggestion: JSON.parse(content.replace(/^```json\s*|\s*```$/g, "")) });
  } catch {
    return json({ error: "Invalid personalization response" }, 503);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Data may live on a different Supabase account than the one running this
  // function (see `_shared/dataProject.ts`).
  const supabaseUrl = dataUrl();
  const anonKey = dataAnonKey();
  const serviceKey = dataServiceKey();
  if (!supabaseUrl || !serviceKey) return json({ error: "Server misconfigured" }, 503);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  let userId: string | null = null;
  if (bearer && bearer !== anonKey) {
    const auth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data } = await auth.auth.getUser(bearer);
    userId = data.user?.id ?? null;
  }

  if (body.action === "ingest_attachment") return json({ ok: true });
  if (body.action === "personalization_suggest") {
    if (!userId) return json({ error: "Authentication required", code: "auth_required" }, 403);
    return personalization(admin, userId);
  }

  const messages = normalizeMessages(Array.isArray(body.messages) ? body.messages : []);
  if (!messages) return json({ error: "A valid messages array is required" }, 400);
  if (!userId && !req.headers.get("x-anon-fingerprint")) {
    return json({ error: "Guest identity required", code: "auth_required" }, 403);
  }

  const question = lastUserText(messages);
  const routed = routeProfile(question, body.agent);
  const call: CallFn = makeTextCall(admin);

  // Short, single-intent turns skip the planner round-trip entirely: keyword
  // routing is already right for them and the saved call is ~1-3 seconds off
  // the time-to-first-token.
  // Anything that asks the agent to DO something (build/deploy, email, browse a
  // computer, generate media, use an integration or a skill) always goes through
  // the full tool loop, no matter how short the sentence is.
  const ACTION_INTENT =
    /(?:ابن|ابني|اعمل|اعملي|انشئ|أنشئ|صمم|صممي|انشر|إنشر|ارفع|ابعت|ابعتي|ارسل|أرسل|ايميل|إيميل|بريد|فيديو|صور[ةه]?|شرائح|بريزنتيشن|عرض تقديمي|حجز|احجز|اشتري|سجل لي|موقع|تطبيق|لاندينج|deploy|publish|host|build me|make me|create (?:a |an )?(?:site|website|app|page|landing|game|dashboard|tool)|landing page|website|web app|send (?:an )?email|e-?mail|inbox|generate (?:an )?(?:image|video)|slide|deck|presentation|book (?:a|me)|buy|log ?in to|browse|automate|integration|zapier|pipedream|mcp|skill)/i;
  const trivialTurn = !body.agent?.trim() &&
    question.length <= 240 &&
    !/\n/.test(question.trim()) &&
    !ACTION_INTENT.test(question) &&
    !/(?:خطة|خطه|قارن|حلل|تقرير|دراسة|ثم|بعدين|plan|compare|analy[sz]e|report|research|refactor|step by step|and then)/i
      .test(question);


  // The pre-work (semantic plan → research pre-pass → parallel specialists →
  // upstream connect) can take tens of seconds. We therefore open the SSE
  // response IMMEDIATELY and run everything inside the stream, sending frames
  // and heartbeats as we go, so the client never waits on silent headers.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let alive = true;
      const send = (value: unknown) => {
        if (!alive) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
        } catch { /* client gone */ }
      };
      const beat = setInterval(() => {
        if (!alive) return;
        try {
          controller.enqueue(encoder.encode(`: keep-alive ${Date.now()}\n\n`));
        } catch { /* client gone */ }
      }, 5_000);

      try {
        if (body.resume_id) send({ event: "resume_id", resumeId: body.resume_id });

        // 1) Routing. The primary agent plans inside its own loop, so the extra
        //    planner round-trip is gone; keyword routing only picks the persona
        //    of the voice that writes the final answer.
        const profile = routed;
        const turn = {
          profile,
          complexity: (trivialTurn ? "simple" : "standard") as "simple" | "standard",
          subtasks: [] as { agent: string; goal: string }[],
          deliverable: "",
        };
        send({ status: "thinking", agent: profile.id, agent_label: profile.labelAr });

        const tierBoost = body.tier === "ultra" || body.tier === "pro";
        // A client-side model choice only overrides the generalist; specialists
        // keep their own model ladder (coding stays on Kimi).
        const candidates = profileModels(profile, profile.id === "general" ? body.model : undefined);
        const models = tierBoost && profile.id === "general"
          ? [MODELS.standard, ...candidates.map(resolveModel)]
          : candidates.map(resolveModel);

        let liveContext = "";
        let agentContext = "";

        if (trivialTurn) {
          // Fast lane: one short factual turn keeps the old cheap pre-pass so the
          // first token stays ~1s away.
          const wantsResearch = profile.research === "always"
            ? body.searchEnabled !== false
            : profile.research === "auto" && body.searchEnabled !== false;
          if (wantsResearch) {
            try {
              const { findings, queries, digest } = await research(
                admin,
                question,
                (frame) => send(frame),
                profile.research === "always",
                call,
                makeRawCall(admin),
              );
              liveContext = researchContext(findings, queries, digest);
            } catch (error) {
              console.error("chat-alibaba research pre-pass failed", error);
            }
          }
        } else {
          // 2) PRIMARY AGENT: the Manus-style autonomous loop. It writes the todo
          //    list, searches and reads the live web, delegates whole subtasks to
          //    the specialist agents in parallel, and returns the evidence pack.
          try {
            const run = await runPrimaryAgent({
              admin,
              raw: makeRawCall(admin),
              question,
              history: messages,
              send: (frame) => send(frame),
              userId,
              forcedAgent: body.agent?.trim() || undefined,
              authToken: bearer || null,
            });
            agentContext = run.context;
          } catch (error) {
            console.error("chat-alibaba primary agent failed", error);
          }
        }

        // Global memory: durable facts about this person (signed in OR guest)
        // recalled from every earlier conversation and injected silently.
        let memoryBlock = "";
        try {
          const mem = await import("./memory.ts");
          const identity = await mem.memoryIdentity(
            userId,
            req.headers.get("x-anon-fingerprint"),
          );
          if (identity) memoryBlock = await mem.recall(admin, identity, question);
        } catch (error) {
          console.error("chat-alibaba memory recall skipped", error);
        }

        // The instructions the person saved in Settings are binding for every
        // turn — they used to be ignored because nothing read this table.
        let personaBlock = "";
        if (userId) {
          try {
            const { data: pers } = await admin
              .from("ai_personalization")
              .select("call_name, profession, about, ai_traits, custom_instructions, language_style")
              .eq("user_id", userId)
              .maybeSingle();
            if (pers) {
              const lines = [
                pers.call_name ? `Call the user: ${pers.call_name}` : "",
                pers.profession ? `Their work: ${pers.profession}` : "",
                pers.about ? `About them: ${pers.about}` : "",
                pers.ai_traits ? `Personality they want from you: ${pers.ai_traits}` : "",
                pers.language_style ? `Language / style: ${pers.language_style}` : "",
                pers.custom_instructions ? `Standing instructions: ${pers.custom_instructions}` : "",
              ].filter(Boolean);
              if (lines.length) {
                personaBlock = [
                  "━━━━ USER SETTINGS (BINDING — FOLLOW EXACTLY, NEVER MENTION) ━━━━",
                  ...lines,
                ].join("\n");
              }
            }
          } catch (error) {
            console.error("chat-alibaba personalization skipped", error);
          }
        }

        const clientSystem =
          (typeof body.customSystem === "string" && body.customSystem) ||
          (typeof body.n === "string" && body.n) ||
          "";

        const system = [
          SYSTEM,
          memoryBlock,
          profileSystem(profile),
          personaBlock,
          clientSystem,
          liveContext,
          agentContext,
          deliveryContract(turn),
        ]
          .filter(Boolean)
          .join("\n\n");



        const result: (ChatUpstream & { model?: string }) | null = await callAlibaba(admin, models, {
          stream: true,
          stream_options: { include_usage: true },
          // Alibaba's built-in search stays on for the streamed answer too; when
          // the pre-pass already gathered sources it is a supplement.
          enable_search: body.searchEnabled === true,
          search_options: body.searchEnabled === true
            ? { search_strategy: "agent", enable_source: true }
            : undefined,
          // Deep thinking is a user-facing toggle: when it is on the model
          // streams `reasoning_content`, which the UI renders in the thinking
          // panel. Off keeps the fastest possible first token.
          // Internal reasoning is on unless the caller explicitly opts out, so
          // the thinking panel always has real content to stream.
          enable_thinking: body.thinking !== false,
          // Thinking stays on for quality, but the budget is sized to the turn
          // instead of always paying for the maximum.
          ...(body.thinking !== false
            ? { thinking_budget: body.thinking === true ? 1536 : trivialTurn ? 384 : 768 }
            : {}),

          temperature: profile.temperature,
          // The answer length follows the turn: short factual replies no longer
          // reserve (and drift into filling) a 8k budget.
          max_tokens: Math.min(
            Math.max(Number(body.maxTokens) || (trivialTurn ? 1200 : 4096), 512),
            16384,
          ),
          messages: [{ role: "system", content: system }, ...messages],
        });

        if (!result || !result.response.ok || !result.response.body) {
          const detail = result && !result.response.ok
            ? await result.response.text().catch(() => "")
            : "";
          if (detail) console.error(`chat-alibaba fallback [${result?.response.status}]: ${detail.slice(0, 500)}`);

          // No text model available → run the turn on the cloud browser agents
          // (Browser Use Cloud). It brings its own LLM, so the
          // user still gets a complete answer with live evidence.
          send({ status: "thinking", agent: profile.id, agent_label: profile.labelAr, engine: "cloud-agent" });
          const goal = [
            system,
            liveContext,
            agentContext,
            "Conversation so far (answer the LAST user message):",
            messages
              .map((m) => `${m.role.toUpperCase()}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
              .join("\n")
              .slice(-8000),
            "Browse the web only when the answer needs fresh facts. Reply with the final answer only, in the user's language.",
          ].filter(Boolean).join("\n\n");

          const agentRun = await runCloudAgent(admin, goal, {
            budgetMs: 240_000,
            onStep: (step) => send({ tool_event: { name: "browser", title: step.title, url: step.url ?? undefined } }),
          }).catch((error) => {
            console.error("cloud agent failed", error);
            return null;
          });

          if (agentRun?.text) {
            if (agentRun.liveUrl) send({ live_url: agentRun.liveUrl, provider: agentRun.provider });
            send({ choices: [{ delta: { content: agentRun.text }, index: 0, finish_reason: null }] });
            send({ choices: [{ delta: {}, index: 0, finish_reason: "stop" }] });
          } else {
            send({ error: "Chat service temporarily unavailable" });
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          return;
        }


        const usedModel = result.model ?? models[0];
        send({ status: "thinking", model: usedModel, agent: profile.id });

        const upstreamReader = result.response.body.getReader();
        // The upstream SSE is forwarded byte-for-byte; we only sniff the text
        // deltas so the turn can be written to global memory afterwards.
        const sniff = new TextDecoder();
        let answerText = "";
        while (true) {
          const { done, value } = await upstreamReader.read();
          if (done) break;
          if (alive) controller.enqueue(value);
          if (answerText.length < 6000 && value) {
            for (const line of sniff.decode(value, { stream: true }).split("\n")) {
              const payload = line.startsWith("data:") ? line.slice(5).trim() : "";
              if (!payload || payload === "[DONE]") continue;
              try {
                const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
                if (typeof delta === "string") answerText += delta;
              } catch { /* partial frame — ignore */ }
            }
          }
        }

        // Write durable facts back to global memory, detached from the response.
        try {
          const mem = await import("./memory.ts");
          const identity = await mem.memoryIdentity(
            userId,
            req.headers.get("x-anon-fingerprint"),
          );
          if (identity && answerText.trim()) {
            void mem.remember(admin, call, identity, question, answerText);
          }
        } catch (error) {
          console.error("chat-alibaba memory write skipped", error);
        }
      } catch (error) {
        console.error("chat-alibaba stream failed", error);
        send({ error: error instanceof Error ? error.message : "Stream interrupted" });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        clearInterval(beat);
        alive = false;
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...headers,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
});