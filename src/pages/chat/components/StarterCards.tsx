import {
  Image,
  Globe,
  LayoutTemplate,
  Search,
} from "lucide-react";
import { m as motion, AnimatePresence } from "framer-motion";
import { useUserLang } from "@/lib/authI18n";

export interface StarterCardsProps {
  /** Activates the service chip for the picked card. */
  onPick: (prompt: string, mode?: string) => void;
  className?: string;
}

/** Real services, reordered and shown with clean, recognisable icons. */
const CARDS = [
  { id: "image", mode: "images", Icon: Image, title: "Images", titleAr: "صور" },
  { id: "web", mode: "code", Icon: Globe, title: "Website", titleAr: "موقع" },
  { id: "slides", mode: "slides", Icon: LayoutTemplate, title: "Slides", titleAr: "عروض" },
  { id: "research", mode: "deep-research", Icon: Search, title: "Research", titleAr: "بحث" },
];

const handleCardClick = (
  c: (typeof CARDS)[number],
  onPick: StarterCardsProps["onPick"],
) => {
  if (c.id === "integrations") {
    window.dispatchEvent(new CustomEvent("megsy:open-integrations"));
    return;
  }
  onPick("", (c as { mode?: string }).mode);
};

const chipClass =
  "group inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card " +
  "px-3.5 hover:bg-muted active:scale-[0.97] " +
  "transition-[background-color,transform] duration-150";

const iconClass =
  "h-4 w-4 shrink-0 text-foreground/70 transition-colors group-hover:text-foreground";
const labelClass =
  "whitespace-nowrap text-[13px] font-medium text-foreground transition-colors";

/** Desktop-only: compact icon chips shown below the composer (no images). */
export function StarterChips({ onPick, className = "" }: StarterCardsProps) {
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key="starter-chips-desktop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`hidden md:flex flex-wrap items-center justify-center gap-2 ${className}`}
      >
        {CARDS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => handleCardClick(c, onPick)}
            className={chipClass}
          >
            <c.Icon className={iconClass} strokeWidth={1.75} />
            <span className={labelClass}>{c.title}</span>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

export function StarterCards({ onPick, className = "" }: StarterCardsProps) {
  const isAr = useUserLang().startsWith("ar");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`pointer-events-auto relative w-full md:hidden ${className}`}
    >
      <div
        data-starter-chips-scroll
        dir={isAr ? "rtl" : "ltr"}
        className="scrollbar-hide flex w-full gap-2 overflow-x-auto px-3 py-1"
      >
        {CARDS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => handleCardClick(c, onPick)}
            className={
              "group flex h-10 shrink-0 items-center gap-2 rounded-xl " +
              "border border-border bg-card px-3.5 " +
              "hover:bg-muted active:scale-[0.97] transition-[background-color,transform] duration-150"
            }
          >
            <c.Icon className="h-4 w-4 shrink-0 text-foreground/70 transition-colors group-hover:text-foreground" strokeWidth={1.75} />
            <span className="whitespace-nowrap text-[13px] font-medium text-foreground transition-colors">
              {isAr ? c.titleAr : c.title}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}



export default StarterCards;
