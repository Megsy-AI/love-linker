/**
 * @doc The real agent: the upstream OpenManus repository running in an isolated
 * cloud workspace, driven through the `manus-bridge` function.
 *
 * This replaces the old in-tab loop entirely. Nothing is simulated here — the
 * task is executed by OpenManus itself (browser, shell, files, Python), and this
 * module only starts a task, follows its progress and returns the final answer.
 *
 * Models are unchanged: the agent calls back through `manus-proxy`, which uses
 * the same providers as chat.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AgentEvent {
  seq: number;
  type: string;
  step?: number;
  name?: string;
  text?: string;
  question?: string;
  arguments?: string;
}

export interface AgentRunState {
  id: string;
  status: "queued" | "running" | "awaiting_input" | "completed" | "failed" | "stopped";
  question: string | null;
  final_answer: string | null;
  error: string | null;
  step_count: number;
  max_steps: number;
}

/** Trivial chatter never needs an agent; everything else does. */
const SMALL_TALK =
  /^(hi|hey|hello|yo|thanks?|thank you|ok(ay)?|cool|nice|great|good (morning|night|evening)|bye|سلام|السلام عليكم|ازيك|إزيك|شكرا|شكراً|تمام|حاضر|اوك|أوك|ايوه|أيوه|ماشي|صباح الخير|مساء الخير|باي)[\s!.،؟?ـ]*$/i;

export function shouldRunAgent(text: string, chatMode: string): boolean {
  if (chatMode === "deep-research") return false;
  const q = (text || "").trim();
  if (!q || q.length < 12) return false;
  return !SMALL_TALK.test(q);
}

/** Heavier tasks get more room; simple asks stay quick. */
export function agentStepBudget(text: string): number {
  const q = (text || "").trim();
  const heavy =
    /(research|analy[sz]e|compare|strategy|report|audit|roadmap|step by step|خطة|ابحث|قارن|حلل|تقرير|استراتيجية|دراسة|خطوات)/i;
  if (heavy.test(q) || q.length > 400) return 30;
  if (q.length > 120) return 20;
  return 12;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manus-bridge", { body });
  if (error) throw error;
  return data as T;
}

export async function startAgentRun(input: {
  prompt: string;
  conversationId?: string | null;
  maxSteps?: number;
}): Promise<string> {
  const out = await call<{ runId: string }>({
    action: "start",
    prompt: input.prompt,
    conversationId: input.conversationId ?? null,
    maxSteps: input.maxSteps,
  });
  return out.runId;
}

export async function pollAgentRun(
  runId: string,
): Promise<{ run: AgentRunState; events: AgentEvent[] }> {
  return await call({ action: "poll", runId });
}

export async function answerAgentRun(runId: string, text: string): Promise<void> {
  await call({ action: "answer", runId, text });
}

export async function stopAgentRun(runId: string): Promise<void> {
  await call({ action: "stop", runId });
}

/** Human-readable label for a step, used in the live activity trace. */
/** Plain-language names for the agent's own tools. */
const TOOL_LABELS: Record<string, string> = {
  browser_use: "Browsing the web",
  web_search: "Searching the web",
  python_execute: "Running code",
  bash: "Working in the terminal",
  str_replace_editor: "Editing files",
  file_saver: "Saving a file",
  terminate: "Wrapping up",
  ask_human: "Asking you",
};

/**
 * Turns a raw agent event into something worth reading. Bare step counters are
 * dropped: what the agent is actually thinking and doing is the useful part.
 */
export function describeEvent(event: AgentEvent): string | null {
  switch (event.type) {
    case "thought": {
      const text = (event.text || "").replace(/\s+/g, " ").trim();
      return text ? text.slice(0, 220) : null;
    }
    case "tool_call":
      return TOOL_LABELS[event.name || ""] || (event.name || "").replace(/_/g, " ") || null;
    case "tool_result": {
      const text = (event.text || "").replace(/\s+/g, " ").trim();
      return text ? text.slice(0, 220) : null;
    }
    case "ask":
      return event.question || null;
    default:
      return null;
  }
}


export interface RunAgentTaskOptions {
  userText: string;
  context?: string;
  conversationId?: string | null;
  maxSteps?: number;
  signal?: AbortSignal;
  /** One line per step, for the thinking trace. */
  onStep?: (label: string, detail: string) => void;
  /** Fired when the agent needs the user to reply before it can continue. */
  onQuestion?: (question: string, runId: string) => void;
  pollIntervalMs?: number;
  /** Hard stop, so a stuck task can never hold the reply forever. */
  budgetMs?: number;
}

export interface AgentTaskResult {
  runId: string;
  answer: string;
  steps: number;
  status: AgentRunState["status"];
}

/**
 * Runs one task from start to finish and resolves with the agent's own answer.
 * Aborting or exceeding the budget stops the task and its workspace.
 */
export async function runAgentTask(
  options: RunAgentTaskOptions,
): Promise<AgentTaskResult | null> {
  const prompt = options.context
    ? `${options.userText}\n\nContext already gathered:\n${options.context.slice(0, 4000)}`
    : options.userText;

  const runId = await startAgentRun({
    prompt,
    conversationId: options.conversationId ?? null,
    maxSteps: options.maxSteps,
  });

  const started = Date.now();
  const budget = options.budgetMs ?? 8 * 60_000;
  const interval = options.pollIntervalMs ?? 3_000;
  let lastActivity = "";


  while (true) {
    if (options.signal?.aborted || Date.now() - started > budget) {
      await stopAgentRun(runId).catch(() => undefined);
      return { runId, answer: "", steps: 0, status: "stopped" };
    }
    await new Promise((resolve) => setTimeout(resolve, interval));

    let poll: { run: AgentRunState; events: AgentEvent[] };
    try {
      poll = await pollAgentRun(runId);
    } catch {
      continue; // A dropped poll is retried; the task keeps running remotely.
    }

    for (const event of poll.events) {
      const label = describeEvent(event);
      if (!label) continue;
      if (event.type === "tool_call") lastActivity = label;
      options.onStep?.(
        event.type === "tool_call" ? label : lastActivity || "Thinking",
        label,
      );
    }


    if (poll.run.status === "awaiting_input" && poll.run.question) {
      options.onQuestion?.(poll.run.question, runId);
      continue;
    }
    if (["completed", "failed", "stopped"].includes(poll.run.status)) {
      return {
        runId,
        answer: poll.run.final_answer || "",
        steps: poll.run.step_count,
        status: poll.run.status,
      };
    }
  }
}
