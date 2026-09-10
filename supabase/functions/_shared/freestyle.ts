/**
 * @doc Freestyle (dash.freestyle.sh) client for the edge runtime.
 *
 * Deno port of `src/lib/devagent/freestyle.ts`, trimmed to what the chat agent
 * needs: boot a VM, write the generated project into it, serve it, and route a
 * free `*.style.dev` HTTPS domain to the port so the user gets one clean,
 * ready-to-open link.
 *
 * Keys come from (in order): the `freestyle_keys` table, the shared
 * `provider_api_keys` pool (provider `f`), then the `FREESTYLE_API_KEY` secret.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const API_BASE = Deno.env.get("FREESTYLE_API_BASE") || "https://api.freestyle.sh";

export class FreestyleError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "FreestyleError";
    this.status = status;
  }
}

function rotatable(status: number) {
  return status === 401 || status === 402 || status === 403 || status === 429 || status >= 500;
}

function label(n = 6) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < n; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/** Every active Freestyle key, best first. */
export async function freestyleKeys(admin: SupabaseClient | null): Promise<string[]> {
  const keys: string[] = [];
  if (admin) {
    const { data } = await admin
      .from("freestyle_keys")
      .select("api_key,status,priority,last_used_at")
      .eq("status", "active");
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      const key = String(row.api_key ?? "").trim();
      if (key) keys.push(key);
    }
    const { data: pool } = await admin
      .from("provider_api_keys")
      .select("api_key,status")
      .eq("provider", "f")
      .eq("status", "active");
    for (const row of (pool ?? []) as Array<Record<string, unknown>>) {
      const key = String(row.api_key ?? "").trim();
      if (key) keys.push(key);
    }
  }
  const env = Deno.env.get("FREESTYLE_API_KEY");
  if (env) keys.push(env.trim());
  return [...new Set(keys.filter(Boolean))];
}

export class Freestyle {
  private keys: string[] | null = null;
  constructor(private admin: SupabaseClient | null) {}

  private async pool(): Promise<string[]> {
    if (!this.keys) this.keys = await freestyleKeys(this.admin);
    if (!this.keys.length) {
      throw new FreestyleError(503, "No Freestyle API key is configured (FREESTYLE_API_KEY).");
    }
    return this.keys;
  }

