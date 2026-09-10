/**
 * @doc Lightweight, self-hosted visitor tracking.
 *
 * Every route change opens a `page_views` row and closes it (with a duration)
 * when the user leaves the page or the tab. No third-party script, no cookies
 * beyond one anonymous id in localStorage, and no personal data — just enough to
 * answer "how many visitors, which pages, how long" in the admin Telegram bot.
 */
import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "megsy_visitor_id";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function visitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const fresh = newId();
    localStorage.setItem(VISITOR_KEY, fresh);
    return fresh;
  } catch {
    return newId();
  }
}

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem("megsy_session_id");
    if (existing) return existing;
    const fresh = newId();
    sessionStorage.setItem("megsy_session_id", fresh);
    return fresh;
  } catch {
    return newId();
  }
}

let currentRowId: string | null = null;
let startedAt = 0;

/** Closes the open view with its duration. Safe to call repeatedly. */
export async function closePageView(): Promise<void> {
  const id = currentRowId;
  if (!id) return;
  currentRowId = null;
  const duration = Math.max(0, Date.now() - startedAt);
  try {
    await supabase
      .from("page_views")
      .update({ ended_at: new Date().toISOString(), duration_ms: duration })
      .eq("id", id);
  } catch {
    /* tracking must never break the app */
  }
}

/** Records a new page view for `path`, closing the previous one first. */
export async function trackPageView(path: string): Promise<void> {
  await closePageView();
  startedAt = Date.now();
  try {
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("page_views")
      .insert({
        visitor_id: visitorId(),
        session_id: sessionId(),
        path,
        referrer: document.referrer ? document.referrer.slice(0, 500) : null,
        user_agent: navigator.userAgent.slice(0, 300),
        user_id: auth?.user?.id ?? null,
      })
      .select("id")
      .maybeSingle();
    if (!error && data) currentRowId = (data as { id: string }).id;
  } catch {
    /* ignore */
  }
}
