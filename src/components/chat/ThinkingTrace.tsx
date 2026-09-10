import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import ToolIcon from "./primitives/ToolIcon";
import MegsyStar from "@/components/branding/MegsyStar";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { t as uiT, useUserLang } from "@/lib/authI18n";

export interface ThinkingTraceProps {
  /** Live status line — always the real current operation, never a placeholder. */
  status?: string;
  /** Ordered narration steps (deep research, tools, slides, media…). */
  steps?: string[];
  /** Raw reasoning tokens from the model. */
  text?: string;
  /** True while the turn is still running. */
  active?: boolean;
  /**
   * True only while a tool call is really executing. The Megsy star animates
   * exclusively during that window — never before the tool starts and never
   * after it settles.
   */
  running?: boolean;
  /** Real tool family currently executing — drives the row icon. */
  tool?: string | null;
  /**
   * "tools" renders the Manus-style used-tools timeline: a summary header plus
   * one icon-marked line per real step, kept in the chat after the run ends.
   */
  variant?: "default" | "tools";
  /** Start expanded (rarely needed — collapsed is the default look). */
  defaultOpen?: boolean;
  className?: string;
}

const RTL_LANGS = new Set(["ar", "ar-eg", "fa", "he"]);

/**
 * Icons are never guessed from the wording of a step. A tool icon appears only
 * for the step that is really running a known tool; every other step keeps a
 * neutral dot marker, so the timeline stays visually stable.
 */


/**
 * The single "AI thinking" surface used across chat, deep research, slides,
 * media and tool turns. Borderless, quiet grey, collapsible — the Megsy star
 * stays as the marker of the row. The headline is always a real backend signal
 * (activity events, tool calls, reasoning); there is no timed or rotating
 * placeholder, so a quiet moment shows the last real operation instead of a
 * fabricated one.
 */
