import { useMemo } from "react";

export type StepItem = {
  index: number;
  /** Short human name of the step ("Research the market"). */
  title: string;
  /** Optional explanation shown under the name. */
  detail?: string;
  text: string;
};

/**
 * Step cards are an explicit AI tool — they only render when the assistant
 * emits a fenced block with the `steps` language tag, for example:
 *
 *   ```steps
 *   Define the target audience
 *   Choose the channels
 *   Build a 30-day calendar
 *   ```
 *
 * Each non-empty line inside the block becomes one card. The block is
 * stripped from the surrounding markdown so it renders as cards only.
 * We never auto-detect numbered lists — the model has full control.
 */
const STEPS_BLOCK_RE = /```steps\s*\n([\s\S]*?)\n?```/gi;

export function parseSteps(raw: string): { steps: StepItem[]; remaining: string } {
  if (!raw || typeof raw !== "string") return { steps: [], remaining: raw || "" };
  STEPS_BLOCK_RE.lastIndex = 0;
  const match = STEPS_BLOCK_RE.exec(raw);
  if (!match) return { steps: [], remaining: raw };

  const inner = match[1] || "";
  const lines = inner
    .split("\n")
    .map((l) => l.replace(/^\s*[-*•]\s+/, "").trim())
    .filter(Boolean);

  if (lines.length < 1) return { steps: [], remaining: raw };

  // A step line may name the task and then explain it:
  //   "Collect the sources — search 5 credible outlets"
  // We show the name as the card's headline and the rest as its detail, so the
  // cards read as real task names instead of raw "step 1" rows.
  const steps: StepItem[] = lines.map((text, i) => {
    const m = text.match(/^\s*(?:\d+[.)]\s*)?(.{2,70}?)\s*(?:—|–|-{1,2}|:)\s+(.+)$/);
    const title = (m ? m[1] : text).trim();
    const detail = m ? m[2].trim() : undefined;
    return { index: i + 1, title, detail, text };
  });
  // Strip ALL steps blocks from remaining so they don't leak into markdown.
  const remaining = raw.replace(STEPS_BLOCK_RE, "").trim();
  return { steps, remaining };
}

interface Props {
  steps: StepItem[];
}

/**
 * Vertical stack of glossy purple "button"-style step cards.
 * Same look on mobile and desktop — never side by side.
 */
export default function StepFlowCards({ steps }: Props) {
  const points = useMemo(() => Array.from({ length: 10 }), []);
  if (!steps.length) return null;

  return (
    <div className="my-4 flex flex-col gap-3">
      {steps.map((s, i) => (
        <div
          key={i}
          className="step-card animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
        >
          <span className="fold" aria-hidden />
          <span className="points_wrapper" aria-hidden>
            {points.map((_, p) => (
              <span key={p} className="point" />
            ))}
          </span>
          <span className="step-card-inner">
            <span className="step-card-index">{s.index}</span>
            <span className="step-card-text">
              <span className="block font-medium leading-snug">{s.title}</span>
              {s.detail && (
                <span className="mt-0.5 block text-[12px] leading-snug opacity-75">
                  {s.detail}
                </span>
              )}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
