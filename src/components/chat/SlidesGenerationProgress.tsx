/** @doc Real step progress for slides generation, driven by chat-slides-stream phase events
 * (mapped from runSlidesTurn's phase labels). Replaces the generic "thinking" bubble for slides. */
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type SlidesGenerationStep = "outline" | "content" | "design" | "done";

const STEP_ORDER: SlidesGenerationStep[] = ["outline", "content", "design", "done"];

const STEP_LABELS: Record<SlidesGenerationStep, string> = {
  outline: "Outline",
  content: "Content",
  design: "Design",
  done: "Done",
};

/** Maps the phase labels set by runSlidesTurn's onProgress handler to a step. */
export function slidesPhaseLabelToStep(label?: string | null): SlidesGenerationStep {
  const l = (label || "").toLowerCase();
  if (!l) return "outline";
  if (l.includes("search") || l.includes("finding") || l.includes("outline")) return "outline";
  if (l.includes("writing") || l.includes("content")) return "content";
  if (l.includes("image") || l.includes("polish") || l.includes("design")) return "design";
  if (l.includes("final")) return "done";
  return "outline";
}

export default function SlidesGenerationProgress({
  status,
  className,
}: {
  /** Human-readable phase label, e.g. "Drafting outline" — comes straight from job.phase mapping. */
  status?: string | null;
  className?: string;
}) {
  const activeStep = slidesPhaseLabelToStep(status);
  const activeIndex = STEP_ORDER.indexOf(activeStep);

  return (
    <div
      role="status"
      aria-label={status || "Generating slides"}
      className={cn("mb-2 flex items-center gap-2 py-1", className)}
    >
      {STEP_ORDER.map((step, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                isDone
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : isActive
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border/40 text-muted-foreground",
              )}
            >
              {isDone ? (
                <Check className="h-3 w-3" />
              ) : isActive ? (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-80" aria-hidden />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-30" aria-hidden />
              )}
              {STEP_LABELS[step]}
            </div>
            {i < STEP_ORDER.length - 1 && (
              <span
                className={cn(
                  "h-px w-3 shrink-0",
                  isDone ? "bg-primary/40" : "bg-border/40",
                )}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
