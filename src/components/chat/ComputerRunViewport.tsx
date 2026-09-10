import { useState } from "react";
import { ChevronDown } from "lucide-react";
import MegsyStar from "@/components/branding/MegsyStar";
import { Button } from "@/components/ui/button";

interface ComputerRunViewportProps {
  url?: string | null;
  poster?: string | null;
  active?: boolean;
  status?: string;
}

export default function ComputerRunViewport({
  url,
  poster,
  active,
  status,
}: ComputerRunViewportProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      data-computer-viewport
      className="relative w-full overflow-hidden rounded-3xl border border-border/40 bg-card/40 shadow-sm"
      aria-label="كومبيوتر ميغسي"
    >
      <Button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        variant="ghost"
        className="flex h-9 w-full items-center gap-2 rounded-none border-b border-border/30 px-3 text-start shadow-none hover:bg-foreground/[0.03]"
        aria-expanded={expanded}
      >
        <MegsyStar
          className={`h-3.5 w-3.5 shrink-0 text-[var(--megsy-gold)] ${active ? "motion-safe:animate-[spin_4s_linear_infinite]" : ""}`}
        />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
          {status || (active ? "كومبيوتر ميغسي يعمل الآن" : "كومبيوتر ميغسي")}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </Button>

      <div
        className={`relative w-full overflow-hidden bg-muted/20 transition-[height] duration-500 ease-out ${expanded ? "h-[min(52vh,420px)]" : "h-44"}`}
      >
        {url ? (
          <iframe
            src={url}
            title="عرض كومبيوتر ميغسي"
            className={`absolute inset-0 h-full w-full border-0 ${expanded ? "pointer-events-auto" : "pointer-events-none"}`}
            allow="clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        ) : poster ? (
          <img src={poster} alt="آخر شاشة من كومبيوتر ميغسي" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 grid place-items-center" aria-label="جاري تجهيز شاشة الكمبيوتر">
            <div className="relative grid h-24 w-24 place-items-center">
              <span className="absolute inset-0 rounded-full border border-primary/20 motion-safe:animate-[spin_4s_linear_infinite]" />
              <span className="absolute inset-3 rounded-full border border-primary/20 border-t-primary/80 motion-safe:animate-[spin_2s_linear_infinite]" />
              <MegsyStar className="h-7 w-7 text-[var(--megsy-gold)] motion-safe:animate-pulse" />
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-foreground/[0.04]" />
      </div>
    </section>
  );
}