/**
 * @doc Browser-Use style activity trace for cloud agent tasks.
 *
 * While the agent works the list is always visible — no toggle to press. Every
 * line carries its own icon (thinking, opened, clicked, typed, scrolled, read,
 * saved, ran code, waited, finished) so the sequence reads cleanly.
 * Once the task finishes the whole history collapses behind a single
 * "Worked for …" button, and nothing is ever thrown away.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownWideNarrow,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Globe,
  Keyboard,
  MousePointerClick,
  Save,
  Search,
  Terminal,
  Wrench,
} from "lucide-react";
import type { ComputerEvent } from "@/lib/computer/client";
import MegsyStar from "@/components/branding/MegsyStar";
import { cn } from "@/lib/utils";

interface Props {
  events: ComputerEvent[];
  running: boolean;
  status?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  liveUrl?: string | null;
  /** Coding runs start with the computer screen hidden. */
  screenDefaultOpen?: boolean;
  className?: string;
}


function formatDuration(ms: number): string {
  const total = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const isNoise = (line: string) =>
  !line ||
  line.length < 2 ||
  /^\s*[[{]/.test(line) ||
  /^(checkpoint|state|error|traceback)\b/i.test(line);

/** One icon per kind of step, matched on the action wording the kernel emits. */
function stepIcon(title: string, kind: string) {
  if (kind === "thought") return Brain;
  const t = title.toLowerCase();
  if (/^(searched|search)/.test(t)) return Search;
  if (/^(opened|open|navigat|went|visited|switched tab)/.test(t)) return Globe;
  if (/^(clicked|click|tapped|selected)/.test(t)) return MousePointerClick;
  if (/^(typed|type|filled|entered|wrote)/.test(t)) return Keyboard;
  if (/^(scrolled|scroll)/.test(t)) return ArrowDownWideNarrow;
  if (/^(read|extracted|found)/.test(t)) return BookOpen;
  if (/^(saved|downloaded|uploaded|wrote file)/.test(t)) return Save;
  if (/^(ran code|ran|executed|code)/.test(t)) return Terminal;
  if (/^(waited|wait)/.test(t)) return Clock;
  if (/^(finished|done|completed)/.test(t)) return CheckCircle2;
  return Wrench;
}

export default function AgentTrace({
  events,
  running,
  status,
  startedAt,
  endedAt,
  liveUrl,
  screenDefaultOpen = true,
  className,
}: Props) {
  // Finished runs start collapsed behind the "Worked for …" button.
  const [open, setOpen] = useState(false);
  const [screenOpen, setScreenOpen] = useState(screenDefaultOpen);
  const listRef = useRef<HTMLDivElement | null>(null);


  // Auto-follow the newest line while the agent is working.
  useEffect(() => {
    if (!running) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length, running]);

  const rows = useMemo(
    () => events.filter((e) => !isNoise((e.title ?? "").trim())),
    [events],
  );

  const elapsedMs = useMemo(() => {
    const start = startedAt ? new Date(startedAt).getTime() : NaN;
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return end - start;
  }, [startedAt, endedAt]);

  const lastShot = useMemo(
    () => [...rows].reverse().find((e) => e.screenshot_url)?.screenshot_url || null,
    [rows],
  );

  if (rows.length === 0 && !running) return null;

  const showList = running || open;

  const list = (
    <div
      ref={listRef}
      className={cn(
        "max-h-[420px] overflow-y-auto border-s border-border/50 ps-3 [scrollbar-width:thin]",
        running ? "mt-1" : "mt-2",
      )}
    >
      <div className="space-y-2">
        {rows.map((e) => {
          const kind = (e.kind ?? "thought") === "thought" ? "thought" : "action";
          const Icon = stepIcon(e.title || "", kind);
          const dur = Number(e.duration ?? 0);
          return (
            <div key={e.id} className="flex items-start gap-2">
              <Icon
                className={cn(
                  "mt-[3px] h-3.5 w-3.5 shrink-0",
                  kind === "thought" ? "text-muted-foreground/60" : "text-primary/70",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                {kind === "thought" ? (
                  <>
                    <p className="text-[13px] italic leading-relaxed text-muted-foreground">
                      {e.title}
                    </p>
                    {dur > 0 && (
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground/60">
                        Thought for {Math.round(dur)}s
                      </p>
                    )}
                  </>
                ) : e.url ? (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[13px] leading-relaxed text-foreground/85 hover:underline"
                  >
                    {e.title}
                  </a>
                ) : (
                  <span className="block break-words text-[13px] leading-relaxed text-foreground/85">
                    {e.title}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {running && (
          <div className="flex items-center gap-2 pt-0.5 text-[13px] text-muted-foreground">
            <MegsyStar
              className="h-3.5 w-3.5 shrink-0 text-[var(--megsy-blue)] motion-safe:animate-pulse"
              aria-hidden
            />
            <span className="ai-shimmer font-medium motion-reduce:animate-none">
              {status?.trim() || "Thinking…"}
            </span>
          </div>
        )}

      </div>
    </div>
  );

  const screen = (lastShot || liveUrl) && (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setScreenOpen((v) => !v)}
        className="mb-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {screenOpen ? "إخفاء الكمبيوتر" : "إظهار الكمبيوتر"}
      </button>
      {screenOpen && (
        <div className="overflow-hidden rounded-xl border border-border/50 bg-foreground/[0.03]">
          {lastShot ? (
            <img
              src={lastShot}
              alt=""
              loading="lazy"
              className="max-h-56 w-full object-cover object-top"
            />
          ) : (
            <iframe
              src={liveUrl!}
              title=""
              className="h-56 w-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("my-3 w-full", className)}>
      {/* While the agent works the steps stand on their own — no button. The
          "Worked for …" toggle only appears once the run has finished. */}
      {!running && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <MegsyStar className="h-3.5 w-3.5 shrink-0 text-[var(--megsy-blue)]" aria-hidden />
          <span>{elapsedMs ? `Worked for ${formatDuration(elapsedMs)}` : "Worked"}</span>
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          )}
        </button>
      )}

      {showList && list}
      {(running || open) && screen}
    </div>
  );
}

