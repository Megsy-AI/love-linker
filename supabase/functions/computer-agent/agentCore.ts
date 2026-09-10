/**
 * @doc Server-only core for the Computer Agent (Megsy Computer).
 * Owns: key-pool selection with automatic failover, task creation/polling/stop
 * against the upstream computer provider, plus conversation memory.
 * The provider name is never exposed to the client — the UI only sees
 * "Megsy Computer".
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dataServiceKey, dataUrl } from "../_shared/dataProject.ts";

// Browser Use Cloud API v2 — https://docs.browser-use.com/cloud/api-v2
const API_BASE = Deno.env.get("BROWSER_USE_API_BASE") || "https://api.browser-use.com/api/v2";

export type ComputerAction = "create" | "poll" | "stop" | "list";

export interface ComputerPayload {
  action?: ComputerAction;
  token?: string;
  prompt?: string;
  conversation_id?: string | null;
  message_id?: string | null;
  attachments?: string[];
  task_id?: string;
}

export interface ComputerResult {
  status: number;
  body: Record<string, unknown>;
}

interface KeyRow {
  id: string;
  api_key: string;
  status: string;
  failure_count: number | null;
  cooldown_until: string | null;
  last_used_at: string | null;
  priority: number | null;
}

function admin(): SupabaseClient {
  const url = dataUrl();
  const serviceKey = dataServiceKey();
  if (!url || !serviceKey) throw new Error("Supabase server credentials are not configured");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function authenticate(supabase: SupabaseClient, token?: string) {
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data?.user ?? null;
}

/**
 * Active keys, least-recently-used first, skipping keys in cooldown.
 * Three pools are merged: the dedicated `browser_use_keys` table (Browser Use
 * Cloud keys), the legacy `manus_keys` table and the shared `provider_api_keys`
 * pool under provider "c".
 */
async function availableKeys(supabase: SupabaseClient): Promise<KeyRow[]> {
  const { data: browserUse } = await supabase
    .from("browser_use_keys")
    .select("id,api_key,status,failure_count,cooldown_until,last_used_at,priority")
    .eq("status", "active");

  const { data } = await supabase
    .from("manus_keys")
    .select("id,api_key,status,failure_count,cooldown_until,last_used_at,priority")
    .eq("status", "active");

  const { data: pool } = await supabase
    .from("provider_api_keys")
    .select("id,api_key,status,failure_count,last_used_at")
    .eq("provider", "c")
    .eq("status", "active");

  const poolRows: KeyRow[] = ((pool ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: `pool:${String(r.id)}`,
    api_key: String(r.api_key ?? ""),
    status: "active",
    failure_count: Number(r.failure_count ?? 0),
    cooldown_until: null,
    last_used_at: (r.last_used_at as string | null) ?? null,
    priority: 0,
  }));

  const browserUseRows: KeyRow[] = ((browserUse ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: `bu:${String(r.id)}`,
    api_key: String(r.api_key ?? ""),
    status: "active",
    failure_count: Number(r.failure_count ?? 0),
    cooldown_until: (r.cooldown_until as string | null) ?? null,
    last_used_at: (r.last_used_at as string | null) ?? null,
    priority: Number(r.priority ?? 0) + 10,
  }));

  const now = Date.now();
  return [...browserUseRows, ...((data ?? []) as KeyRow[]), ...poolRows]
    .filter((k) => k.api_key && (!k.cooldown_until || new Date(k.cooldown_until).getTime() <= now))
    .sort((a, b) => {
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pa !== pb) return pb - pa;
      const ta = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
      const tb = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
      return ta - tb;
    });
}

