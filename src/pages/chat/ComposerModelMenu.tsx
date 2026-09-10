import { useEffect, useMemo, useRef, useState, useLayoutEffect, type ReactNode } from "react";
import { m as motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, ChevronDown, Lock, Sliders, X } from "lucide-react";
import MegsyStar from "@/components/files/MegsyStar";
import { toast } from "sonner";
import { promptUpgrade } from "@/lib/upgradeMoment";
import type { AgentModel } from "@/lib/agentRegistry";
import type { MediaModelChoice } from "@/components/chat/media/MediaModelPickerSheet";
import type { ChatMode } from "./chatConstants";
import {
  CHAT_COMPOSER_MODEL_OPTIONS,
  ComposerModelIcon,
  getChatModelDisplayLabel,
} from "./chatConstants";

import { useIsMobile } from "@/hooks/use-mobile";
import { DraggablePlusSheet } from "./components/DraggablePlusSheet";
import {
  glassModelMenu,
  glassModelMenuStyle,
  glassModelMenuTriggerStyle,
} from "@/components/model-picker/glassModelMenuStyles";
import { readChatModelPreferences } from "@/lib/chatModelPreferences";


interface Props {
  mode: ChatMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  selectedModel: AgentModel | null;
  megsyTier: "lite" | "pro" | "max";
  userPlan: string;
  mediaModel: MediaModelChoice | null;
  onTierSelect: (tier: "lite" | "pro" | "max") => void;
  onChatModelSelect: (model: { id: string; label: string }) => void;
  onMediaModelSelect: (model: MediaModelChoice) => void;
  onModeChange?: (mode: ChatMode) => void;
  noIcon?: boolean;
  variant?: "pill" | "segment";
  centerOnMobile?: boolean;
  /** Optional settings panel shown in-place when the pinned "Settings" toggle is tapped. */
  settingsPanel?: ReactNode;
  /** Label for the settings view header (defaults to "Settings"). */
  settingsLabel?: string;
  /** Desktop header instances must not create a mobile portal while hidden by CSS. */
  renderMobileSheet?: boolean;
  /** Extra classes for the trigger button. */
  triggerClassName?: string;
}