const ThinkingTrace = ({
  status,
  steps,
  text,
  active,
  running,
  tool,
  variant = "default",
  defaultOpen,
  className = "",
}: ThinkingTraceProps) => {

  const lang = useUserLang();
  const [open, setOpen] = useState(!!defaultOpen);
  const rtl = RTL_LANGS.has(lang);
  const isAr = lang.startsWith("ar");

  // Keep every distinct line we ever saw this turn, so expanding the badge
  // always shows the real trace instead of an empty panel.
  const historyRef = useRef<string[]>([]);
  const [, forceRender] = useState(0);
  useEffect(() => {
    const incoming: string[] = [];
    for (const s of steps || []) {
      const v = String(s || "").trim();
      if (v) incoming.push(v);
    }
    const st = String(status || "").trim();
    if (st) incoming.push(st);
    let changed = false;
    for (const line of incoming) {
      const h = historyRef.current;
      if (h[h.length - 1] !== line && !h.includes(line)) {
        h.push(line);
        changed = true;
      }
    }
    if (historyRef.current.length > 60) {
      historyRef.current = historyRef.current.slice(-60);
      changed = true;
    }
    if (changed) forceRender((n) => n + 1);
  }, [steps, status]);

  // No elapsed-seconds counter in the UI — the trace shows real activity only.

  // Raw stream lines can carry tool markers or JSON fragments — never show
  // those. Also collapse whitespace so the trace reads as clean sentences.
  const clean = (raw: string): string => {
    let v = String(raw || "")
      .replace(/<\/?[a-z_]+(?:\s[^>]*)?>/gi, " ")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[*_`#]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (/^[[{]/.test(v) || /"(tool_call|function_call|arguments|parameters)"/.test(v)) return "";
    if (v.length > 220) v = `${v.slice(0, 220)}…`;
    return v;
  };

  const reasoningLines = useMemo(() => {
    if (!text?.trim()) return [] as string[];
    const out: string[] = [];
    for (const p of text.trim().split(/\n{2,}|\n/)) {
      const v = clean(p);
      if (v && out[out.length - 1] !== v) out.push(v);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Activity steps stay in the order they happened, deduped.
  const stepLines = useMemo(() => {
    const out: string[] = [];
    for (const raw of historyRef.current) {
      const v = clean(raw);
      if (v && !out.includes(v)) out.push(v);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyRef.current.length]);

  const lines = useMemo(
    () => [...stepLines, ...reasoningLines],
    [stepLines, reasoningLines],
  );


  const hasBody = lines.length > 0;
  const label = active ? uiT("thinking", lang) : uiT("thoughts", lang);

  // Live headline: newest real signal wins. With no signal yet we keep the
  // neutral label instead of inventing progress.
  const headline = useMemo(() => {
    if (!active) return label;
    const live =
      String(status || "").trim() ||
      historyRef.current[historyRef.current.length - 1] ||
      reasoningLines[reasoningLines.length - 1] ||
      "";
    if (live) return live.length > 90 ? `${live.slice(0, 90)}…` : live;
    return label;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, status, label, reasoningLines, historyRef.current.length]);

  // Nothing to show at all.
  if (!hasBody && !active) return null;

  const pulse = running ? "motion-safe:animate-pulse" : "";

  // ── Used-tools timeline (computer / coding / long tasks) ──────────────────
  if (variant === "tools" || variant === "default") {
    const summary = isAr
      ? `الأدوات المستخدمة · ${stepLines.length} ${stepLines.length === 1 ? "خطوة" : "خطوات"}`
      : `Thinking · ${stepLines.length} ${stepLines.length === 1 ? "step" : "steps"}`;

    return (
      <div className={`mb-3 min-w-0 overflow-hidden ${className}`} dir={rtl ? "rtl" : undefined} data-tool-timeline>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 text-start text-[12px] text-muted-foreground shadow-none"
        >
          {active ? (
            <MegsyStar className={`h-3.5 w-3.5 shrink-0 text-[var(--megsy-gold)] ${pulse}`} />
          ) : (
            <BrandLogo className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className={`min-w-0 flex-1 truncate ${active ? "ai-shimmer motion-reduce:animate-none" : ""}`} aria-live="polite">
            {active ? headline : summary}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>

        {(open || active) && stepLines.length > 0 && (
          <ol className="mt-4 flex min-w-0 flex-col gap-5 border-s border-primary/25 ps-5">
            {stepLines.map((line, i) => {
              const isCurrent = !!active && i === stepLines.length - 1;
              const showTool = isCurrent && !!running && !!tool;
              return (
                <li
                  key={`t-${i}-${line.slice(0, 24)}`}
                  className="flex min-w-0 items-start gap-3 text-[12.5px] leading-relaxed text-muted-foreground"
                >
                  <span
                    aria-hidden
                    className={`-ms-[27px] mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border bg-background ${isCurrent ? "border-primary/70 text-primary" : "border-border/70 text-muted-foreground"}`}
                  >
                    {showTool ? (
                      <ToolIcon name={tool as string} size={11} />
                    ) : (
                      <span className={`h-[5px] w-[5px] rounded-full ${isCurrent ? "bg-primary" : "bg-border"}`} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{line}</span>
                </li>
              );
            })}
          </ol>
        )}

        {(open || active) && reasoningLines.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5 border-t border-border/40 pt-2">
            {/* While the turn runs we show the latest thinking lines without
                asking the user to expand anything; the full trace stays
                available on expand. */}
            {(open ? reasoningLines : reasoningLines.slice(-6)).map((line, i) => (
              <p key={`tr-${i}`} className="text-[12.5px] leading-relaxed text-muted-foreground/90 break-words">
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }



  return (
    <div className={`mb-3 rounded-[8px] bg-muted/35 px-3 py-2 ${className}`} dir={rtl ? "rtl" : undefined}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-start shadow-none"
      >
        {active ? (
          running && tool ? (
            <ToolIcon
              name={tool}
              size={14}
              className={`text-[var(--megsy-blue)] ${pulse}`}
            />
          ) : (
            <MegsyStar className={`h-3.5 w-3.5 shrink-0 text-[var(--megsy-blue)] ${pulse}`} />
          )
        ) : (
          <BrandLogo className="h-3.5 w-3.5 shrink-0" />
        )}

        <span
          className={`truncate text-[13px] ${

            active ? "ai-shimmer font-medium motion-reduce:animate-none" : "text-muted-foreground"
          }`}
          aria-live="polite"
        >
          {headline}
        </span>
        <span className="ms-auto grid h-6 w-6 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-foreground">
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="mt-3 max-h-80 overflow-y-auto border-s border-primary/30 ps-4 py-1">
          <div className="flex flex-col gap-3">
            {stepLines.length > 0 && (
              <ol className="flex flex-col gap-2">
                {stepLines.map((line, i) => {
                  const isCurrent = !!active && i === stepLines.length - 1;
                  const showTool = isCurrent && !!running && !!tool;
                  return (
                    <li
                      key={`s-${i}-${line.slice(0, 24)}`}
                      className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted-foreground"
                    >
                      <span
                        aria-hidden
                        className={`-ms-[22px] mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border bg-background ${isCurrent ? "border-primary/50 text-primary" : "border-border/70 text-muted-foreground"}`}
                      >
                        {showTool ? (
                          <ToolIcon name={tool as string} size={11} />
                        ) : (
                          <Check className="h-3 w-3" strokeWidth={2.6} />
                        )}
                      </span>
                      <span className="min-w-0 break-words">{line}</span>
                    </li>
                  );
                })}
              </ol>
            )}
            {reasoningLines.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-border/40 pt-2.5">
                {reasoningLines.map((line, i) => (
                  <p
                    key={`r-${i}-${line.slice(0, 24)}`}
                    className="text-[12.5px] leading-relaxed text-muted-foreground/90 break-words"
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
            {!hasBody && (

              <div className="text-[12.5px] text-muted-foreground">
                {isAr ? "لا توجد تفاصيل بعد…" : "No details yet…"}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default memo(ThinkingTrace);
