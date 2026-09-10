/**
 * MEGSY primary agent — a Manus-style autonomous loop.
 *
 * This replaces the old "plan once, run parallel briefs, answer" primary agent.
 * Instead of a single planning round-trip, the lead agent now runs a real tool
 * loop: it writes a todo list, searches and reads the live web, delegates whole
 * subtasks to specialist agents, records durable memory, and only then hands a
 * compact evidence pack to the streaming answer.
 *
 * Every model call goes to Alibaba Model Studio (International) with the
 * project's own DashScope key — no AI gateway and no other provider is used.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { braveKey, braveSearch, readPage } from "./research.ts";
import { AGENTS, type AgentProfile, profileSystem } from "./router.ts";
import { ACTION_TOOLS, ACTION_TOOL_NAMES, actionLabel, runActionTool } from "./actionTools.ts";

/** Non-streaming raw chat call (returns the parsed upstream JSON body). */
export type RawCall = (
  models: string[],
  payload: Record<string, unknown>,
) => Promise<any>;

export type Frame = (frame: Record<string, unknown>) => void;

/** Lead-agent model ladder: strongest first, cheap flash last as a rescue. */
const LEAD_MODELS = ["qwen3.8-max", "qwen3.7-max", "qwen-max", "qwen-plus"];
const MAX_STEPS = 20;
/** Hard wall-clock budget for the whole loop, so a turn never hangs. */
const LOOP_BUDGET_MS = 240_000;
/** Independent tool calls executed concurrently inside one step. */
const PARALLEL_LIMIT = 8;

/* ── Token governor ───────────────────────────────────────────────────────────
 * The loop's cost is dominated by three things: the tool catalog re-sent every
 * step, full tool outputs kept in the loop transcript, and a manager-review
 * message after every single step. We keep the same capability but pay for it
 * once: the full catalog is advertised only while the plan is being formed, the
 * transcript carries trimmed tool output (the FULL text still goes to the
 * evidence pack), older steps are compacted into a digest, and the manager only
 * reviews when there is something to judge.
 * ---------------------------------------------------------------------------*/
/** Tool output kept inside the loop transcript (evidence keeps the full text). */
const LOOP_TOOL_CAP = 1600;
/** Steps that see the complete tool catalog; later steps see core + used. */
const FULL_CATALOG_STEPS = 2;
/** Transcript size that triggers compaction of the older steps. */
const COMPACT_AFTER = 16;
/** Steps kept verbatim after a compaction. */
const KEEP_TAIL = 8;


const SPECIALIST_IDS = Object.keys(AGENTS).filter((id) => id !== "general");