  async request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    timeoutMs = 120_000,
    rawBody?: Uint8Array,
  ): Promise<T> {
    const keys = await this.pool();
    let lastStatus = 500;
    let lastMessage = "Freestyle request failed";
    for (const key of keys) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(`${API_BASE}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": rawBody ? "application/octet-stream" : "application/json",
          },
          body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
          signal: controller.signal,
        });
        const text = await resp.text();
        let data: unknown = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { message: text };
        }
        if (resp.ok) return data as T;
        lastStatus = resp.status;
        lastMessage =
          (data as { message?: string }).message ||
          (data as { error?: string }).error ||
          text.slice(0, 300) ||
          `HTTP ${resp.status}`;
        if (!rotatable(resp.status)) throw new FreestyleError(lastStatus, lastMessage);
      } catch (error) {
        if (error instanceof FreestyleError) throw error;
        lastStatus = 599;
        lastMessage = error instanceof Error ? error.message : String(error);
      } finally {
        clearTimeout(timer);
      }
    }
    throw new FreestyleError(lastStatus, lastMessage);
  }

  async createVm(displayName = "megsy-agent"): Promise<string> {
    const body = {
      firewall: { rules: [{ action: "allow", source: {}, destination: { public: true } }] },
      idleTimeoutSeconds: 3600,
      displayName,
    };
    const data = await this.request<{ id: string }>("POST", "/v5/vms", body);
    return data.id;
  }

  async waitForRunning(vmId: string, timeoutMs = 90_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let state = "unknown";
    while (Date.now() < deadline) {
      const info = await this.request<Record<string, unknown>>(
        "GET",
        `/v5/vms/${encodeURIComponent(vmId)}`,
      );
      state = String(info.state ?? "unknown");
      if (state === "running") return;
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new FreestyleError(504, `VM never reached running state (last: ${state})`);
  }

  /**
   * Guest file write: `PUT /fs/write` takes the bytes as the body, with the
   * destination path and a content digest as query parameters.
   */
  async writeFile(vmId: string, path: string, content: string): Promise<void> {
    const bytes = new TextEncoder().encode(content);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const query = `?path=${encodeURIComponent(path)}&sha256=${sha256}`;
    await this.request(
      "PUT",
      `/v5/vms/${encodeURIComponent(vmId)}/fs/write${query}`,
      undefined,
      120_000,
      bytes,
    );
  }

  async exec(
    vmId: string,
    command: string,
    timeoutMs = 240_000,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const clamped = Math.min(timeoutMs, 280_000);
    const data = await this.request<{
      stdout?: string | null;
      stderr?: string | null;
      statusCode?: number | null;
    }>(
      "POST",
      `/v5/vms/${encodeURIComponent(vmId)}/exec-await`,
      { command, timeoutMs: clamped },
      clamped + 20_000,
    );
    return {
      stdout: data.stdout ?? "",
      stderr: data.stderr ?? "",
      exitCode: data.statusCode ?? 124,
    };
  }

  /** Routes a public `*.style.dev` name to a port inside the VM. */
  async exposePort(vmId: string, port: number, subdomain?: string): Promise<string> {
    const domain = `${subdomain ?? `megsy-${label()}`}.style.dev`;
    try {
      await this.request("POST", "/v5/tls", {
        action: "allow",
        domain,
        source: { public: true },
        destination: { vmId, port },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/taken|conflict|already|409|in use/i.test(message)) throw error;
    }
    return domain;
  }
}

/** Dependency-free static server written into every deployment. */
const STATIC_SERVER = `import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
const ROOT = "/app/public";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2" };
async function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\\.\\.[/])+/, "");
  const candidates = [join(ROOT, clean)];
  if (!extname(clean)) candidates.push(join(ROOT, clean, "index.html"));
  candidates.push(join(ROOT, "index.html"));
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {}
  }
  return null;
}
createServer(async (req, res) => {
  const file = await resolve(req.url || "/");
  if (!file) { res.writeHead(404, { "content-type": "text/plain" }); res.end("Not found"); return; }
  const body = await readFile(file);
  res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  res.end(body);
}).listen(3000, "0.0.0.0");
`;

export type DeployFile = { path: string; content: string };

export type DeployResult = { url: string; vmId: string; files: string[] };

/**
 * Deploys a self-contained static site (HTML/CSS/JS, CDN frameworks welcome)
 * and returns the public HTTPS URL. Files are written under `/app/public`.
 */
export async function deployStaticSite(
  admin: SupabaseClient | null,
  files: DeployFile[],
  opts: { subdomain?: string; displayName?: string } = {},
): Promise<DeployResult> {
  const clean = files
    .map((file) => ({
      path: String(file.path || "").replace(/^[./]+/, "").trim(),
      content: String(file.content ?? ""),
    }))
    .filter((file) => file.path && !file.path.includes(".."))
    .slice(0, 40);
  if (!clean.length) throw new FreestyleError(400, "No files to deploy");
  if (!clean.some((file) => /^index\.html$/i.test(file.path))) {
    throw new FreestyleError(400, "A root index.html is required");
  }

  const client = new Freestyle(admin);
  const started = Date.now();
  const stage = (name: string) => console.log(`freestyle deploy: ${name} (+${Date.now() - started}ms)`);
  stage("creating vm");
  const vmId = await client.createVm(opts.displayName ?? "megsy-site");
  stage(`vm ${vmId} created`);
  await client.waitForRunning(vmId);
  stage("vm running");
  await client.exec(vmId, "mkdir -p /app/public", 60_000);
  for (const file of clean) {
    await client.writeFile(vmId, `/app/public/${file.path}`, file.content);
  }
  stage("files written");
  // The base image is a plain Ubuntu, so the serving runtime is discovered
  // rather than assumed: python3 ships with the image, node only sometimes.
  const probeRuntime = await client.exec(
    vmId,
    "command -v python3 || true; command -v node || true",
    60_000,
  );
  const hasPython = /python3/.test(probeRuntime.stdout);
  let serveCmd: string;
  if (hasPython) {
    // No pkill here: `pkill -f` would match this very shell command line and
    // terminate the exec session before the server is ever probed.
    serveCmd =
      "cd /app/public && (setsid nohup python3 -m http.server 3000 --bind 0.0.0.0 > /tmp/server.log 2>&1 &)";
  } else {
    await client.writeFile(vmId, "/app/server.mjs", STATIC_SERVER);
    serveCmd =
      "cd /app && (setsid nohup node /app/server.mjs > /tmp/server.log 2>&1 &)";
  }
  const boot = await client.exec(
    vmId,
    `${serveCmd} ; for i in $(seq 1 15); do curl -sf -o /dev/null http://127.0.0.1:3000/ && echo UP && exit 0; sleep 1; done; cat /tmp/server.log; exit 1`,
    90_000,
  );
  if (boot.exitCode !== 0 || !/UP/.test(boot.stdout)) {
    throw new FreestyleError(
      500,
      `site server never came up: ${(boot.stdout + boot.stderr).slice(-300)}`,
    );
  }
  stage("server up");
  const domain = await client.exposePort(vmId, 3000, opts.subdomain);
  const url = `https://${domain}`;
  // The edge certificate needs a moment before the first request succeeds.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const probe = await fetch(url, { method: "GET", redirect: "follow" });
      if (probe.ok) break;
    } catch { /* not routed yet */ }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return { url, vmId, files: clean.map((file) => file.path) };
}
