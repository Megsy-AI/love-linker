/** @doc Browser client for the Computer Agent (Supabase edge function `computer-agent`). */
import { supabase } from "@/integrations/supabase/client";
import { edgeAnonKey, edgeUrl } from "@/lib/edgeRuntime";

export interface ComputerFile {
  name: string;
  url: string;
  type?: string;
}

export interface ComputerTask {
  id: string;
  status: "pending" | "running" | "done" | "failed" | string;
  progress: string | null;
  result_text: string | null;
  files: ComputerFile[];
  error: string | null;
  prompt: string;
  live_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  provider_session_id?: string | null;
}

export interface ComputerEvent {
  id: string;
  title: string;
  detail: string | null;
  url: string | null;
  created_at: string;
  kind?: string | null;
  duration?: number | null;
  screenshot_url?: string | null;
}


const SIGN_IN_MESSAGE = "سجّل الدخول أولاً لتشغيل مهام الكمبيوتر. / Please sign in to run computer tasks.";

const SUPABASE_ANON_KEY = edgeAnonKey("computer-agent");
const COMPUTER_AGENT_URL = edgeUrl("computer-agent");


async function call<T>(body: Record<string, unknown>): Promise<T> {
  let { data: sess } = await supabase.auth.getSession();
  let token = sess.session?.access_token;
  if (!token) {
    // Session may still be rehydrating or the access token expired.
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed.session?.access_token;
  }
  if (!token) {
    // Visitors who have not signed up still get the agent: a throwaway
    // anonymous identity carries the same RLS scoping without a signup wall.
    const { data: anon } = await supabase.auth.signInAnonymously();
    token = anon.session?.access_token;
  }
  if (!token) throw new Error(SIGN_IN_MESSAGE);

  const resp = await fetch(COMPUTER_AGENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ ...body, token }),
  });
  const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
  if (resp.status === 401) throw new Error(SIGN_IN_MESSAGE);
  if (!resp.ok) throw new Error((data.error as string) || `HTTP ${resp.status}`);
  return data as T;

}

export function createComputerTask(input: {
  prompt: string;
  conversation_id?: string | null;
  message_id?: string | null;
  attachments?: string[];
}) {
  return call<{ task_id: string; status: string; error?: string; message?: string }>({
    action: "create",
    ...input,
  });
}

export function pollComputerTask(taskId: string) {
  return call<{ task: ComputerTask; events: ComputerEvent[] }>({ action: "poll", task_id: taskId });
}

export function stopComputerTask(taskId: string) {
  return call<{ ok: boolean }>({ action: "stop", task_id: taskId });
}

/** Human-friendly message for backend failure codes (no provider names). */
export function computerErrorMessage(
  code: string | null | undefined,
  providerMessage?: string | null,
): string {
  switch (code) {
    case "no_capacity":
      return "Computer agent is unavailable right now. Please try again shortly.";
    case "rate_limited":
      return "Too many computer tasks at once — try again in a minute.";
    case "stopped":
      return "Task stopped.";
    case "provider_error":
      return providerMessage?.trim() || "The computer task couldn't be started. Please try again.";
    default:
      return providerMessage?.trim() || code || "";
  }
}
