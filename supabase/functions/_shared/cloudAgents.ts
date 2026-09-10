/**
 * Cloud computer engine — Browser Use Cloud only.
 *
 * The product's computer/browser work runs on Browser Use Cloud
 * (`api.browser-use.com/api/v2`). Keys come from the admin-managed
 * `browser_use_keys` table (rotatable, with cooldowns), then the legacy
 * `manus_keys` / `provider_api_keys` pools, then the function secret.
 *
 * Text models are a separate concern and live in `abliteration.ts`.
 */

const BU_BASE = Deno.env.get("BROWSER_USE_API_BASE") || "https://api.browser-use.com/api/v2";

export type AgentProgress = (step: { title: string; url?: string | null }) => void;

export interface CloudAgentResult {
  provider: "browser-use";
  text: string;
  steps: { title: string; url?: string | null }[];
  liveUrl?: string | null;
}

interface Admin {
  from: (table: string) => any;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Browser Use keys: the dedicated table first, then legacy pools, then env. */
async function buKey(admin: Admin | null): Promise<string | null> {
  if (admin) {
    const now = Date.now();
    const [{ data: dedicated }, { data: legacy }, { data: shared }] = await Promise.all([
      admin
        .from("browser_use_keys")
        .select("api_key,priority,last_used_at,cooldown_until")
        .eq("status", "active")
        .order("priority", { ascending: false })
        .order("last_used_at", { ascending: true, nullsFirst: true })
        .limit(10),
      admin
        .from("manus_keys")
        .select("api_key,priority,last_used_at,cooldown_until")
        .eq("status", "active")
        .order("priority", { ascending: false })
        .order("last_used_at", { ascending: true, nullsFirst: true })
        .limit(10),
      admin
        .from("provider_api_keys")
        .select("api_key,last_used_at")
        .eq("provider", "c")
        .eq("status", "active")
        .order("last_used_at", { ascending: true, nullsFirst: true })
        .limit(10),
    ]);
    const usable = (rows: unknown) =>
      ((rows ?? []) as Array<{ api_key?: string; cooldown_until?: string | null }>).filter(
        (row) => !row.cooldown_until || new Date(row.cooldown_until).getTime() <= now,
      );
    for (const row of [...usable(dedicated), ...usable(legacy), ...usable(shared)]) {
      const key = row.api_key?.trim();
      if (key && key.length > 12) return key;
    }
  }
  return Deno.env.get("BROWSER_USE_API_KEY")?.trim() || null;
}


/* ------------------------------- Browser Use ------------------------------ */

async function runBrowserUse(
  key: string,
  task: string,
  budgetMs: number,
  onStep?: AgentProgress,
): Promise<CloudAgentResult | null> {
  const headers = { "X-Browser-Use-API-Key": key, "Content-Type": "application/json" };
  const created = await fetch(`${BU_BASE}/tasks`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      task: task.slice(0, 50_000),
      llm: Deno.env.get("BROWSER_USE_LLM") || undefined,
      maxSteps: 60,
      vision: "auto",
    }),
  });
  if (!created.ok) {
    console.error("browser-use create failed", created.status, (await created.text().catch(() => "")).slice(0, 300));
    return null;
  }
  const info = await created.json().catch(() => null) as { id?: string; task_id?: string } | null;
  const id = info?.id || info?.task_id;
  if (!id) return null;

  const deadline = Date.now() + budgetMs;
  let seen = 0;
  let liveUrl: string | null = null;
  const steps: { title: string; url?: string | null }[] = [];

  while (Date.now() < deadline) {
    await sleep(3_000);
    const resp = await fetch(`${BU_BASE}/tasks/${id}`, { headers });
    if (!resp.ok) continue;
    const task = await resp.json().catch(() => null) as any;
    if (!task) continue;

    if (!liveUrl && task.sessionId) {
      const s = await fetch(`${BU_BASE}/sessions/${task.sessionId}`, { headers });
      if (s.ok) liveUrl = ((await s.json().catch(() => null)) as any)?.liveUrl ?? null;
    }

    const list = Array.isArray(task.steps) ? task.steps : [];
    for (const step of list.slice(seen)) {
      const entry = {
        title: String(step?.nextGoal || step?.evaluationPreviousGoal || "working…").slice(0, 200),
        url: step?.url ?? null,
      };
      steps.push(entry);
      onStep?.(entry);
    }
    seen = list.length;

    if (task.status === "finished") {
      return { provider: "browser-use", text: String(task.output ?? "").trim(), steps, liveUrl };
    }
    if (task.status === "failed" || task.status === "stopped") {
      console.error("browser-use task ended", task.status, task.error);
      return null;
    }
  }

  // Out of budget: stop the remote task so it does not keep burning credits.
  void fetch(`${BU_BASE}/tasks/${id}/stop`, { method: "POST", headers }).catch(() => {});
  return steps.length ? { provider: "browser-use", text: "", steps, liveUrl } : null;
}

/* --------------------------------- Public -------------------------------- */

/**
 * Runs one goal on Browser Use Cloud. Returns null when no key is available or
 * the run produced nothing.
 */
export async function runCloudAgent(
  admin: Admin | null,
  goal: string,
  options: { budgetMs?: number; onStep?: AgentProgress } = {},
): Promise<CloudAgentResult | null> {
  const budgetMs = Math.min(Math.max(options.budgetMs ?? 180_000, 20_000), 900_000);
  const key = await buKey(admin);
  if (!key) return null;
  return await runBrowserUse(key, goal, budgetMs, options.onStep);
}

/** True when a Browser Use key is configured as a function secret. */
export function hasBrowserUseEnvKey(): boolean {
  return Boolean(Deno.env.get("BROWSER_USE_API_KEY")?.trim());
}

