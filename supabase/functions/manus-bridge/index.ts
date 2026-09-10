/**
 * @doc manus-bridge
 * The agent runtime: runs the real OpenManus repository for a signed-in user.
 *
 * Each task gets its own isolated Novita sandbox created from the
 * `megsy-openmanus` template (upstream OpenManus + Chromium preinstalled).
 * `om_runner.py` inside that sandbox runs the upstream `Manus` agent unchanged
 * and appends every step, tool call and result to `events.jsonl`; this function
 * drains that file into `manus_steps` / `manus_tool_calls` so the UI can render
 * progress, and forwards user replies to the agent's `ask_human` tool.
 *
 * The agent reaches the models through `manus-proxy` with the run's own token,
 * so provider keys never enter the sandbox and model routing stays unchanged.
 *
 * POST body: { action: "start" | "poll" | "answer" | "stop", ... }
 *   start  { prompt, conversationId?, maxSteps? } -> { runId }
 *   poll   { runId }                              -> { run, events }
 *   answer { runId, text }                        -> { ok }
 *   stop   { runId }                              -> { ok }
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardRequest, guardResponse } from "../_shared/apiAuth.ts";
import { dataServiceKey, dataUrl } from "../_shared/dataProject.ts";
import { OM_RUNNER_PY } from "../_shared/omRunner.ts";
import {
  connectSandbox,
  createSandbox,
  hasNovita,
  killSandbox,
  SANDBOX_TTL_MS,
  TEMPLATE_ID,
} from "../_shared/novita.ts";

const RUNNER = "/app/om_runner.py";
const MAX_STEPS_CAP = 40;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function admin() {
  return createClient(dataUrl(), dataServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Public URL of this deployment, used to hand the sandbox its model endpoint. */
function proxyBase(): string {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  return `${base}/functions/v1/manus-proxy/v1`;
}

interface RunRow {
  id: string;
  user_id: string;
  status: string;
  sandbox_id: string | null;
  run_dir: string | null;
  run_token: string;
  cursor_seq: number;
  step_count: number;
  question: string | null;
  final_answer: string | null;
  error: string | null;
  prompt: string;
  max_steps: number;
}

async function loadRun(db: any, runId: string, userId: string): Promise<RunRow | null> {
  const { data } = await db
    .from("manus_runs")
    .select(
      "id,user_id,status,sandbox_id,run_dir,run_token,cursor_seq,step_count,question,final_answer,error,prompt,max_steps",
    )
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as RunRow) ?? null;
}

/** Only the fields the UI needs — never the run token or sandbox id. */
function publicRun(run: Record<string, unknown>) {
  const {
    id, status, question, final_answer, error, step_count, max_steps, prompt,
    started_at, finished_at, created_at,
  } = run as Record<string, unknown>;
  return {
    id, status, question, final_answer, error, step_count, max_steps, prompt,
    started_at, finished_at, created_at,
  };
}

