/**
 * Shared helpers for the `background_jobs` table used by the docs / slides
 * background job runners (`docs-generate`, `chat-slides-stream`).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, idempotency-key, x-idempotency-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Verifies the caller's JWT and returns the user, or null. */
export async function getCallerUser(db: ReturnType<typeof admin>, req: Request) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

export type JobKind = "docs" | "slides";

export async function createJob(
  db: ReturnType<typeof admin>,
  args: {
    userId: string;
    kind: JobKind;
    conversationId?: string | null;
    messageId?: string | null;
    input: Record<string, unknown>;
  },
): Promise<string> {
  const { data, error } = await db
    .from("background_jobs")
    .insert({
      user_id: args.userId,
      kind: args.kind,
      conversation_id: args.conversationId ?? null,
      message_id: args.messageId ?? null,
      status: "running",
      phase: "start",
      progress: 1,
      status_text: "Starting…",
      input: args.input,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateJob(
  db: ReturnType<typeof admin>,
  jobId: string,
  patch: Record<string, unknown>,
) {
  await db
    .from("background_jobs")
    .update({ ...patch, last_heartbeat_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

export async function appendStream(
  db: ReturnType<typeof admin>,
  jobId: string,
  chunk: string,
) {
  // Read-modify-write; job rows are only ever written by the single worker
  // that owns them so this is safe without extra locking.
  const { data } = await db.from("background_jobs").select("stream_text").eq("id", jobId).single();
  const next = ((data?.stream_text as string) || "") + chunk;
  await updateJob(db, jobId, { stream_text: next });
}

export async function finishJob(
  db: ReturnType<typeof admin>,
  jobId: string,
  output: Record<string, unknown>,
) {
  await updateJob(db, jobId, {
    status: "done",
    progress: 100,
    phase: "done",
    status_text: "Done",
    output,
    finished_at: new Date().toISOString(),
  });
}

export async function failJob(db: ReturnType<typeof admin>, jobId: string, message: string) {
  await updateJob(db, jobId, {
    status: "error",
    error: message.slice(0, 2000),
    status_text: "Failed",
    finished_at: new Date().toISOString(),
  });
}

/** Runs `work` after the response is sent, keeping the isolate alive. */
export function background(work: Promise<unknown>) {
  const anyEdge = (globalThis as any).EdgeRuntime;
  if (anyEdge?.waitUntil) {
    anyEdge.waitUntil(work);
  } else {
    // Local/dev fallback — best effort only.
    void work;
  }
}
