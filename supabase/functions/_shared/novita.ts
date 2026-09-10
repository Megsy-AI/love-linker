/**
 * @doc Novita Sandbox helpers for the OpenManus agent runtime.
 *
 * The real OpenManus repository runs inside a Novita sandbox built from the
 * `megsy-openmanus` template (Python 3.11 + the upstream repo + Chromium already
 * installed), so a task starts in seconds instead of installing dependencies.
 *
 * The official `novita-sandbox` SDK is used through a Deno `npm:` specifier, so
 * no REST paths are hand-rolled here.
 *
 * Secret: `NOVITA_API_KEY`. Optional: `MANUS_TEMPLATE_ID` (rebuilt template),
 * `MANUS_SANDBOX_TTL_MS`.
 */
import { Sandbox } from "npm:novita-sandbox@2.1.0";

/** Template built from the OpenManus repo. */
export const TEMPLATE_ID = Deno.env.get("MANUS_TEMPLATE_ID") || "zoqc62arzviqz75ceswp";

/** How long a sandbox stays alive without being extended. */
export const SANDBOX_TTL_MS = Number(Deno.env.get("MANUS_SANDBOX_TTL_MS") ?? 3_600_000);

export function novitaKey(): string {
  return (Deno.env.get("NOVITA_API_KEY") ?? "").trim();
}

export function hasNovita(): boolean {
  return novitaKey().length > 12;
}

function opts() {
  return { apiKey: novitaKey() };
}

/** Starts a sandbox from the OpenManus template with the run's env injected. */
export async function createSandbox(envs: Record<string, string>) {
  return await Sandbox.create(TEMPLATE_ID, {
    ...opts(),
    timeoutMs: SANDBOX_TTL_MS,
    envs,
    metadata: { app: "megsy", agent: "openmanus" },
  });
}

/** Reattaches to a sandbox started by an earlier invocation. */
export async function connectSandbox(sandboxId: string) {
  return await Sandbox.connect(sandboxId, opts());
}

export async function killSandbox(sandboxId: string): Promise<void> {
  try {
    await Sandbox.kill(sandboxId, opts());
  } catch (error) {
    console.error("novita kill failed", error);
  }
}

export type { Sandbox };