export default function ComposerModelMenu({
  mode,
  open,
  onOpenChange,
  side = "bottom",
  align = "end",
  selectedModel,
  megsyTier,
  userPlan,
  mediaModel,
  onTierSelect,
  onChatModelSelect,
  onMediaModelSelect,
  onModeChange,
  noIcon = false,
  variant = "pill",
  settingsPanel,
  settingsLabel = "Settings",
  renderMobileSheet = true,
  triggerClassName,
}: Props) {
  const [view, setView] = useState<"models" | "more" | "settings">("models");
  const [effortValue, setEffortValue] = useState<string>(() => {
    try { return readChatModelPreferences().effort; } catch { return "medium"; }
  });
  const [mobileHeaderHidden, setMobileHeaderHidden] = useState(false);
  const mobileLastScrollTopRef = useRef(0);
  useEffect(() => {
    if (!open) setView("models");
    if (open) {
      try { setEffortValue(readChatModelPreferences().effort); } catch {}
      setMobileHeaderHidden(false);
      mobileLastScrollTopRef.current = 0;
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.effort) setEffortValue(detail.effort);
    };
    window.addEventListener("megsy:chat-model-preferences", handler);
    return () => window.removeEventListener("megsy:chat-model-preferences", handler);
  }, [open]);
  const isMobile = useIsMobile();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<
    { left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null
  >(null);
  const MENU_W = typeof window !== "undefined" && window.innerWidth < 640 ? 260 : 300;

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 640;
      const menuW = isMobile ? Math.min(260, vw - 24) : Math.min(MENU_W, vw - 24);
      let left = r.left;
      if (align === "end") left = r.right - menuW;
      else if (align === "center") left = r.left + (r.width - menuW) / 2;
      left = Math.max(12, Math.min(vw - menuW - 12, left));
      const width = menuW;
      const cap = isMobile ? Math.min(vh * 0.55, 420) : Math.min(vh * 0.7, 560);
      // Auto-flip: if the trigger sits in the lower part of the screen (composer),
      // the menu should rise above it instead of being pushed off-screen below.
      const placeAbove = side === "top" || r.bottom > vh * 0.55;
      if (placeAbove) {
        const bottom = vh - r.top + 10;
        const maxHeight = Math.min(cap, Math.max(220, r.top - 24));
        setPos({ left, width, bottom, maxHeight });
      } else {
        const top = r.bottom + 10;
        const maxHeight = Math.min(cap, Math.max(220, vh - top - 24));
        setPos({ left, width, top, maxHeight });
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, align, side]);

  const orderedChatOptions = useMemo(
    () => [...CHAT_COMPOSER_MODEL_OPTIONS].sort((a, b) => Number(a.premium) - Number(b.premium)),
    [],
  );

  const resetMobileHeader = () => {
    setMobileHeaderHidden(false);
    mobileLastScrollTopRef.current = 0;
  };

  useEffect(() => {
    resetMobileHeader();
  }, [open, view]);

  const activeChatOption = CHAT_COMPOSER_MODEL_OPTIONS.find((item) =>
    item.kind === "tier" ? !selectedModel && megsyTier === item.id : selectedModel?.id === item.id,
  );
  const triggerLabel = activeChatOption?.label || getChatModelDisplayLabel(selectedModel, megsyTier);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        data-tier-trigger
        className={
          variant === "segment"
            ? `${glassModelMenu.triggerSegment} justify-center ${triggerClassName || ""}`
            : `group inline-flex h-11 md:h-9 max-w-[62vw] items-center justify-center gap-1 rounded-full px-1 text-[16px] font-semibold text-foreground hover:text-foreground transition-all outline-none ${triggerClassName || ""}`
        }
        style={
          variant === "segment"
            ? glassModelMenuTriggerStyle
            : { background: "transparent", border: 0, boxShadow: "none", minHeight: 44 }
        }
        aria-label="Choose model"
        aria-expanded={open}
      >
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-foreground/70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
        {!noIcon && activeChatOption && (
          <span data-model-icon className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-transparent border-0">
            <ComposerModelIcon brand={activeChatOption.brand} />
          </span>
        )}
        <span data-model-label className="truncate tracking-tight text-foreground">{triggerLabel}</span>
      </button>

      {/* MOBILE — anchored dropdown card */}
      {renderMobileSheet && isMobile && typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => onOpenChange(false)} />
                <motion.div
                  data-tier-menu
                  initial={{ opacity: 0, y: pos.bottom != null ? 6 : -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: pos.bottom != null ? 6 : -6 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: "fixed",
                    ...(pos.bottom != null
                      ? { bottom: Math.max(10, pos.bottom) }
                      : { top: Math.max(10, pos.top ?? 60) }),
                    left: Math.max(12, Math.min(pos.left ?? 12, window.innerWidth - (pos.width ?? 260) - 12)),
                    width: pos.width ?? 260,
                    maxHeight: pos.maxHeight,
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    backdropFilter: "none",
                    WebkitBackdropFilter: "none",
                    boxShadow: "0 18px 48px -24px hsl(var(--foreground) / 0.35)",
                    transformOrigin: pos.bottom != null ? "bottom center" : "top center",
                  }}
                  className="tier-menu-card z-[9999] flex flex-col overflow-y-auto overscroll-contain rounded-[20px] p-1.5"
                >
                  <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium tracking-wide text-foreground/65">
                    Choose a model
                  </div>

                  {CHAT_COMPOSER_MODEL_OPTIONS.map((item) => {
                    const locked = item.premium && (userPlan === "free" || userPlan === "trial");
                    const active =
                      item.kind === "tier"
                        ? !selectedModel && megsyTier === item.id
                        : selectedModel?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (locked) {
                            toast.info(`${item.label} is available on paid plans only`);
                            return;
                          }
                          if (item.kind === "tier") onTierSelect(item.id as "lite" | "pro" | "max");
                          else onChatModelSelect({ id: (item as any).id, label: (item as any).label });
                          onOpenChange(false);
                        }}
                        style={{
                          background: "transparent",
                          border: 0,
                          boxShadow: "none",
                          marginTop: 0,
                          opacity: locked ? 0.5 : 1,
                        }}
                        className="flex w-full items-center gap-2.5 px-2 py-1.5 text-start transition-colors hover:bg-foreground/[0.02]"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                          {locked ? (
                            <Lock className="h-3.5 w-3.5 text-foreground/65" />
                          ) : active ? (
                            <Check className="h-[17px] w-[17px] text-primary" strokeWidth={2.8} />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`truncate text-[13px] leading-tight ${
                                active ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                              }`}
                            >
                              {item.label}
                            </span>
                            {item.premium && (
                              <MegsyStar size={11} static className="text-[var(--megsy-blue)]" />
                            )}
                          </span>
                          <span className="mt-[2px] block truncate text-[11px] leading-snug text-foreground/60">
                            {item.desc}
                          </span>
                        </span>
                      </button>
                    );

                  })}

                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* DESKTOP — floating dropdown */}
      {!isMobile && typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <>
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => onOpenChange(false)}
                />
                <motion.div
                  data-tier-menu
                  initial={{ opacity: 0, y: side === "top" ? 8 : -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: side === "top" ? 8 : -8, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.6 }}
                  style={{
                    position: "fixed",
                    left: pos.left,
                    width: pos.width,
                    ...(pos.top !== undefined ? { top: pos.top } : {}),
                    ...(pos.bottom !== undefined ? { bottom: pos.bottom } : {}),
                    maxHeight: pos.maxHeight,
                    scrollBehavior: "smooth",
                    background: "var(--chat-claude-composer, #262627)",
                    border: 0,
                    backdropFilter: "none",
                    WebkitBackdropFilter: "none",
                    boxShadow: "none",
                  }}
                  className="z-[9999] rounded-2xl p-1.5 text-foreground overflow-y-auto overscroll-contain unified-menu-surface scrollbar-thin"
                >

                  {settingsPanel && (
                    <div className="flex items-center justify-between gap-2 px-1.5 pt-0.5 pb-2 sticky top-0 z-10">
                      <button
                        type="button"
                        onClick={() => setView(view === "settings" ? "models" : "settings")}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-foreground/90 bg-foreground/[0.06] hover:bg-foreground/[0.09] transition-colors"
                        aria-label={view === "settings" ? "Back to models" : "Open model settings"}
                      >
                        {view === "settings" ? (
                          <>
                            <ArrowLeft className="h-3 w-3" strokeWidth={2.4} />
                            <span>Models</span>
                          </>
                        ) : (
                          <>
                            <Sliders className="h-3 w-3" strokeWidth={2.4} />
                            <span>{settingsLabel}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  <AnimatePresence mode="wait" initial={false}>
                  {view === "settings" && settingsPanel ? (
                    <motion.div
                      key="settings-desktop"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="p-1"
                    >
                      {settingsPanel}
                    </motion.div>
                  ) : (
                  <motion.div
                    key="models-desktop"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                  <div className="flex flex-col">
                    {CHAT_COMPOSER_MODEL_OPTIONS.map((item) => {
                      const locked = item.premium && (userPlan === "free" || userPlan === "trial");
                      const active =
                        item.kind === "tier"
                          ? !selectedModel && megsyTier === item.id
                          : selectedModel?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (locked) {
                              promptUpgrade(item.label);
                              return;
                            }
                            if (item.kind === "tier") onTierSelect(item.id as "lite" | "pro" | "max");
                            else onChatModelSelect({ id: (item as any).id, label: (item as any).label });
                            toast.success(`Selected: ${item.label}`);
                            onOpenChange(false);
                          }}
                          className="group flex w-full items-center gap-2.5 px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.02]"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                            {locked ? (
                              <Lock className="h-3.5 w-3.5 text-foreground/55" />
                            ) : active ? (
                              <Check className="h-4 w-4 text-primary" strokeWidth={2.8} />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="block text-[13px] font-semibold leading-tight truncate tracking-tight text-foreground">
                                {item.label}
                              </span>
                              {item.premium && (
                                <MegsyStar size={11} static className="text-[var(--megsy-blue)]" />
                              )}
                            </span>
                            <span className="mt-[2px] block truncate text-[11px] leading-snug text-foreground/60">
                              {item.desc}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  </motion.div>
                  )}
                  </AnimatePresence>
        </motion.div>

      </>
    )}
  </AnimatePresence>,
  document.body,
)}
    </div>
  );
}

