import { m as motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  FileText,
  Microscope,
  Presentation,
  Image as ImageIcon,
  Code2,
  X,
  type LucideIcon,
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { translateExactText, useUserLang } from "@/lib/authI18n";

export type LumaMode =
  | "normal"
  | "learning"
  | "deep-research"
  | "slides"
  | "operator"
  | "docs"
  | "images"
  | "video"
  | "code";

type ModeDef = {
  id: Exclude<LumaMode, "normal">;
  label: string;
  Icon: LucideIcon;
  color: string;
};

// One distinct hue per mode — makes the active state instantly recognisable
// and keeps the resting chip strip lively without a wall of yellow.
const MODES: ModeDef[] = [
  { id: "code", label: "Coder Mode", Icon: Code2, color: "var(--mode-code)" },
  { id: "images", label: "Images", Icon: ImageIcon, color: "hsl(var(--brand-mint))" },
  { id: "slides", label: "Slides", Icon: Presentation, color: "var(--mode-slides)" },
  {
    id: "deep-research",
    label: "Deep Research",
    Icon: Microscope,
    color: "hsl(var(--brand-blush))",
  },
  { id: "docs", label: "Docs", Icon: FileText, color: "var(--mode-docs)" },
  { id: "learning", label: "Learning", Icon: GraduationCap, color: "var(--mode-learning)" },
];

// Color-mix tint helper — works with hex, hsl(var(--…)), or any CSS color.
// (the previous hex-only parser produced rgba(NaN,NaN,NaN,…) for CSS-var
// colors, which made shadows silently invalid and chips look inconsistent.)
const tint = (color: string, a: number) =>
  `color-mix(in srgb, ${color} ${Math.round(a * 100)}%, transparent)`;

interface Props {
  mode: LumaMode;
  onChange: (mode: LumaMode) => void;
}

const TAP_SPRING = { type: "spring" as const, stiffness: 420, damping: 26 };

export default function MobileModeBar({ mode, onChange }: Props) {
  const lang = useUserLang();
  const tx = (text: string) => translateExactText(text, lang);
  const activeMode = mode !== "normal" ? MODES.find((m) => m.id === mode) : null;

  return (
    <div
      data-testid="mobile-mode-bar"
      dir="ltr"
      className="flex items-center gap-2 overflow-x-auto no-scrollbar px-3 pb-2.5 min-h-[40px]"
      style={{ WebkitOverflowScrolling: "touch", scrollSnapType: "x proximity" }}


    >
      <AnimatePresence mode="popLayout" initial={false}>
        {activeMode ? (
          <motion.div
            key={activeMode.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={TAP_SPRING}
            data-testid={`mobile-mode-${activeMode.id}`}
            data-active={true}
            style={{
              scrollSnapAlign: "start",
              fontWeight: 600,
            }}
            className="shrink-0 inline-flex items-center gap-2 h-10 ps-3 pe-1.5 rounded-xl bg-foreground text-background border border-foreground"
          >
            <activeMode.Icon size={14} strokeWidth={2.2} />
            <span className="leading-none whitespace-nowrap text-[13px]">{tx(activeMode.label)}</span>
            <button
              type="button"
              aria-label={tx(`Remove ${activeMode.label} mode`)}
              onClick={() => {
                haptic("soft");
                onChange("normal");
              }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-transform"
              style={{
                backgroundColor: "hsl(var(--brand-ink) / 0.18)",
                color: "hsl(var(--brand-ink))",
                border: `1px solid hsl(var(--brand-ink) / 0.25)`,
              }}
            >
              <X size={14} strokeWidth={3} />
            </button>
          </motion.div>
        ) : (
          MODES.map(({ id, label, Icon }, i) => (
            <motion.button
              key={id}
              type="button"
              data-testid={`mobile-mode-${id}`}
              data-active={false}
              onClick={() => {
                haptic("tap");
                onChange(id);
              }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ ...TAP_SPRING, delay: i * 0.02 }}
              style={{
                scrollSnapAlign: "start",
                fontWeight: 500,
              }}
              className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-border bg-card text-[13px] text-foreground transition-colors hover:bg-muted"
            >
              <Icon size={14} strokeWidth={2.2} className="text-foreground/70" />
              <span className="leading-none whitespace-nowrap">{tx(label)}</span>
            </motion.button>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