async function markFailure(
  supabase: SupabaseClient,
  key: KeyRow,
  status: number,
  message: string,
  retryAfterSec?: number,
) {
  if (key.id === "env") return; // env-configured fallback key has no DB row

  if (key.id.startsWith("bu:")) {
    const patch: Record<string, unknown> = {
      failure_count: (key.failure_count ?? 0) + 1,
      last_error: `${status}: ${message}`.slice(0, 500),
      updated_at: new Date().toISOString(),
    };
    if (status === 402 || status === 403) patch.status = "exhausted";
    else if (status === 401) patch.status = "disabled";
    else if (status === 429) {
      patch.cooldown_until = new Date(Date.now() + (retryAfterSec ?? 120) * 1000).toISOString();
    } else patch.cooldown_until = new Date(Date.now() + 30_000).toISOString();
    await supabase.from("browser_use_keys").update(patch).eq("id", key.id.slice(3));
    return;
  }

  if (key.id.startsWith("pool:")) {
    const patch: Record<string, unknown> = {
      failure_count: (key.failure_count ?? 0) + 1,
      last_error: `${status}: ${message}`.slice(0, 500),
    };
    if (status === 401 || status === 402 || status === 403) patch.status = "blocked";
    await supabase.from("provider_api_keys").update(patch).eq("id", key.id.slice(5));
    return;
  }

  const patch: Record<string, unknown> = {
    failure_count: (key.failure_count ?? 0) + 1,
    last_error: `${status}: ${message}`.slice(0, 500),
    updated_at: new Date().toISOString(),
  };
  if (status === 402 || status === 403) {
    patch.status = "exhausted";
  } else if (status === 429) {
    patch.cooldown_until = new Date(Date.now() + (retryAfterSec ?? 120) * 1000).toISOString();
  } else if (status === 401) {
    patch.status = "disabled";
  } else {
    patch.cooldown_until = new Date(Date.now() + 30_000).toISOString();
  }
  await supabase.from("manus_keys").update(patch).eq("id", key.id);
}

async function markSuccess(supabase: SupabaseClient, key: KeyRow) {
  if (key.id === "env") return;
  if (key.id.startsWith("bu:")) {
    await supabase
      .from("browser_use_keys")
      .update({ last_used_at: new Date().toISOString(), failure_count: 0, last_error: null })
      .eq("id", key.id.slice(3));
    return;
  }
  if (key.id.startsWith("pool:")) {
    await supabase
      .from("provider_api_keys")
      .update({ last_used_at: new Date().toISOString(), failure_count: 0, last_error: null })
      .eq("id", key.id.slice(5));
    return;
  }
  await supabase
    .from("manus_keys")
    .update({ last_used_at: new Date().toISOString(), last_error: null })
    .eq("id", key.id);
}

interface UpstreamCall {
  path: string;
  method: "GET" | "POST" | "PATCH";
  body?: unknown;
}

interface UpstreamOk {
  ok: true;
  data: any;
  key: KeyRow;
}
interface UpstreamFail {
  ok: false;
  status: number;
  message: string;
}

/** Runs one upstream call, rotating through the key pool on failure. */
async function callUpstream(
  supabase: SupabaseClient,
  call: UpstreamCall,
  preferKeyId?: string | null,
): Promise<UpstreamOk | UpstreamFail> {
  let keys = await availableKeys(supabase);
  if (preferKeyId) {
    const idx = keys.findIndex((k) => k.id === preferKeyId);
    if (idx > 0) keys = [keys[idx], ...keys.filter((_, i) => i !== idx)];
  }
  // Fallback: a single key configured as a server secret, used when the
  // database key pool is empty (e.g. fresh install).
  const envKey = Deno.env.get("BROWSER_USE_API_KEY");
  if (keys.length === 0 && envKey) {
    keys = [
      {
        id: "env",
        api_key: envKey,
        status: "active",
        failure_count: 0,
        cooldown_until: null,
        last_used_at: null,
        priority: 0,
      },
    ];
  }
  if (keys.length === 0) {
    return { ok: false, status: 503, message: "no_capacity" };
  }

  let last: UpstreamFail = { ok: false, status: 503, message: "no_capacity" };
  for (const key of keys) {
    try {
      const resp = await fetch(`${API_BASE}${call.path}`, {
        method: call.method,
        headers: {
          "Content-Type": "application/json",
          "X-Browser-Use-API-Key": key.api_key,
        },
        body: call.body ? JSON.stringify(call.body) : undefined,
      });
      const text = await resp.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      if (resp.ok) {
        await markSuccess(supabase, key);
        return { ok: true, data, key };
      }
      const message = String(data?.error?.message || data?.message || data?.error || text || "").slice(0, 300);
      console.error(`browser-use ${call.method} ${call.path} -> ${resp.status}: ${message}`);
      const retryAfter = Number(resp.headers.get("retry-after") || "") || undefined;

      await markFailure(supabase, key, resp.status, message, retryAfter);
      last = { ok: false, status: resp.status, message };
      // Bad request / validation errors are our fault — rotating keys won't help.
      if (resp.status === 400 || resp.status === 422 || resp.status === 404) return last;
    } catch (err) {
      const message = err instanceof Error ? err.message : "network_error";
      await markFailure(supabase, key, 500, message);
      last = { ok: false, status: 502, message };
    }
  }
  return last;
}