async function start(db: any, userId: string, body: Record<string, unknown>) {
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) return json({ error: "prompt is required" }, 400);
  if (prompt.length > 20_000) return json({ error: "prompt is too long" }, 400);
  if (!hasNovita()) return json({ error: "agent runtime is not configured" }, 503);

  const maxSteps = Math.min(MAX_STEPS_CAP, Math.max(5, Number(body.maxSteps ?? 25) || 25));
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;

  const { data: created, error: insertError } = await db
    .from("manus_runs")
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      prompt,
      max_steps: maxSteps,
      status: "queued",
      template_id: TEMPLATE_ID,
    })
    .select("id,run_token")
    .single();
  if (insertError || !created) {
    console.error("manus-bridge insert failed", insertError);
    return json({ error: "could not create the task" }, 500);
  }

  const runId = String(created.id);
  const runDir = `/app/runs/${runId}`;
  try {
    const sandbox = await createSandbox({
      OM_BASE_URL: proxyBase(),
      OM_API_KEY: String(created.run_token),
      OM_MODEL: "megsy",
      OM_RUN_DIR: runDir,
      OM_MAX_STEPS: String(maxSteps),
      PYTHONUNBUFFERED: "1",
    });
    await sandbox.files.write(RUNNER, OM_RUNNER_PY);
    await sandbox.files.write(`${runDir}/task.txt`, prompt);
    await sandbox.commands.run(
      `cd /app/openmanus && nohup python ${RUNNER} > ${runDir}/runner.log 2>&1 &`,
      { background: true, timeoutMs: SANDBOX_TTL_MS },
    );
    await db
      .from("manus_runs")
      .update({
        sandbox_id: sandbox.sandboxId,
        run_dir: runDir,
        status: "running",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return json({ runId, status: "running" });
  } catch (error) {
    console.error("manus-bridge start failed", error);
    await db
      .from("manus_runs")
      .update({
        status: "failed",
        error: String(error).slice(0, 800),
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return json({ error: "could not start the agent", runId }, 502);
  }
}

interface Event {
  seq: number;
  type: string;
  step?: number;
  [key: string]: unknown;
}

function parseEvents(raw: string, after: number): Event[] {
  const out: Event[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const event = JSON.parse(trimmed) as Event;
      if (typeof event.seq === "number" && event.seq > after) out.push(event);
    } catch {
      // A partially flushed final line: it reappears complete on the next poll.
    }
  }
  return out.sort((a, b) => a.seq - b.seq);
}

/** Turns one runner event into the row the UI reads. */
function stepText(event: Event): string | null {
  switch (event.type) {
    case "thought":
      return String(event.text ?? "");
    case "tool_call":
      return String(event.name ?? "tool");
    case "tool_result":
      return String(event.text ?? "").slice(0, 8000);
    case "ask":
      return String(event.question ?? "");
    case "answer":
      return String(event.answer ?? "");
    case "final":
      return String(event.text ?? "");
    case "error":
      return String(event.message ?? "");
    default:
      return null;
  }
}

async function poll(db: any, userId: string, run: RunRow) {
  if (!run.sandbox_id || !run.run_dir) return json({ run: publicRun(run as unknown as Record<string, unknown>), events: [] });
  if (["completed", "failed", "stopped"].includes(run.status)) {
    return json({ run: publicRun(run as unknown as Record<string, unknown>), events: [] });
  }

  let raw = "";
  let statusRaw = "";
  let reachable = true;
  try {
    const sandbox = await connectSandbox(run.sandbox_id);
    raw = String(await sandbox.files.read(`${run.run_dir}/events.jsonl`).catch(() => ""));
    statusRaw = String(await sandbox.files.read(`${run.run_dir}/status.json`).catch(() => ""));
  } catch (error) {
    reachable = false;
    console.error("manus-bridge poll could not reach the sandbox", error);
  }

  const events = parseEvents(raw, run.cursor_seq);
  if (events.length) {
    const stepRows = events
      .filter((event) => stepText(event) !== null)
      .map((event) => ({
        run_id: run.id,
        user_id: userId,
        seq: event.seq,
        step: typeof event.step === "number" ? event.step : null,
        kind: event.type,
        text: stepText(event),
        payload: event as unknown as Record<string, unknown>,
      }));
    if (stepRows.length) {
      const { error } = await db.from("manus_steps").upsert(stepRows, {
        onConflict: "run_id,seq",
        ignoreDuplicates: true,
      });
      if (error) console.error("manus-bridge step insert failed", error);
    }

    for (const event of events) {
      if (event.type === "tool_call") {
        let args: unknown = null;
        try {
          args = event.arguments ? JSON.parse(String(event.arguments)) : null;
        } catch {
          args = { raw: String(event.arguments ?? "") };
        }
        await db.from("manus_tool_calls").insert({
          run_id: run.id,
          user_id: userId,
          call_id: event.id ? String(event.id) : null,
          step: typeof event.step === "number" ? event.step : null,
          name: String(event.name ?? "tool"),
          arguments: args,
          status: "running",
        });
      } else if (event.type === "tool_result" && event.tool_call_id) {
        await db
          .from("manus_tool_calls")
          .update({
            result: String(event.text ?? "").slice(0, 20_000),
            status: "done",
            finished_at: new Date().toISOString(),
          })
          .eq("run_id", run.id)
          .eq("call_id", String(event.tool_call_id));
      }
    }
  }

  let status = run.status;
  let question: string | null = run.question;
  let finalAnswer: string | null = run.final_answer;
  let error: string | null = run.error;
  if (statusRaw) {
    try {
      const parsed = JSON.parse(statusRaw) as Record<string, unknown>;
      const state = String(parsed.state ?? "");
      if (state === "awaiting_input") {
        status = "awaiting_input";
        question = String(parsed.question ?? "");
      } else if (state === "completed") {
        status = "completed";
      } else if (state === "failed") {
        status = "failed";
        error = String(parsed.error ?? "").slice(0, 800);
      } else if (state === "running") {
        status = "running";
        question = null;
      }
    } catch {
      // status.json is rewritten atomically enough; a bad read is retried.
    }
  } else if (!reachable && run.status === "running") {
    status = "failed";
    error = "The agent workspace stopped responding.";
  }

  const finalEvent = events.find((event) => event.type === "final");
  if (finalEvent) finalAnswer = String(finalEvent.text ?? "");
  const errorEvent = events.find((event) => event.type === "error");
  if (errorEvent && !error) error = String(errorEvent.message ?? "").slice(0, 800);

  const lastSeq = events.length ? events[events.length - 1].seq : run.cursor_seq;
  const stepEvents = events.filter((event) => event.type === "step_start").length;
  const finished = ["completed", "failed"].includes(status);

  const { data: updated } = await db
    .from("manus_runs")
    .update({
      cursor_seq: lastSeq,
      step_count: run.step_count + stepEvents,
      status,
      question,
      final_answer: finalAnswer,
      error,
      last_polled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(finished ? { finished_at: new Date().toISOString() } : {}),
    })
    .eq("id", run.id)
    .select(
      "id,status,question,final_answer,error,step_count,max_steps,cursor_seq,prompt,started_at,finished_at",
    )
    .single();

  if (finished && run.sandbox_id) await killSandbox(run.sandbox_id);

  return json({ run: publicRun((updated ?? run) as unknown as Record<string, unknown>), events });
}

async function answer(db: any, run: RunRow, text: string) {
  if (!run.sandbox_id || !run.run_dir) return json({ error: "this task is not running" }, 409);
  try {
    const sandbox = await connectSandbox(run.sandbox_id);
    await sandbox.files.write(`${run.run_dir}/answer.txt`, text);
    await db
      .from("manus_runs")
      .update({ status: "running", question: null, updated_at: new Date().toISOString() })
      .eq("id", run.id);
    return json({ ok: true });
  } catch (error) {
    console.error("manus-bridge answer failed", error);
    return json({ error: "could not deliver your reply to the agent" }, 502);
  }
}

async function stop(db: any, run: RunRow) {
  if (run.sandbox_id) await killSandbox(run.sandbox_id);
  await db
    .from("manus_runs")
    .update({
      status: "stopped",
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", run.id);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const guard = await guardRequest(req, "manus-bridge");
  if (!guard.ok || !guard.userId) return guardResponse(guard, corsHeaders);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const db = admin();
  const action = String(body.action ?? "");
  if (action === "start") return await start(db, guard.userId, body);

  const runId = String(body.runId ?? "");
  if (!runId) return json({ error: "runId is required" }, 400);
  const run = await loadRun(db, runId, guard.userId);
  if (!run) return json({ error: "task not found" }, 404);

  if (action === "poll") return await poll(db, guard.userId, run);
  if (action === "stop") return await stop(db, run);
  if (action === "answer") {
    const text = String(body.text ?? "").trim();
    if (!text) return json({ error: "text is required" }, 400);
    return await answer(db, run, text);
  }
  return json({ error: "unknown action" }, 400);
});
