/**
 * @doc Sidebar task indicators.
 *
 * A cloud-agent task keeps running on the provider even when the user closes
 * the site. This hook asks the database which conversations still have work in
 * flight (yellow moving star) and which ones finished recently (quiet blue dot),
 * so the sidebar can show that state as soon as the user comes back.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TaskIndicator = "running" | "done";

const RECENT_DONE_MS = 24 * 60 * 60 * 1000;
const POLL_MS = 20_000;

export function useTaskIndicators(): Record<string, TaskIndicator> {
  const [map, setMap] = useState<Record<string, TaskIndicator>>({});

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const since = new Date(Date.now() - RECENT_DONE_MS).toISOString();
        const { data } = await supabase
          .from("computer_tasks")
          .select("conversation_id,status,updated_at")
          .eq("user_id", user.id)
          .not("conversation_id", "is", null)
          .gte("updated_at", since)
          .order("updated_at", { ascending: false })
          .limit(200);
        if (cancelled) return;
        const next: Record<string, TaskIndicator> = {};
        for (const row of data ?? []) {
          const cid = String((row as { conversation_id?: string }).conversation_id || "");
          if (!cid) continue;
          const status = String((row as { status?: string }).status || "");
          const running = status === "pending" || status === "running" || status === "paused";
          if (running) next[cid] = "running";
          else if (!next[cid]) next[cid] = "done";
        }
        setMap(next);
      } catch {
        /* the indicator is decorative — never break the sidebar */
      } finally {
        if (!cancelled) timer = setTimeout(load, POLL_MS);
      }
    };

    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return map;
}
