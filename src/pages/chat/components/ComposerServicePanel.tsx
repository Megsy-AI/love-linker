import { lazy, Suspense, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { findSlidesTemplate } from "@/lib/slidesTemplates";
import type { MediaModelChoice } from "@/components/chat/media/MediaModelPickerSheet";

const MediaModelPickerSheet = lazy(
  () => import("@/components/chat/media/MediaModelPickerSheet"),
);

interface Props {
  chatMode: string;
  mediaModel?: MediaModelChoice | null;
  setMediaModel?: (m: MediaModelChoice) => void;
  slidesTemplate?: string;
  onOpenTemplatePicker?: () => void;
  onClear: () => void;
  /** Set when the docs agent is active. */
  isDocsAgent?: boolean;
  /** Set when the dev agent is active. */
  isDevAgent?: boolean;
}

/** Plain-text label for services that have no picker. */
const SERVICE_LABELS: Record<string, string> = {
  code: "Website",
  dev: "Dev",
  "deep-research": "Deep research",
  learning: "Learning",
  docs: "Documents",
};

/**
 * Minimal activation row that sits at the top of the composer while a mode is
 * active. For images / video / slides it is ONLY the model/template picker
 * button (plus a small close). Every other service shows plain text — no
 * icons, no bar background, nothing that looks like an extra part.
 */
export default function ComposerServicePanel({
  chatMode,
  mediaModel,
  setMediaModel,
  slidesTemplate,
  onOpenTemplatePicker,
  onClear,
  isDocsAgent,
  isDevAgent,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const key = isDocsAgent ? "docs" : isDevAgent ? "dev" : chatMode;

  const isImages = key === "images";
  const isVideo = key === "video";
  const isSlides = key === "slides" || key === "slides-images";
  const showMediaPicker = (isImages || isVideo) && !!setMediaModel;
  const showTemplatePicker = isSlides && !!onOpenTemplatePicker;
  const template = isSlides ? findSlidesTemplate(slidesTemplate || "") : null;
  const label = SERVICE_LABELS[key];

  if (!showMediaPicker && !showTemplatePicker && !label) return null;

  const pickerButtonClass =
    "flex h-full min-w-0 flex-1 items-center gap-2 rounded-full text-left text-[13px] font-medium text-foreground transition-colors active:scale-[0.99]";

  return (
    <div className="flex h-8 items-center gap-1 rounded-full bg-foreground/[0.05] pl-3 pr-1">
      {showMediaPicker ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={isVideo ? "Choose video model" : "Choose image model"}
          aria-haspopup="dialog"
          className={pickerButtonClass}
        >
          <span className="min-w-0 flex-1 truncate">
            {mediaModel?.name || (isVideo ? "Video model" : "Image model")}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-foreground/40" strokeWidth={2.4} />
        </button>
      ) : null}

      {showTemplatePicker ? (
        <button
          type="button"
          onClick={() => onOpenTemplatePicker()}
          aria-label="Choose slides template"
          aria-haspopup="dialog"
          className={pickerButtonClass}
        >
          <span className="min-w-0 flex-1 truncate">{template?.name || "Template"}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-foreground/40" strokeWidth={2.4} />
        </button>
      ) : null}

      {!showMediaPicker && !showTemplatePicker && label ? (
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{label}</span>
      ) : null}

      <button
        type="button"
        onClick={onClear}
        aria-label={label ? `Close ${label}` : "Close mode"}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
      >
        <X className="w-3.5 h-3.5" strokeWidth={2.2} />
      </button>

      {pickerOpen && showMediaPicker ? (
        <Suspense fallback={null}>
          <MediaModelPickerSheet
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            mode={isVideo ? "video" : "images"}
            selectedSlug={mediaModel?.slug}
            onSelect={(m) => {
              setMediaModel?.(m);
              setPickerOpen(false);
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
