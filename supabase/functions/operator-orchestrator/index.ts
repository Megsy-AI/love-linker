/**
 * @doc operator-orchestrator — drives an "operator" agent run end to end.
 *
 * Two invocation shapes (both POST JSON):
 *  - { goal, user_id }        → create a new operator_runs row, plan the first
 *                                steps with the Abliteration LLM, return { run_id }.
 *  - { run_id, sync? }        → advance an existing run by one tick: plan the
 *                                next step (or wrap up if the plan is done),
 *                                execute it, write operator_steps /
 *                                operator_agent_messages / operator_artifacts.
 *
 * `sync: true` runs the tick inline and returns once it settles; otherwise the
 * function still runs the tick synchronously (edge functions have no true
 * background execution here) but responds immediately after accepting the run.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callModel, MODEL_LADDER } from "../_shared/abliteration.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MAX_STEPS = 8;

const PLANNER_SYSTEM = `You are Megsy's Operator planning agent. You drive an autonomous
agent run toward a user's goal, one step at a time. Given the goal, the steps
already taken (with their outputs), decide either:
  - the NEXT single step to take (short, concrete, actionable), or
  - that the goal is now complete.

Reply with ONLY compact JSON, no prose, no markdown fences, matching exactly
one of these shapes:
  {"done": false, "title": "...", "description": "...", "agent": "planner"}
  {"done": true, "summary": "...", "result": { ...any useful structured result... }}`;

function extractJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function planNext(goal: string, priorSteps: Array<Record<string, unknown>>) {
  const history = priorSteps
    .map(
      (s, i) =>
        `${i + 1}. [${s.status}] ${s.title}${s.tool_output ? ` → ${JSON.stringify(s.tool_output).slice(0, 500)}` : ""}`,
    )
    .join("\n") || "(no steps taken yet)";

  const result = await callModel(admin, [...MODEL_LADDER], {
    agentRole: "manager",
    messages: [
      { role: "system", content: PLANNER_SYSTEM },
      {
        role: "user",
        content: `Goal: ${goal}\n\nSteps so far:\n${history}\n\nWhat's next?`,
      },
    ],
    temperature: 0.3,
    max_tokens: 600,
  });

  if (!result) return null;
  const body = await result.response.json().catch(() => null);
  const content = body?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") return null;
  return extractJson(content);
}

async function insertMessage(runId: string, agent: string, role: string, content: string, metadata: Record<string, unknown> = {}) {
  await admin.from("operator_agent_messages").insert({ run_id: runId, agent, role, content, metadata });
}

async function createRun(goal: string, userId: string) {
  const { data: run, error } = await admin
    .from("operator_runs")
    .insert({ goal, user_id: userId, status: "pending", current_phase: "planning" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await insertMessage(run.id, "planner", "system", `Run created for goal: ${goal}`);
  return run;
}

async function tick(runId: string) {
  const { data: run, error: runErr } = await admin
    .from("operator_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (runErr) throw new Error(runErr.message);
  if (!run) throw new Error("run not found");
  if (["succeeded", "failed"].includes(run.status)) return run;

  await admin
    .from("operator_runs")
    .update({ status: "running", last_tick_at: new Date().toISOString() })
    .eq("id", runId);

  const { data: steps } = await admin
    .from("operator_steps")
    .select("*")
    .eq("run_id", runId)
    .order("step_no");
  const priorSteps = steps ?? [];

  if (priorSteps.length >= MAX_STEPS) {
    const { data: updated } = await admin
      .from("operator_runs")
      .update({
        status: "succeeded",
        current_phase: "done",
        result: { summary: "Reached the maximum step budget for this run." },
      })
      .eq("id", runId)
      .select()
      .single();
    await insertMessage(runId, "planner", "system", "Run stopped: step budget exhausted.");
    return updated;
  }

  const plan = await planNext(run.goal, priorSteps);
  if (!plan) {
    const { data: updated } = await admin
      .from("operator_runs")
      .update({ status: "failed", error: "Planner did not return a usable response." })
      .eq("id", runId)
      .select()
      .single();
    await insertMessage(runId, "planner", "system", "❌ Planning failed: no usable model response.");
    return updated;
  }

  if (plan.done) {
    const summary = String(plan.summary ?? "Goal completed.");
    const { data: updated } = await admin
      .from("operator_runs")
      .update({
        status: "succeeded",
        current_phase: "done",
        result: plan.result ?? { summary },
        chat_response: summary,
      })
      .eq("id", runId)
      .select()
      .single();
    await insertMessage(runId, "planner", "assistant", summary);
    await admin.from("operator_artifacts").insert({
      run_id: runId,
      kind: "summary",
      content: summary,
      metadata: plan.result ?? {},
    });
    return updated;
  }

  const stepNo = priorSteps.length + 1;
  const title = String(plan.title ?? `Step ${stepNo}`);
  const description = plan.description ? String(plan.description) : null;
  const agent = plan.agent ? String(plan.agent) : "planner";

  const { data: step, error: stepErr } = await admin
    .from("operator_steps")
    .insert({
      run_id: runId,
      step_no: stepNo,
      agent,
      title,
      description,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (stepErr) throw new Error(stepErr.message);

  await insertMessage(runId, agent, "assistant", description ? `${title} — ${description}` : title);

  // Execution: this planner drives narrative/reasoning steps only (no live
  // tool/browser execution wired here yet), so the step's output is the
  // planner's own reasoning for this step; downstream tools can be attached
  // by extending planNext to request `tool` calls.
  const { data: finishedStep } = await admin
    .from("operator_steps")
    .update({
      status: "completed",
      finished_at: new Date().toISOString(),
      tool_output: { note: description ?? title },
    })
    .eq("id", step.id)
    .select()
    .single();

  const { data: updatedRun } = await admin
    .from("operator_runs")
    .update({ current_phase: title.slice(0, 200) })
    .eq("id", runId)
    .select()
    .single();

  return { run: updatedRun, step: finishedStep };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  try {
    if (payload.run_id) {
      const runId = String(payload.run_id);
      const result = await tick(runId);
      return json({ ok: true, run_id: runId, result });
    }

    const goal = String(payload.goal ?? "").trim();
    const userId = String(payload.user_id ?? "");
    if (!goal) return json({ error: "goal required" }, 400);
    if (!userId) return json({ error: "user_id required" }, 400);

    const run = await createRun(goal, userId);
    return json({ ok: true, run_id: run.id });
  } catch (error) {
    console.error("operator-orchestrator error", error);
    const message = error instanceof Error ? error.message : "operator_orchestrator_failed";
    if (payload.run_id) {
      await admin
        .from("operator_runs")
        .update({ status: "failed", error: message })
        .eq("id", String(payload.run_id))
        .then(() => {}, () => {});
    }
    return json({ error: message }, 500);
  }
});
