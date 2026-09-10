import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { promptUpgrade } from "@/lib/upgradeMoment";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useDynamicModels } from "@/hooks/useModels";
import { Check } from "lucide-react";
import { BrandIcon, hasBrandIcon } from "@/components/chat/media/BrandIcon";
import { useUserPlan } from "@/hooks/useUserPlan";
import { isFreeModel, isPaidUser } from "@/lib/subscriptionGating";
import { filterImageModels, filterVideoModels } from "@/lib/mediaModelPolicy";
import { isUnlimitedMediaModel, mediaModelBadge } from "@/lib/mediaQuota";
import MegsyStar from "@/components/branding/MegsyStar";
import { useUserLang } from "@/lib/authI18n";
import megsyModelIcon from "@/assets/megsy-model.jpg";

/** Keep every description to three words max. */
function shortDescription(text: string): string {
  return text.replace(/\s+/g, " ").trim().split(" ").slice(0, 3).join(" ");
}

function ModelIcon({ model }: { model: any }) {
  const isMegsy = /megsy/i.test(String(model.name || ""));
  const src = isMegsy ? megsyModelIcon : model.thumbnailUrl || model.iconUrl;
  if (src) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
        <img
          src={src}
          alt=""
          className={isMegsy ? "h-full w-full object-cover" : "h-full w-full object-contain"}
        />
      </div>
    );
  }
  if (hasBrandIcon(model.name, model.provider)) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
        <BrandIcon name={model.name} provider={model.provider} variant="color" size={24} />
      </div>
    );
  }
  const letter = (model.name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-foreground/70">
      {letter}
    </div>
  );
}

/** Speed / quality / cost summary — used only when no human description exists. */
function describeModel(
  model: { credits?: number; isPremium?: boolean },
  kind: "image" | "video",
): string {
  const cost = Number(model.credits || 0);
  const speed = cost <= 1 ? "Fastest" : cost <= 4 ? "Fast" : "Slower";
  const quality = model.isPremium || cost > 4 ? "best quality" : "good quality";
  void kind;
  return `${speed} ${quality}`;
}

export interface MediaModelChoice {
  slug: string;
  name: string;
  provider: string;
  credits: number;
  thumbnail?: string;
  type: "image" | "video";
  isPremium?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "images" | "video";
  selectedSlug?: string;
  onSelect: (model: MediaModelChoice) => void;
}

export default function MediaModelPickerSheet({
  open,
  onOpenChange,
  mode,
  selectedSlug,
  onSelect,
}: Props) {
  const { models, loading } = useDynamicModels();
  const { plan } = useUserPlan();
  const paid = isPaidUser(plan);
  const lang = useUserLang();
  const isAr = lang.startsWith("ar");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const target = mode === "video" ? ["video", "video-i2v"] : ["image"];
    const scoped = models.filter((m) => target.includes(m.type as string));
    const sorted = (mode === "video" ? filterVideoModels(scoped) : filterImageModels(scoped)).sort(
      (a, b) => {
        const fa = a.isFeatured ? 1 : 0;
        const fb = b.isFeatured ? 1 : 0;
        if (fa !== fb) return fb - fa;
        return (a.credits || 0) - (b.credits || 0);
      },
    );
    // Keep only the top 5 video models for a clean list.
    return mode === "video" ? sorted.slice(0, 5) : sorted;
  }, [models, mode]);

  const title = isAr ? "اختر نموذجًا" : "Choose a model";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="max-h-[76dvh] rounded-t-[28px] border-0 bg-background p-0 [&>button.absolute]:hidden"
      >
        <SheetHeader className="px-5 pb-1 pt-3.5">
          <SheetTitle className="text-center text-[15px] font-semibold text-foreground">
            {title}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="max-h-[calc(76dvh-58px)]">
          <div className="space-y-0.5 px-2.5 pb-5 pt-0.5" dir="ltr">
            {loading && (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No models available right now
              </div>
            )}
            {filtered.map((m) => {
              const active = m.slug === selectedSlug;
              const modelIsFree =
                mode === "video" ? isUnlimitedMediaModel(m) : isFreeModel(m.slug || m.id);
              const locked = !modelIsFree && !paid;
              const showPro = !!m.isPremium || locked;
              const description = shortDescription((m.description || describeModel(m, mode === "video" ? "video" : "image")).replace(/\s*Free\s*/gi, " "));

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (locked) {
                      promptUpgrade(m.name);
                      onOpenChange(false);
                      navigate("/pricing");
                      return;
                    }
                    onSelect({
                      slug: m.slug || m.id,
                      name: m.name,
                      provider: m.provider,
                      credits: m.credits,
                      thumbnail: m.thumbnailUrl || m.iconUrl,
                      type: mode === "video" ? "video" : "image",
                      isPremium: !!m.isPremium,
                    });
                    toast.success(`Selected: ${m.name}`);
                  }}
                  className="group flex w-full items-center gap-2.5 px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.02]"
                >
                  {/* Selection checkmark */}
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {active ? (
                      <Check className="h-4 w-4 text-foreground" strokeWidth={2.4} />
                    ) : null}
                  </div>

                  {/* Name + description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                    <span className="truncate text-[14.5px] font-semibold text-foreground">
                      {m.name.replace(/\s*Free\s*/gi, " ").trim()}
                    </span>
                      {showPro && (
                        <MegsyStar
                          className="h-3 w-3 shrink-0 text-[var(--megsy-blue)]"
                          aria-hidden
                        />
                      )}
                    </div>
                    <p className="line-clamp-1 text-[12px] leading-tight text-muted-foreground">
                      {description}
                    </p>
                  </div>

                  {/* Model icon */}
                  <ModelIcon model={m} />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