const LOOP_SYSTEM = `You are MEGSY's lead agent — the MANAGER of a team of worker agents and real tools. You run an autonomous work loop before the final answer is written.
Today is ${new Date().toISOString().slice(0, 10)}.

Your job in this loop is NOT to answer the user. Your job is to DO the work: plan, dispatch workers, read their reports, judge them, and either dispatch more work or stop when the goal is met.

How to work:
1. Call write_todo first for anything that is more than a single fact, so the user sees the plan. Update it as reality changes.
2. Use web_search + open_url whenever the answer depends on live facts, prices, news, people, products, laws or versions. Read the actual pages, do not trust snippets alone.
3. Dispatch workers. Specialists: ${SPECIALIST_IDS.join(", ")}.
   - coder: software, repos, debugging, infra. designer: UX/UI, design systems.
   - researcher: sourced facts. analyst: math, finance, strategy. data: SQL, metrics, spreadsheets.
   - writer: prose and copy. marketer: growth, SEO, campaigns, funnels. operator: multi-step execution.
   - reviewer: verify facts, code and numbers before delivery.
   Use delegate_team to run 2-4 independent subtasks AT THE SAME TIME — always prefer it over sequential delegate_agent calls. Use delegate_agent only for a single subtask.
4. MANAGE the reports: after each worker report decide explicitly — accept it, send it back with a sharper goal, dispatch a reviewer to verify it, or move to the next phase. Never accept a vague or unverified report for anything factual, numeric or executable.
5. Use remember_fact only for durable user facts (name, business, stack, preferences), never for turn chatter.
6. EXECUTE, do not describe. You have real hands:
   - build_and_deploy_app: whenever the user wants a site, app, landing page, tool, game or dashboard — build it AND deploy it, then hand over the single clean link. Never answer with code the user has to host themselves unless they asked for code only.
   - computer_task / computer_task_status: long, open-ended work on a real cloud computer (logins, forms, bookings, purchases, multi-site flows). Start it and report progress.
   - start_background_task / background_task_status: work that needs hours or must outlive this turn. It checkpoints and auto-resumes until done. Start it EARLY rather than running out of time.
   - send_email / read_inbox: the user's own mailbox.
   - generate_image / generate_video / create_slides: real media and decks.
   - list_integrations / use_integration: the user's connected apps (MCP + Pipedream).
   - use_skill: the user's saved skills — call it with no name to see them, then load the relevant one BEFORE doing the work.
7. Stop as soon as the goal is met. Then reply with plain text notes (no tool call): the key findings, decisions and open risks the final answer must use. Never write the user-facing answer here.

Rules: never invent a tool result, never claim something ran that did not, keep every tool argument minimal, and never mention this loop, tools, agents or models to the user.`;


