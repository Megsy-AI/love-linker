/**
 * Hyperbrowser data tools.
 *
 * `cloudAgents.ts` drives the two providers' *agent* endpoints (a browser that
 * reasons and acts). This module adds Hyperbrowser's non-agent data endpoints,
 * which are much cheaper and faster when the goal is only to READ the web:
 *
 *   scrapePage()  — one URL → clean markdown (JS-rendered, anti-bot handled)
 *   crawlSite()   — a site/section → many pages of markdown
 *   extractData() — one or more URLs + a prompt/schema → structured JSON
 *
 * All three are best-effort: they return null instead of throwing, so a caller
 * can fall back to the plain fetch reader or the full browser agent.
 */

const HB_BASE = "https://app.hyperbrowser.ai/api";
const POLL_MS = 2500;

interface Admin {
  from: (table: string) => any;
}

/** Hyperbrowser key: the function secret first, then the rotatable DB pool. */
export async function hyperbrowserKey(admin: Admin | null): Promise<string | null> {
  const env = Deno.env.get("HYPERBROWSER_API_KEY")?.trim();
  if (env) return env;
  if (!admin) return null;
  const { data } = await admin
    .from("api_keys")
    .select("api_key")
    .eq("service", "hyperbrowser")
    .eq("is_active", true)
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(5);
  for (const row of (data ?? []) as { api_key?: string }[]) {
    const key = row.api_key?.trim();
    if (key && key.length > 12) return key;
  }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function hbJson(
  key: string,
  path: string,
  body?: unknown,
  method = "POST",
): Promise<any | null> {
  try {
    const res = await fetch(`${HB_BASE}${path}`, {
      method,
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("hyperbrowser", path, res.status, (await res.text().catch(() => "")).slice(0, 300));
      return null;
    }
    return await res.json().catch(() => null);
  } catch (error) {
    console.error("hyperbrowser request failed", path, error);
    return null;
  }
}

/** Polls a Hyperbrowser job until it settles or the budget runs out. */
async function poll(key: string, path: string, budgetMs: number): Promise<any | null> {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    const job = await hbJson(key, path, undefined, "GET");
    const status = String(job?.status ?? "").toLowerCase();
    if (status === "completed" || status === "failed" || status === "error") return job;
    await sleep(POLL_MS);
  }
  return null;
}

/** One URL → readable markdown. Returns null when the page can't be read. */
export async function scrapePage(
  admin: Admin | null,
  url: string,
  budgetMs = 60_000,
): Promise<{ url: string; title?: string; markdown: string } | null> {
  const key = await hyperbrowserKey(admin);
  if (!key || !/^https?:\/\//i.test(url)) return null;
  const started = await hbJson(key, "/scrape", {
    url,
    scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
  });
  const jobId = started?.jobId || started?.id;
  if (!jobId) return null;
  const job = await poll(key, `/scrape/${jobId}`, budgetMs);
  const md = job?.data?.markdown ?? job?.data?.content ?? "";
  if (typeof md !== "string" || !md.trim()) return null;
  return { url, title: job?.data?.metadata?.title, markdown: md.slice(0, 40_000) };
}

/** A site/section → up to `limit` pages of markdown. */
export async function crawlSite(
  admin: Admin | null,
  url: string,
  limit = 10,
  budgetMs = 180_000,
): Promise<{ url: string; markdown: string }[] | null> {
  const key = await hyperbrowserKey(admin);
  if (!key || !/^https?:\/\//i.test(url)) return null;
  const started = await hbJson(key, "/crawl", {
    url,
    maxPages: Math.min(Math.max(limit, 1), 50),
    scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
  });
  const jobId = started?.jobId || started?.id;
  if (!jobId) return null;
  const job = await poll(key, `/crawl/${jobId}`, budgetMs);
  const pages = Array.isArray(job?.data) ? job.data : [];
  const out = pages
    .map((p: any) => ({
      url: String(p?.url ?? ""),
      markdown: String(p?.markdown ?? p?.content ?? "").slice(0, 20_000),
    }))
    .filter((p: { markdown: string }) => p.markdown.trim());
  return out.length ? out : null;
}

/** URLs + instruction (optionally a JSON schema) → structured JSON. */
export async function extractData(
  admin: Admin | null,
  urls: string[],
  prompt: string,
  schema?: Record<string, unknown>,
  budgetMs = 180_000,
): Promise<unknown | null> {
  const key = await hyperbrowserKey(admin);
  const targets = urls.filter((u) => /^https?:\/\//i.test(u)).slice(0, 10);
  if (!key || !targets.length || !prompt.trim()) return null;
  const started = await hbJson(key, "/extract", {
    urls: targets,
    prompt: prompt.slice(0, 4000),
    ...(schema ? { schema } : {}),
  });
  const jobId = started?.jobId || started?.id;
  if (!jobId) return null;
  const job = await poll(key, `/extract/${jobId}`, budgetMs);
  return job?.data ?? null;
}