/** Conversation memory injected at the top of every new task prompt. */
async function loadMemory(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | null,
): Promise<string> {
  const q = supabase
    .from("computer_memory")
    .select("summary")
    .eq("user_id", userId)
    .limit(1);
  const { data } = conversationId
    ? await q.eq("conversation_id", conversationId)
    : await q.is("conversation_id", null);
  return (data?.[0]?.summary as string | undefined)?.trim() || "";
}

async function saveMemory(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | null,
  summary: string,
) {
  await supabase.from("computer_memory").upsert(
    {
      user_id: userId,
      conversation_id: conversationId,
      summary: summary.slice(0, 8000),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,conversation_id" },
  );
}

function normalizeStatus(raw: unknown, isSuccess?: unknown): string {
  const s = String(raw ?? "").toLowerCase();
  if (["finished", "completed", "success", "succeeded", "done"].includes(s)) {
    return isSuccess === false ? "failed" : "done";
  }
  if (["failed", "error", "canceled", "cancelled", "stopped"].includes(s)) return "failed";
  if (["pending", "queued", "created"].includes(s)) return "pending";
  // A paused agent is still alive — it is waiting, not finished. Never treat it
  // (or any status we do not recognise yet) as a failure, otherwise a live run
  // gets killed mid-task and returns no result at all.
  if (["paused", "pausing", "stopping", "waiting"].includes(s)) return "paused";
  return s ? "running" : "pending";
}

/** Pulls step/file info out of a provider payload without leaking its shape. */
function extractProgress(data: any): {
  status: string;
  progress: string | null;
  resultText: string | null;
  files: { id: string; name: string }[];
  events: {
    title: string;
    detail?: string;
    url?: string;
    kind: string;
    duration?: number;
    screenshot?: string;
  }[];

} {
  const status = normalizeStatus(data?.status, data?.isSuccess ?? data?.is_success);
  // Browser Use has shipped both camelCase and snake_case step payloads, and
  // sometimes nests them under `task`/`output`. Accept every shape so the
  // thinking trace is never empty while the agent is clearly working.
  const rawEvents: any[] = Array.isArray(data?.steps)
    ? data.steps
    : Array.isArray(data?.task?.steps)
      ? data.task.steps
      : Array.isArray(data?.history)
        ? data.history
        : [];
  console.log(
    `browser-use payload keys=${Object.keys(data ?? {}).join(",")} steps=${rawEvents.length}`,
  );
  // Two kinds of line per step: what the agent was thinking, and what it
  // actually did on the computer (opened a page, clicked, typed, extracted…).
  // Both are kept so the reader can follow the real work, not a summary.
  const describeAction = (raw: unknown): string => {
    let a = raw;
    if (typeof a === "string" && /^\s*[[{]/.test(a)) {
      try {
        a = JSON.parse(a);
      } catch {
        /* keep the string */
      }
    }
    if (typeof a === "string") return a.replace(/\s+/g, " ").trim().slice(0, 180);
    if (!a || typeof a !== "object") return "";
    const obj = a as Record<string, any>;
    const name = Object.keys(obj)[0];
    const args = (obj[name] ?? {}) as Record<string, any>;
    const val = (k: string) => (args && typeof args === "object" ? args[k] : undefined);
    const label = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 90);
    switch (name) {
      case "go_to_url":
      case "open_tab":
      case "navigate":
        return `Opened ${label(val("url"))}`;
      case "search_google":
      case "search":
        return `Searched for “${label(val("query"))}”`;
      case "click_element_by_index":
      case "click_element":
      case "click":
        return `Clicked ${label(val("element_text") || val("text") || `element ${val("index") ?? ""}`)}`;
      case "input_text":
      case "type":
        return `Typed “${label(val("text"))}”`;
      case "scroll":
      case "scroll_down":
      case "scroll_up":
        return "Scrolled the page";
      case "extract_structured_data":
      case "extract_content":
      case "extract":
      case "evaluate":
        return `Read the page for ${label(val("query") || "details")}`;
      case "write_file":
      case "save_file":
        return `Saved the file ${label(val("file_name") || val("path"))}`;
      case "read_file":
        return `Opened the file ${label(val("file_name") || val("path"))}`;
      case "execute_js":
      case "run_code":
      case "python":
        return "Ran code";
      case "switch_tab":
        return "Switched tab";
      case "wait":
        return "Waited for the page";
      case "done":
        return "Finished the task";
      default:
        return name ? `${name.replace(/_/g, " ")}` : "";
    }
  };

  const events = rawEvents
    .flatMap((e) => {
      const thought = String(
        e?.thought || e?.thinking || e?.nextGoal || e?.next_goal || e?.goal ||
          e?.evaluationPreviousGoal || e?.evaluation_previous_goal || e?.memory || "",
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 400);
      const url = typeof e?.url === "string" ? e.url : undefined;
      const shot = typeof e?.screenshotUrl === "string"
        ? e.screenshotUrl
        : typeof e?.screenshot_url === "string"
          ? e.screenshot_url
          : undefined;
      const seconds = Number(e?.duration ?? e?.durationSeconds ?? e?.elapsed ?? 0) || undefined;
      const out: {
        title: string;
        detail?: string;
        url?: string;
        kind: string;
        duration?: number;
        screenshot?: string;
      }[] = [];
      if (thought) {
        out.push({ title: thought, detail: url, url, kind: "thought", duration: seconds, screenshot: shot });
      }
      const actions = Array.isArray(e?.actions) ? e.actions : [];
      for (const a of actions) {
        const line = describeAction(a);
        if (line) out.push({ title: line, detail: url, url, kind: "action", screenshot: shot });
      }
      return out;
    })
    .filter((e) => !!e.title)
    .slice(-160);




  const rawFiles: any[] = Array.isArray(data?.outputFiles)
    ? data.outputFiles
    : Array.isArray((data as any)?.output_files)
      ? (data as any).output_files
      : [];
  const files = rawFiles
    .filter((f) => f?.id)
    .map((f) => ({ id: String(f.id), name: String(f?.fileName || f?.file_name || "file") }));


  const resultText = typeof data?.output === "string" && data.output ? data.output : null;

  const progress = events.length ? events[events.length - 1].title : null;
  return { status, progress, resultText, files, events };
}

/**
 * Turn fenced code blocks in a final answer into downloadable data-URL files.
 * A block is only exported when a filename is discoverable, either on the fence
 * info string (```html index.html) or on the line just above it.
 */
function inlineFilesFromText(text: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const lines = text.split("\n");
  const nameRe = /([\w.\-/]+\.(?:html?|css|js|jsx|ts|tsx|json|py|md|txt|csv|sql|sh|yml|yaml))/i;
  const extByLang: Record<string, string> = {
    html: "html", css: "css", js: "js", javascript: "js", ts: "ts", typescript: "ts",
    tsx: "tsx", jsx: "jsx", json: "json", python: "py", py: "py", md: "md",
    markdown: "md", sql: "sql", bash: "sh", sh: "sh", yaml: "yml", yml: "yml",
  };
  let i = 0;
  while (i < lines.length) {
    const fence = lines[i].match(/^\s*```+\s*(.*)$/);
    if (!fence) { i += 1; continue; }
    const info = (fence[1] || "").trim();
    const body: string[] = [];
    i += 1;
    while (i < lines.length && !/^\s*```/.test(lines[i])) { body.push(lines[i]); i += 1; }
    i += 1;
    const code = body.join("\n").trim();
    if (!code) continue;
    const above = lines.slice(Math.max(0, i - body.length - 4), Math.max(0, i - body.length - 1)).join(" ");
    const name =
      info.match(nameRe)?.[1] ||
      above.match(nameRe)?.[1] ||
      (extByLang[info.split(/\s+/)[0].toLowerCase()]
        ? `file-${out.length + 1}.${extByLang[info.split(/\s+/)[0].toLowerCase()]}`
        : "");
    if (!name) continue;
    out.push({ name, body: code });
    if (out.length >= 8) break;
  }
  return out;
}

const CONTENT_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8", md: "text/markdown; charset=utf-8",
  txt: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8",
  ts: "text/plain; charset=utf-8", tsx: "text/plain; charset=utf-8",
  jsx: "text/plain; charset=utf-8", py: "text/plain; charset=utf-8",
  sql: "text/plain; charset=utf-8", sh: "text/plain; charset=utf-8",
  yml: "text/plain; charset=utf-8", yaml: "text/plain; charset=utf-8",
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", zip: "application/zip",
};

const FILES_BUCKET = "agent-files";
/** A year: the chip has to keep working when the user reopens the chat later. */
const SIGNED_URL_TTL = 60 * 60 * 24 * 365;

/**
 * The upstream sandbox only accepts a short list of extensions, so a stylesheet
 * or a script often arrives as `style.txt`. Sniff the body and give the file the
 * extension it really has, otherwise previews and links are useless.
 */
function normalizeFileName(name: string, text: string | null): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext !== "txt" || !text) return name;
  const head = text.slice(0, 4000);
  const base = name.replace(/\.txt$/i, "");
  if (/<!doctype html|<html[\s>]|<body[\s>]/i.test(head)) return `${base}.html`;
  if (/^\s*[{[]/.test(head) && /["}\]]\s*$/.test(text.trim())) return `${base}.json`;
  if (/(^|\n)\s*(@media|@import|:root\b)|[.#]?[\w-]+\s*\{[^}]*:[^}]*;/.test(head)) {
    return `${base}.css`;
  }
  if (/\b(function|const|let|=>|document\.|window\.)\b/.test(head)) return `${base}.js`;
  return name;
}

/**
 * Store one produced file in our own bucket and hand back a long-lived link.
 * Upstream download URLs expire within minutes, which is why a reopened
 * conversation used to show file chips that no longer opened.
 */
async function storeFile(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  rawName: string,
  body: Uint8Array | string,
): Promise<{ name: string; url: string } | null> {
  let sniff: string | null = typeof body === "string" ? body : null;
  if (!sniff && rawName.toLowerCase().endsWith(".txt")) {
    try {
      sniff = new TextDecoder().decode(body as Uint8Array);
    } catch {
      sniff = null;
    }
  }
  const name = normalizeFileName(rawName, sniff);
  const ext = (name.split(".").pop() || "").toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  const path = `${userId}/${taskId}/${name.replace(/[^\w.\-]+/g, "_")}`;
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;

  const up = await supabase.storage
    .from(FILES_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (up.error) {
    console.error(`agent file upload failed: ${up.error.message}`);
    return null;
  }
  const signed = await supabase.storage.from(FILES_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  const url = signed.data?.signedUrl;
  return url ? { name, url } : null;
}




export async function handleComputerAgent(payload: ComputerPayload | null): Promise<ComputerResult> {
  if (!payload?.action) return { status: 400, body: { error: "Missing action" } };
  const supabase = admin();
  const user = await authenticate(supabase, payload.token);
  if (!user) return { status: 401, body: { error: "unauthorized" } };

  switch (payload.action) {
    case "create": {
      const prompt = (payload.prompt ?? "").trim();
      if (!prompt) return { status: 400, body: { error: "Missing prompt" } };
      const conversationId = payload.conversation_id ?? null;
      const memory = await loadMemory(supabase, user.id, conversationId);

      // Continuity: every message of the same app conversation runs inside the
      // SAME upstream browser session, so a follow-up continues the previous
      // work instead of opening a brand new conversation on the provider.
      let reuseSession: string | null = null;
      let reuseKeyRef: string | null = null;
      if (conversationId) {
        const { data: prev } = await supabase
          .from("computer_tasks")
          .select("provider_session_id,provider_key_ref")
          .eq("user_id", user.id)
          .eq("conversation_id", conversationId)
          .not("provider_session_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1);
        reuseSession = (prev?.[0]?.provider_session_id as string | undefined) || null;
        reuseKeyRef = (prev?.[0]?.provider_key_ref as string | undefined) || null;
      }


      const { data: inserted, error: insErr } = await supabase
        .from("computer_tasks")
        .insert({
          user_id: user.id,
          conversation_id: conversationId,
          message_id: payload.message_id ?? null,
          prompt,
          status: "pending",
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        return { status: 500, body: { error: insErr?.message || "insert_failed" } };
      }
      const taskId = inserted.id as string;

      const fullPrompt = memory
        ? `Context from earlier in this conversation:\n${memory}\n\n---\nTask:\n${prompt}`
        : prompt;

      // Browser Use rejects models that the account's plan does not include
      // (403 "not available on the free plan"), so always start from a
      // free-plan model and only then try the configured / premium ones.
      // A premium first attempt costs a full round-trip before the run starts.
      const FREE_PLAN_LLMS = ["bu-2-0-mini-preview", "browser-use-llm", "gemini-2.5-flash"];
      const configuredLlm = Deno.env.get("BROWSER_USE_LLM")?.trim() || undefined;
      const llmCandidates = [
        ...FREE_PLAN_LLMS,
        ...(configuredLlm && !FREE_PLAN_LLMS.includes(configuredLlm) ? [configuredLlm] : []),
        undefined,
      ];


      const startBody = (llm: string | undefined, session: string | null) => ({
        task: fullPrompt.slice(0, 50_000),
        llm,
        maxSteps: 100,
        vision: "auto",
        ...(session ? { sessionId: session } : {}),
      });

      // One-off tasks close their auto-created session when they finish. Create
      // an explicit keep-alive session so every follow-up in this app
      // conversation truly continues in the same upstream browser context.
      const createDurableSession = async (): Promise<any> => {
        const session = await callUpstream(supabase, {
          path: "/sessions",
          method: "POST",
          body: { keepAlive: true, persistMemory: true, enableRecording: false },
        });
        if (!session.ok) return session;
        const id = String(session.data?.id ?? session.data?.sessionId ?? "");
        if (!id) return { ok: false, status: 502, message: "session_id_missing" } as UpstreamFail;
        return { ...session, sessionId: id };
      };

      /**
       * Keep-alive sessions stay open after a task ends, so the account can hit
       * its concurrency ceiling. When that happens, close the sessions left
       * behind by this user's finished tasks and try once more instead of
       * showing a dead end.
       */
      const releaseIdleSessions = async () => {
        const { data: stale } = await supabase
          .from("computer_tasks")
          .select("id,provider_session_id,provider_key_ref")
          .eq("user_id", user.id)
          .in("status", ["done", "failed"])
          .not("provider_session_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(10);
        for (const row of stale ?? []) {
          const sid = row.provider_session_id as string;
          if (!sid || sid === reuseSession) continue;
          await callUpstream(
            supabase,
            { path: `/sessions/${sid}`, method: "PATCH", body: { action: "stop" } },
            (row.provider_key_ref as string | null) ?? null,
          );
          await supabase.from("computer_tasks").update({ provider_session_id: null }).eq("id", row.id);
        }
      };

      const sessionBusy = (m: string) => /concurrent active sessions|too many .*sessions/i.test(m);

      if (!reuseSession) {
        let durable = await createDurableSession();
        if (!durable.ok && sessionBusy((durable as UpstreamFail).message ?? "")) {
          await releaseIdleSessions();
          durable = await createDurableSession();
        }
        if (!durable.ok) {
          const fail = durable as UpstreamFail;
          await supabase
            .from("computer_tasks")
            .update({ status: "failed", error: "provider_error", updated_at: new Date().toISOString() })
            .eq("id", taskId);
          return {
            status: 200,
            body: {
              task_id: taskId,
              status: "failed",
              error: "provider_error",
              message: friendlyProviderMessage(fail.message),
            },
          };
        }
        reuseSession = durable.sessionId;
        reuseKeyRef = durable.key.id;
      }


      let res = await callUpstream(supabase, {
        path: "/tasks",
        method: "POST",
        body: startBody(llmCandidates[0], reuseSession),
      }, reuseKeyRef);
      // A reused session can be closed upstream; fall back to a fresh one
      // rather than failing the whole turn.
      if (!res.ok && reuseSession) {
        const durable = await createDurableSession();
        reuseSession = durable.ok ? durable.sessionId : null;
        reuseKeyRef = durable.ok ? durable.key.id : null;
        res = await callUpstream(supabase, {
          path: "/tasks",
          method: "POST",
          body: startBody(llmCandidates[0], reuseSession),
        }, reuseKeyRef);
      }
      for (let i = 1; i < llmCandidates.length && !res.ok; i += 1) {
        const failMsg = (res as UpstreamFail).message ?? "";
        if (!/not available on the|body.,.llm|Input should be/i.test(failMsg)) break;

        if (llmCandidates[i] === llmCandidates[0]) continue;
        res = await callUpstream(supabase, {
          path: "/tasks",
          method: "POST",
          body: startBody(llmCandidates[i], reuseSession),
        }, reuseKeyRef);
      }

      // The account can be at its session ceiling — free what earlier finished
      // tasks left open and start once more.
      if (!res.ok && sessionBusy((res as UpstreamFail).message ?? "")) {
        await releaseIdleSessions();
        const durable = await createDurableSession();
        if (durable.ok) {
          reuseSession = durable.sessionId;
          reuseKeyRef = durable.key.id;
          res = await callUpstream(supabase, {
            path: "/tasks",
            method: "POST",
            body: startBody(llmCandidates[0], reuseSession),
          }, reuseKeyRef);
        }
      }

      if (!res.ok) {
        const fail = res as UpstreamFail;
        const message =
          fail.status === 503
            ? "no_capacity"
            : fail.status === 429
              ? "rate_limited"
              : "provider_error";

        await supabase
          .from("computer_tasks")
          .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
          .eq("id", taskId);
        return {
          status: 200,
          body: {
            task_id: taskId,
            status: "failed",
            error: message,
            message: friendlyProviderMessage(fail.message) || message,
          },
        };
      }


      const providerId = String(
        res.data?.task_id ?? res.data?.id ?? res.data?.data?.task_id ?? res.data?.data?.id ?? "",
      );
      if (!providerId) {
        console.error(`browser-use create: no task id in ${JSON.stringify(res.data).slice(0, 500)}`);

        await supabase
          .from("computer_tasks")
          .update({ status: "failed", error: "provider_error", updated_at: new Date().toISOString() })
          .eq("id", taskId);
        return { status: 200, body: { task_id: taskId, status: "failed", error: "provider_error" } };
      }
      const createdSession =
        String(
          res.data?.sessionId ??
            res.data?.session_id ??
            res.data?.data?.sessionId ??
            res.data?.data?.session_id ??
            "",
        ) || reuseSession || null;
      await supabase
        .from("computer_tasks")
        .update({
          provider_task_id: providerId || null,
          provider_session_id: createdSession,
          provider_key_ref: res.key.id,

          // key_id is a uuid FK to manus_keys, so browser-use / shared-pool /
          // env keys stay null.
          key_id: /^[0-9a-f-]{36}$/i.test(res.key.id) && !res.key.id.startsWith("pool:")
            ? res.key.id
            : null,
          status: "running",
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      return { status: 200, body: { task_id: taskId, status: "running" } };
    }

    case "poll": {
      if (!payload.task_id) return { status: 400, body: { error: "Missing task_id" } };
      const { data: task } = await supabase
        .from("computer_tasks")
        .select("*")
        .eq("id", payload.task_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!task) return { status: 404, body: { error: "not_found" } };

      if (task.status === "done" || task.status === "failed" || !task.provider_task_id) {
        return { status: 200, body: { task: publicTask(task), events: await listEvents(supabase, task.id) } };
      }

      const res = await callUpstream(
        supabase,
        { path: `/tasks/${task.provider_task_id}`, method: "GET" },
        task.provider_key_ref ?? task.key_id,
      );
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        const patch = retryable
          ? { status: task.status, progress: task.progress, updated_at: new Date().toISOString() }
          : { status: "failed", error: res.message || "provider_error", updated_at: new Date().toISOString() };
        await supabase.from("computer_tasks").update(patch).eq("id", task.id);
        return {
          status: 200,
          body: { task: publicTask({ ...task, ...patch }), events: await listEvents(supabase, task.id) },
        };
      }

      const info = extractProgress(res.data);
      // A paused agent is resumed automatically so the task actually finishes
      // instead of silently sitting still until it looks dead.
      if (info.status === "paused") {
        const resumed = await callUpstream(
          supabase,
          {
            path: `/tasks/${task.provider_task_id}`,
            method: "PATCH",
            body: { action: "resume" },
          },
          task.provider_key_ref ?? task.key_id,
        );
        if (resumed.ok) info.status = "running";
      }
      let liveUrl: string | null = null;
      const sessionId = String(
        res.data?.sessionId ??
          res.data?.session_id ??
          res.data?.data?.sessionId ??
          res.data?.data?.session_id ??
          task.provider_session_id ??
          "",
      );
      if (sessionId && sessionId !== task.provider_session_id) {
        await supabase
          .from("computer_tasks")
          .update({ provider_session_id: sessionId })
          .eq("id", task.id);
      }
      if (sessionId && !["done", "failed"].includes(info.status)) {
        const session = await callUpstream(
          supabase,
          { path: `/sessions/${sessionId}`, method: "GET" },
          task.provider_key_ref ?? task.key_id,
        );
        if (session.ok) liveUrl = String(session.data?.liveUrl ?? session.data?.live_url ?? "") || null;
      }

      // Persist any new steps. Deduped on the line itself, so a long run whose
      // upstream step window has scrolled past never loses or repeats history.
      const existing = await listEvents(supabase, task.id);
      const seen = new Set(
        (existing as Array<{ title?: string; url?: string | null }>).map(
          (e) => `${e.title ?? ""}|${e.url ?? ""}`,
        ),
      );
      const fresh = info.events
        .filter((e) => !seen.has(`${e.title}|${e.url ?? ""}`))
        .map((e) => ({
          task_id: task.id,
          user_id: user.id,
          title: e.title,
          detail: e.detail ?? null,
          url: e.url ?? null,
          kind: e.kind,
          duration: e.duration ?? null,
          screenshot_url: e.screenshot ?? null,
        }));

      if (fresh.length) {
        const { error: evErr } = await supabase.from("computer_events").insert(fresh);
        if (evErr) console.error(`computer_events insert failed: ${evErr.message}`);
      }


      // Output files live upstream behind links that expire in minutes, so each
      // one is copied into our own storage and handed back as a durable link.
      const existingFiles: { name: string; url: string }[] = Array.isArray(task.files)
        ? (task.files as { name: string; url: string }[])
        : [];
      const resolvedFiles: { name: string; url: string }[] = [];
      for (const f of info.files) {
        if (existingFiles.some((e) => e.name === f.name && e.url.includes("/agent-files/"))) {
          resolvedFiles.push(existingFiles.find((e) => e.name === f.name)!);
          continue;
        }
        const dl = await callUpstream(
          supabase,
          { path: `/files/tasks/${task.provider_task_id}/output-files/${f.id}`, method: "GET" },
           task.provider_key_ref ?? task.key_id,
        );
        const url = dl.ok ? String((dl.data as any)?.downloadUrl ?? "") : "";
        if (!url) continue;
        const bytes = await fetch(url)
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .catch(() => null);
        const stored = bytes
          ? await storeFile(supabase, user.id, task.id, f.name, new Uint8Array(bytes))
          : null;
        resolvedFiles.push(stored ?? { name: f.name, url });
      }

      // Coding tasks often end with part of the code written straight into the
      // answer and no upstream artifact for it. Those blocks become real stored
      // files too, so nothing the agent produced is missing from the chat.
      if (info.resultText) {
        for (const inline of inlineFilesFromText(info.resultText)) {
          if (resolvedFiles.some((f) => f.name.toLowerCase() === inline.name.toLowerCase())) {
            continue;
          }
          const stored = await storeFile(supabase, user.id, task.id, inline.name, inline.body);
          if (stored && !resolvedFiles.some((f) => f.name === stored.name)) {
            resolvedFiles.push(stored);
          }
        }
      }



      const patch = {
        status: info.status,
        progress: info.progress,
        result_text: info.resultText ?? task.result_text,
        files: resolvedFiles.length ? resolvedFiles : task.files,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("computer_tasks").update(patch).eq("id", task.id);


      if (info.status === "done") {
        const memory = await loadMemory(supabase, user.id, task.conversation_id);
        const line = `- ${task.prompt.slice(0, 200)} → ${(info.resultText ?? "completed").slice(0, 400)}`;
        await saveMemory(supabase, user.id, task.conversation_id, `${memory}\n${line}`.trim());
      }

      return {
        status: 200,
        body: {
          task: { ...publicTask({ ...task, ...patch }), live_url: liveUrl },
          events: await listEvents(supabase, task.id),
        },
      };
    }

    case "stop": {
      if (!payload.task_id) return { status: 400, body: { error: "Missing task_id" } };
      const { data: task } = await supabase
        .from("computer_tasks")
        .select("id,provider_task_id,key_id,provider_key_ref")
        .eq("id", payload.task_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!task) return { status: 404, body: { error: "not_found" } };
      if (task.provider_task_id) {
        await callUpstream(
          supabase,
          {
            path: `/tasks/${task.provider_task_id}`,
            method: "PATCH",
            body: { action: "stop_task_and_session" },
          },
          task.provider_key_ref ?? task.key_id,
        );
      }
      await supabase
        .from("computer_tasks")
        .update({ status: "failed", error: "stopped", updated_at: new Date().toISOString() })
        .eq("id", task.id);
      return { status: 200, body: { ok: true } };
    }

    default:
      return { status: 400, body: { error: "Unknown action" } };
  }
}

function publicTask(task: any) {
  return {
    id: task.id,
    status: task.status,
    progress: task.progress ?? null,
    result_text: task.result_text ?? null,
    files: Array.isArray(task.files) ? task.files : [],
    error: task.error ?? null,
    prompt: task.prompt,
    created_at: task.created_at ?? null,
    updated_at: task.updated_at ?? null,
    provider_session_id: task.provider_session_id ?? null,
  };
}


async function listEvents(supabase: SupabaseClient, taskId: string) {
  const { data } = await supabase
    .from("computer_events")
    .select("id,title,detail,url,created_at,kind,duration,screenshot_url")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  return data ?? [];
}