const TOOLS = [
  {
    type: "function",
    function: {
      name: "write_todo",
      description: "Publish or update the visible task list for this turn.",
      parameters: {
        type: "object",
        properties: {
          items: { type: "array", items: { type: "string" }, description: "3-7 short steps" },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the live web and return titles, URLs and snippets.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_url",
      description: "Fetch a URL and return its readable text.",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delegate_agent",
      description: "Hand a self-contained subtask to a specialist agent and get its brief back.",
      parameters: {
        type: "object",
        properties: {
          agent: { type: "string", enum: SPECIALIST_IDS },
          goal: { type: "string", description: "Self-contained instruction, no references to other subtasks" },
        },
        required: ["agent", "goal"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delegate_team",
      description:
        "Dispatch 2-4 specialist workers AT THE SAME TIME on independent subtasks and get all of their reports back in one result. Prefer this whenever the work splits into parts that do not depend on each other.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            description: "2-4 independent assignments.",
            items: {
              type: "object",
              properties: {
                agent: { type: "string", enum: SPECIALIST_IDS },
                goal: {
                  type: "string",
                  description: "Self-contained instruction, no references to the other tasks",
                },
              },
              required: ["agent", "goal"],
            },
          },
        },
        required: ["tasks"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "scrape_page",
      description:
        "Render a URL in a real cloud browser and return clean markdown. Use for pages that plain fetching cannot read (JS apps, anti-bot, paywalled layout).",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crawl_site",
      description:
        "Crawl a website or section and return markdown for up to `limit` pages. Use when the answer spans many pages of one site.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" },
          limit: { type: "number", description: "Max pages, 1-50 (default 10)" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "extract_data",
      description:
        "Extract structured data from one or more URLs using an instruction (prices, listings, tables, contacts). Returns JSON.",
      parameters: {
        type: "object",
        properties: {
          urls: { type: "array", items: { type: "string" } },
          prompt: { type: "string", description: "What to extract, precisely" },
        },
        required: ["urls", "prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remember_fact",
      description: "Store a durable fact about this user for future turns.",
      parameters: {
        type: "object",
        properties: { key: { type: "string" }, value: { type: "string" } },
        required: ["key", "value"],
      },
    },
  },
];

type LoopMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
};

export type ManusResult = {
  /** Context block folded into the streaming answer's system prompt. */
  context: string;
  /** Todo list the lead agent published, if any. */
  todo: string[];
  /** Specialist ids that actually contributed. */
  used: string[];
  steps: number;
};

/** `<tool_use>{...}</tool_use>` blocks some models emit as plain text. */
const TOOL_USE_RE = /<tool_use>\s*([\s\S]*?)\s*<\/tool_use>/gi;

/** Aliases for tool names models invent instead of the real catalog names. */
const TOOL_NAME_ALIASES: Record<string, string> = {
  computer: "computer_task",
  browser: "computer_task",
  browse: "open_url",
  navigate: "open_url",
  search: "web_search",
  web: "web_search",
};

/** Removes literal tool-call markup so it never reaches the user's answer. */
function stripToolUse(text: string): string {
  return text.replace(TOOL_USE_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Recovers real tool calls from `<tool_use>` text blocks, mapping invented
 * names (e.g. `computer`) onto the catalog tools and folding loose arguments
 * (`url`, `action`, `task`) into the schema each tool expects.
 */
function textToolCalls(content: string): any[] {
  if (!content || !content.includes("<tool_use")) return [];
  const calls: any[] = [];
  for (const match of content.matchAll(TOOL_USE_RE)) {
    let parsed: any = null;
    try {
      parsed = JSON.parse(match[1].trim());
    } catch {
      continue;
    }
    const rawName = String(parsed?.name ?? "").trim();
    if (!rawName) continue;
    const name = TOOL_NAME_ALIASES[rawName] ?? rawName;
    const args = (parsed?.arguments ?? parsed?.parameters ?? {}) as Record<string, unknown>;
    let normalized: Record<string, unknown> = { ...args };
    if (name === "computer_task" && !normalized.goal) {
      const action = String(args.action ?? "").trim();
      const url = String(args.url ?? "").trim();
      normalized = {
        goal: String(args.task ?? args.instruction ?? [action, url].filter(Boolean).join(" ") ?? "").trim(),
      };
      if (!normalized.goal) continue;
    }
    if (name === "open_url" && !normalized.url && args.link) normalized.url = args.link;
    if (name === "web_search" && !normalized.query && args.q) normalized.query = args.q;
    calls.push({
      id: `text-${name}-${calls.length}-${Date.now()}`,
      type: "function",
      function: { name, arguments: JSON.stringify(normalized) },
    });
  }
  return calls;
}

function toolLabel(name: string, args: any): string {
  switch (name) {
    case "web_search":
      return String(args?.query ?? "").slice(0, 120);
    case "open_url":
      return String(args?.url ?? "").slice(0, 160);
    case "delegate_agent":
      return `${args?.agent ?? "agent"}: ${String(args?.goal ?? "").slice(0, 100)}`;
    case "delegate_team":
      return (Array.isArray(args?.tasks) ? args.tasks : [])
        .map((task: any) => String(task?.agent ?? ""))
        .filter(Boolean)
        .join(" + ")
        .slice(0, 120);

    case "write_todo":
      return `${Array.isArray(args?.items) ? args.items.length : 0} steps`;
    default:
      return actionLabel(name, args) || String(args?.key ?? "").slice(0, 80);
  }
}

/** One specialist run: its own persona and its own Alibaba model ladder. */
async function runSpecialist(
  raw: RawCall,
  profile: AgentProfile,
  goal: string,
  context: string,
): Promise<string> {
  const data = await raw(profile.models, {
    // Per-agent model split at the provider (see _shared/cerebras.ts).
    agentRole: profile.id,
    temperature: profile.temperature,
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content: `${profileSystem(profile)}

You are executing ONE subtask for the lead agent, not talking to the user. Deliver the finished artifact or a dense brief: facts, numbers, code, copy — no preamble, no questions, no meta commentary. Max ~320 words unless code requires more. No repetition, no restating the goal.`,
      },
      { role: "user", content: context ? `${goal}\n\nEvidence available:\n${context.slice(0, 3000)}` : goal },
    ],
  });
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === "string" ? text.trim() : "";
}

/**
 * Runs the primary agent loop and returns the evidence pack for the final
 * streamed answer. Never throws: on any failure it degrades to whatever was
 * gathered so far.
 */
export async function runPrimaryAgent(opts: {
  admin: SupabaseClient;
  raw: RawCall;
  question: string;
  history: { role: string; content: unknown }[];
  send: Frame;
  userId: string | null;
  /** Set when the user forced a specialist from the UI. */
  forcedAgent?: string;
  /** Caller's Supabase access token — lets the loop use user-scoped tools. */
  authToken?: string | null;
}): Promise<ManusResult> {
  const { admin, raw, question, send, userId } = opts;
  const started = Date.now();
  const evidence: string[] = [];
  const briefs: string[] = [];
  const sources: { title: string; url: string }[] = [];
  const used = new Set<string>();
  /** Tool names actually executed — drives the trimmed catalog after planning. */
  const usedTools = new Set<string>();
  let todo: string[] = [];
  let notes = "";
  let steps = 0;

  const messages: LoopMessage[] = [
    { role: "system", content: LOOP_SYSTEM },
    {
      role: "user",
      content: `USER REQUEST:\n${question.slice(0, 8000)}${
        opts.forcedAgent ? `\n\n(The user pinned the ${opts.forcedAgent} specialist for this turn.)` : ""
      }`,
    },
  ];

  /* Web budget: the same query or page was being fetched several times in one
   * turn, and each fetch also grows every later prompt. Repeats are answered
   * from cache and the turn has a hard fetch ceiling. */
  const webCache = new Map<string, string>();
  let searches = 0;
  let fetches = 0;
  const MAX_SEARCHES = 8;
  const MAX_FETCHES = 10;

  const execTool = async (name: string, args: any): Promise<string> => {
    const cacheKey = `${name}:${JSON.stringify(args ?? {})}`.slice(0, 400);
    if (webCache.has(cacheKey)) return `(already fetched this turn)\n${webCache.get(cacheKey)}`;
    if (name === "web_search" && searches >= MAX_SEARCHES) {
      return "search budget for this turn is used up — work with the evidence already gathered";
    }
    if ((name === "open_url" || name === "scrape_page") && fetches >= MAX_FETCHES) {
      return "page-fetch budget for this turn is used up — work with the evidence already gathered";
    }
    if (name === "web_search") searches += 1;
    if (name === "open_url" || name === "scrape_page") fetches += 1;
    switch (name) {
      case "write_todo": {
        const items = Array.isArray(args?.items)
          ? args.items.filter((item: unknown) => typeof item === "string" && item.trim()).slice(0, 7)
          : [];
        if (items.length) {
          todo = items;
          send({ event: "todo", items });
        }
        return items.length ? `todo published (${items.length} steps)` : "no items";
      }
      case "web_search": {
        const query = String(args?.query ?? "").trim().slice(0, 300);
        if (!query) return "empty query";
        const key = await braveKey(admin);
        const results = key ? await braveSearch(key, query, 6) : [];
        if (!results.length) return "no results";
        const lines: string[] = [];
        for (const item of results.slice(0, 6)) {
          const url = (item.url ?? "").trim();
          if (!url) continue;
          const title = (item.title ?? "").trim();
          if (!sources.some((source) => source.url === url)) sources.push({ title, url });
          lines.push(`- ${title} — ${url}\n  ${(item.description ?? "").replace(/<[^>]+>/g, "").slice(0, 240)}`);
        }
        send({ sources: sources.slice(0, 12) });
        const out = lines.join("\n") || "no results";
        webCache.set(cacheKey, out);
        return out;
      }
      case "open_url": {
        const url = String(args?.url ?? "").trim();
        if (!/^https?:\/\//i.test(url)) return "invalid url";
        const text = await readPage(url, 6000);
        if (!text) return "page unreadable";
        evidence.push(`SOURCE ${url}\n${text.slice(0, 4000)}`);
        if (!sources.some((source) => source.url === url)) sources.push({ title: url, url });
        return text.slice(0, 4000);
      }
      case "delegate_agent": {
        const id = String(args?.agent ?? "").trim().toLowerCase();
        const profile = AGENTS[id];
        const goal = String(args?.goal ?? "").trim();
        if (!profile || !goal) return "unknown specialist or empty goal";
        const brief = await runSpecialist(raw, profile, goal, evidence.join("\n\n"));
        if (!brief) return "specialist returned nothing";
        used.add(id);
        briefs.push(`### ${profile.label} — ${goal}\n${brief}`);
        return brief.slice(0, 4000);
      }
      case "delegate_team": {
        const tasks = (Array.isArray(args?.tasks) ? args.tasks : [])
          .map((task: any) => ({
            id: String(task?.agent ?? "").trim().toLowerCase(),
            goal: String(task?.goal ?? "").trim(),
          }))
          .filter((task: any) => AGENTS[task.id] && task.goal)
          .slice(0, 4);
        if (!tasks.length) return "no valid assignments";
        const context = evidence.join("\n\n");
        // Real parallel fan-out: every worker runs at the same time.
        const reports = await Promise.all(tasks.map(async (task: any) => {
          const profile = AGENTS[task.id];
          try {
            const brief = await runSpecialist(raw, profile, task.goal, context);
            return { label: profile.label, id: task.id, goal: task.goal, brief };
          } catch (error) {
            return {
              label: profile.label,
              id: task.id,
              goal: task.goal,
              brief: `failed: ${error instanceof Error ? error.message : "error"}`,
            };
          }
        }));
        const lines: string[] = [];
        for (const report of reports) {
          if (!report.brief) continue;
          used.add(report.id);
          briefs.push(`### ${report.label} — ${report.goal}\n${report.brief}`);
          lines.push(`## REPORT from ${report.label} (${report.goal})\n${report.brief.slice(0, 2500)}`);
        }
        return lines.length ? lines.join("\n\n") : "no worker returned anything";
      }

      case "scrape_page": {
        const url = String(args?.url ?? "").trim();
        const { scrapePage } = await import("../_shared/hyperTools.ts");
        const page = await scrapePage(admin as any, url);
        if (!page) return "page unreadable";
        evidence.push(`SOURCE ${url}\n${page.markdown.slice(0, 6000)}`);
        if (!sources.some((source) => source.url === url)) {
          sources.push({ title: page.title || url, url });
        }
        return page.markdown.slice(0, 6000);
      }
      case "crawl_site": {
        const url = String(args?.url ?? "").trim();
        const limit = Number(args?.limit) || 10;
        const { crawlSite } = await import("../_shared/hyperTools.ts");
        const pages = await crawlSite(admin as any, url, limit);
        if (!pages?.length) return "crawl returned nothing";
        for (const page of pages.slice(0, 8)) {
          evidence.push(`SOURCE ${page.url}\n${page.markdown.slice(0, 3000)}`);
          if (page.url && !sources.some((source) => source.url === page.url)) {
            sources.push({ title: page.url, url: page.url });
          }
        }
        return pages
          .slice(0, 8)
          .map((page) => `# ${page.url}\n${page.markdown.slice(0, 1500)}`)
          .join("\n\n")
          .slice(0, 8000);
      }
      case "extract_data": {
        const urls = Array.isArray(args?.urls) ? args.urls.map((u: unknown) => String(u)) : [];
        const prompt = String(args?.prompt ?? "").trim();
        const { extractData } = await import("../_shared/hyperTools.ts");
        const data = await extractData(admin as any, urls, prompt);
        if (data == null) return "extraction returned nothing";
        const text = JSON.stringify(data).slice(0, 8000);
        evidence.push(`EXTRACTED (${urls.join(", ")})\n${text}`);
        return text;
      }
      case "remember_fact": {
        const key = String(args?.key ?? "").trim().slice(0, 120);
        const value = String(args?.value ?? "").trim().slice(0, 2000);
        if (!userId || !key || !value) return "not stored";
        await admin
          .from("agent_memory")
          .upsert({ user_id: userId, key, value }, { onConflict: "user_id,key" });
        return "stored";
      }
      default: {
        if (ACTION_TOOL_NAMES.has(name)) {
          const output = await runActionTool(
            { admin, userId, authToken: opts.authToken ?? null, raw, send },
            name,
            args,
          );
          evidence.push(`ACTION ${name}\n${output.slice(0, 3000)}`);
          return output;
        }
        return "unknown tool";
      }
    }
  };

  /** Caches web reads so a repeated URL never costs a second fetch or prompt. */
  const exec = async (name: string, args: any): Promise<string> => {
    const output = await execTool(name, args);
    if (name === "open_url" || name === "scrape_page") {
      webCache.set(`${name}:${JSON.stringify(args ?? {})}`.slice(0, 400), output.slice(0, LOOP_TOOL_CAP));
    }
    return output;
  };

  /**
   * Keeps the transcript small without losing the thread: system prompt, the
   * user request and the last few steps stay verbatim, everything older becomes
   * a one-line digest. Compaction always starts the tail at an assistant turn so
   * every `tool` message keeps its matching `tool_calls`.
   */
  const compact = () => {
    if (messages.length <= COMPACT_AFTER) return;
    const head = messages.slice(0, 2);
    let cut = messages.length - KEEP_TAIL;
    while (cut < messages.length && messages[cut].role !== "assistant") cut += 1;
    if (cut >= messages.length) return;
    const dropped = messages.slice(2, cut);
    const names = dropped
      .filter((m) => m.role === "assistant" && Array.isArray((m as any).tool_calls))
      .flatMap((m) => ((m as any).tool_calls as any[]).map((c) => String(c?.function?.name ?? "")))
      .filter(Boolean);
    const digest = {
      role: "user" as const,
      content: `EARLIER STEPS (compacted). Tools already run: ${
        [...new Set(names)].join(", ") || "none"
      }. Findings are already captured — do not repeat this work.${
        notes ? `\nWorking notes: ${notes.slice(0, 600)}` : ""
      }`,
    };
    messages.splice(0, messages.length, ...head, digest, ...messages.slice(cut));
  };

  /** Advertised tool catalog: full while planning, then core + already used. */
  const catalog = (step: number) => {
    if (step < FULL_CATALOG_STEPS) return [...TOOLS, ...ACTION_TOOLS];
    const keep = ACTION_TOOLS.filter((tool: any) => usedTools.has(String(tool?.function?.name ?? "")));
    return [...TOOLS, ...keep];
  };

  try {
    for (let step = 0; step < MAX_STEPS; step += 1) {
      if (Date.now() - started > LOOP_BUDGET_MS) break;
      steps = step + 1;
      compact();

      const data = await raw(LEAD_MODELS, {
        agentRole: "manager",
        temperature: 0.25,
        max_tokens: 1100,
        parallel_tool_calls: true,
        tools: catalog(step),
        messages,
      });

      const message = data?.choices?.[0]?.message;
      if (!message) break;

      const rawContent = typeof message.content === "string" ? message.content : "";
      // Some models emit the call as literal `<tool_use>{...}</tool_use>` text
      // instead of a real tool_call. Recover those so the agent still runs
      // instead of printing raw markup into the answer.
      const calls = Array.isArray(message.tool_calls) && message.tool_calls.length
        ? message.tool_calls
        : textToolCalls(rawContent);
      if (!calls.length) {
        notes = stripToolUse(rawContent);
        break;
      }
      message.content = stripToolUse(rawContent);

      messages.push({
        role: "assistant",
        content: typeof message.content === "string" ? message.content : "",
        tool_calls: calls,
      });

      // Independent calls in one step run in parallel — this is what makes the
      // loop feel like a team rather than a queue.
      const outcomes = await Promise.all(calls.slice(0, PARALLEL_LIMIT).map(async (call: any) => {
        const name = String(call?.function?.name ?? "");
        let args: any = {};
        try {
          args = JSON.parse(call?.function?.arguments || "{}");
        } catch { /* malformed arguments degrade to empty */ }
        const callId = String(call?.id ?? `${name}-${Date.now()}-${Math.random()}`);
        const target = toolLabel(name, args);
        send({ tool_event: { type: "tool_call", name, call_id: callId, target } });
        let output = "";
        let ok = true;
        try {
          output = await exec(name, args);
        } catch (error) {
          ok = false;
          output = `error: ${error instanceof Error ? error.message : "failed"}`;
        }
        send({ tool_event: { type: "tool_result", name, call_id: callId, target, ok } });
        return { callId, output, name };
      }));

      for (const outcome of outcomes) {
        usedTools.add(outcome.name);
        messages.push({
          role: "tool",
          tool_call_id: outcome.callId,
          // Trimmed for the transcript only — the full output is already in the
          // evidence pack that the final answer reads.
          content: outcome.output.slice(0, LOOP_TOOL_CAP) || "(empty)",
        });
      }

      // Manager review: only when there is something to judge, on a periodic
      // checkpoint, or when the clock is running out — reviewing after every
      // single step doubled the prompt for no added quality.
      const leftMs = LOOP_BUDGET_MS - (Date.now() - started);
      const gotReports = outcomes.some((outcome) =>
        outcome.name === "delegate_agent" || outcome.name === "delegate_team"
      );
      const lowTime = leftMs < 70_000;
      if (!gotReports && !lowTime && steps % 3 !== 0) continue;
      messages.push({
        role: "user",
        content: [
          `MANAGER REVIEW (step ${steps}/${MAX_STEPS}, ~${Math.max(0, Math.round(leftMs / 1000))}s left).`,
          todo.length ? `Current plan:\n${todo.map((item, i) => `${i + 1}. ${item}`).join("\n")}` : "",
          gotReports
            ? "Judge each worker report now: accept it, re-dispatch a sharper goal, or send a reviewer to verify it. Do not accept unverified facts, numbers or code."
            : "",
          lowTime

            ? "You are almost out of time. If the goal is not reachable in this turn, call start_background_task with the full remaining goal so it keeps running, then stop."
            : "Continue with the next tool calls, running independent work in parallel. Stop and write your notes only when the goal is actually met.",
        ].filter(Boolean).join("\n\n"),
      });
    }

  } catch (error) {
    console.error("chat-alibaba primary agent loop failed", error);
  }

  const parts: string[] = [];
  if (todo.length) {
    parts.push(`AGENT PLAN (already executed — do not re-plan, deliver the result):\n${
      todo.map((item, index) => `${index + 1}. ${item}`).join("\n")
    }`);
  }
  if (evidence.length) {
    parts.push(`LIVE EVIDENCE (write facts from this, cite as [n] using the source list):\n${
      evidence.join("\n\n").slice(0, 12_000)
    }`);
  }
  if (sources.length) {
    parts.push(`SOURCES:\n${
      sources.slice(0, 12).map((source, index) => `[${index + 1}] ${source.title || source.url} — ${source.url}`).join("\n")
    }`);
  }
  if (briefs.length) {
    parts.push(`SPECIALIST OUTPUT (merge into ONE seamless answer, never mention the specialists):\n${
      briefs.join("\n\n").slice(0, 12_000)
    }`);
  }
  if (notes) parts.push(`LEAD AGENT NOTES:\n${notes.slice(0, 2500)}`);

  return { context: parts.join("\n\n"), todo, used: [...used], steps };
}
