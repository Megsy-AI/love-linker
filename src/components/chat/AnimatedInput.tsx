import { memo, useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from "react";
import { ArrowUp, Square, X, Sparkles, Loader2, Pencil, Plus } from "lucide-react";
import { m as motion, AnimatePresence } from "framer-motion";

import ModelPickerDropdown from "@/components/model-picker/ModelPickerDropdown";
import type { AgentDef, AgentModel } from "@/lib/agentRegistry";
import { getAgentById } from "@/lib/agentRegistry";
import ComposerIntegrationsButton from "@/components/chat/ComposerIntegrationsButton";
import IntegrationsSheet from "@/components/chat/IntegrationsSheet";
import ComposerVoiceWave from "@/components/chat/ComposerVoiceWave";
import { isSendKey } from "@/lib/composerKey";
import { parseSlashCommand } from "@/lib/slashCommands";
import { useNavigate, useLocation } from "react-router-dom";
import { t as uiT, useUserLang } from "@/lib/authI18n";
import { useComposerComputer } from "./ComposerComputerContext";
import { Button } from "@/components/ui/button";

/** Leading marker used by the "create skill" draft flow. */
export const SKILL_MARKER = "إنشاء مهارة:";

interface SmartQuestion {
  title: string;
  options: string[];
  allowText?: boolean;
}

interface AnimatedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text?: string) => void;
  onCancel?: () => void;
  onPlusClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholders?: string[];
  pendingQuestions?: SmartQuestion[];
  onQuestionAnswer?: (answer: string) => void;
  onQuestionSkip?: () => void;
  activeAgent?: string | null;
  activeAgentDef?: AgentDef | null;
  onAgentSelect?: (agent: AgentDef) => void;
  onAgentRemove?: () => void;
  mentionCategories?: string[];
  selectedModel?: AgentModel | null;
  onModelSelect?: (model: AgentModel) => void;
  onModelRemove?: () => void;
  accentMode?: "learn" | null;
  headerSlot?: React.ReactNode;
  inlineSlot?: React.ReactNode;
  activeServiceSlot?: React.ReactNode;
  /** Live Megsy Computer surface fused into the composer above the textarea. */
  computerSlot?: React.ReactNode;
  /** Small icon buttons (model / template pickers) rendered in the bottom control row. */
  serviceTools?: React.ReactNode;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  /** When true, the composer sits in a chat context and uses a liquid-glass surface. */
  chatContext?: boolean;
  /** Force plain Enter to submit, regardless of viewport/send-mode preference. */
  forceEnterToSend?: boolean;
  /** Notified when the textarea gains or loses focus (used to auto-hide chips on mobile). */
  onFocusChange?: (focused: boolean) => void;
  canSendWithoutText?: boolean;
}

const AnimatedInput = ({
  value,
  onChange,
  onSend,
  onCancel,
  disabled,
  isLoading,
  placeholders,
  activeAgent,
  activeAgentDef,
  onAgentSelect,
  onAgentRemove,
  mentionCategories,
  selectedModel,
  onModelSelect,
  onModelRemove,
  headerSlot,
  inlineSlot,
  activeServiceSlot,
  computerSlot,
  serviceTools,
  isEditing,
  onCancelEdit,
  onPlusClick,
  chatContext,
  forceEnterToSend,
  onFocusChange,
  canSendWithoutText,
}: AnimatedInputProps) => {
  const currentLang = useUserLang();
  useComposerComputer();
  const deferredValue = useDeferredValue(value);
  const navigate = useNavigate();
  const isArabicUi =
    currentLang === "ar-eg" ||
    (typeof document !== "undefined" && document.documentElement.dir === "rtl");
  const shortPlaceholder = isArabicUi ? "اسأل ميغسي" : "Ask Megsy";

  /**
   * Intercept bare slash commands (e.g. "/clear", "/docs", "/new").
   * Returns true when the input was consumed as a command so callers
   * should NOT trigger onSend.
   */
  const tryRunSlashCommand = useCallback((): boolean => {
    const cmd = parseSlashCommand(value);
    if (!cmd) return false;
    const handled = cmd.run({
      navigate,
      clearInput: () => onChange(""),
      raw: value,
    });
    return handled !== false;
  }, [value, navigate, onChange]);

  const handleSendWithSlash = useCallback(() => {
    if (tryRunSlashCommand()) return;
    // Read from the textarea at the moment of the tap. Mobile keyboards can
    // commit their final composition just before `click`, while React's parent
    // state is still one frame behind; forwarding the live value prevents a
    // valid tap from being mistaken for an empty message.
    onSend(textareaRef.current?.value ?? value);
  }, [tryRunSlashCommand, onSend]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelQuery, setModelQuery] = useState("");
  const [lastSelectedAgent, setLastSelectedAgent] = useState<AgentDef | null>(null);
  const [focused, setFocused] = useState(false);
  const [listening, setListening] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const composerLocation = useLocation();
  useEffect(() => {
    if (new URLSearchParams(composerLocation.search).get("integrations") === "1") {
      setIntegrationsOpen(true);
    }
  }, [composerLocation.search]);
  useEffect(() => {
    const open = () => setIntegrationsOpen(true);
    window.addEventListener("megsy:open-integrations", open);
    return () => window.removeEventListener("megsy:open-integrations", open);
  }, []);

  /** An app tool was picked from the connectors sheet — prefill the composer. */
  useEffect(() => {
    const insert = (event: Event) => {
      const text = (event as CustomEvent<{ text?: string }>).detail?.text;
      if (!text) return;
      const current = valueRef.current;
      onChange(current && !current.endsWith(" ") ? `${current} ${text}` : `${current}${text}`);
      window.setTimeout(() => textareaRef.current?.focus(), 60);
    };
    window.addEventListener("megsy:composer-insert", insert);
    return () => window.removeEventListener("megsy:composer-insert", insert);
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Get models for active agent OR last selected agent
  const activeAgentModels = useMemo(() => {
    if (lastSelectedAgent?.models?.length) return lastSelectedAgent.models;
    if (!activeAgent) return [];
    const agent = getAgentById(activeAgent);
    return agent?.models || [];
  }, [activeAgent, lastSelectedAgent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && (mentionOpen || modelPickerOpen)) {
      setMentionOpen(false);
      setModelPickerOpen(false);
      return;
    }
    // Desktop: Enter sends. Mobile: Enter inserts a newline (no preventDefault).
    const shouldForceSend =
      forceEnterToSend && e.key === "Enter" && !e.shiftKey && !e.nativeEvent?.isComposing;
    if (shouldForceSend || isSendKey(e)) {
      e.preventDefault();
      if (mentionOpen || modelPickerOpen) {
        setMentionOpen(false);
        setModelPickerOpen(false);
        return;
      }
      if (value.trim() && !disabled) handleSendWithSlash();

    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newVal.slice(0, cursorPos);

    // Check for # model picker (when agent with models is selected)
    if ((activeAgent || lastSelectedAgent) && activeAgentModels.length > 0) {
      const hashMatch = textBeforeCursor.match(/#(\w*)$/);
      if (hashMatch) {
        setModelPickerOpen(true);
        setModelQuery(hashMatch[1]);
        setMentionOpen(false);
        return;
      }
    }

    // @ mention menu removed by design.
    setMentionOpen(false);
    setMentionQuery("");
    if (!textBeforeCursor.match(/#(\w*)$/)) {
      setModelPickerOpen(false);
      setModelQuery("");
    }
  };

  const handleModelSelect = (model: AgentModel) => {
    // Replace #query with #model-label and keep it visible
    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const cleanedBefore = textBeforeCursor.replace(/#\w*$/, "");
    const textAfter = value.slice(cursorPos);
    const modelTag = `#${model.label} `;
    onChange(cleanedBefore + modelTag + textAfter);
    setModelPickerOpen(false);
    setModelQuery("");
    onModelSelect?.(model);
  };

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      const maxH = typeof window !== "undefined" && window.innerWidth < 768 ? 120 : 160;
      el.style.height = Math.min(el.scrollHeight, maxH) + "px";
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const hasText = value.trim().length > 0 || Boolean(canSendWithoutText);

  /** "Create skill" draft — the leading marker gets a blue gradient bar. */
  useEffect(() => {
    const onSkillDraft = () => {
      const current = valueRef.current || "";
      if (!current.startsWith(SKILL_MARKER)) {
        onChange(`${SKILL_MARKER} ${current.trimStart()}`.trimEnd() + " ");
      }
      window.setTimeout(() => textareaRef.current?.focus(), 80);
    };
    window.addEventListener("megsy:skill-draft", onSkillDraft);
    return () => window.removeEventListener("megsy:skill-draft", onSkillDraft);
  }, [onChange]);

  const skillDraft = value.startsWith(SKILL_MARKER);

  /** Compact pill: the idle composer remains a stable native-feeling control. */
  const compact = !focused && !hasText && !isEditing && !headerSlot;

  return (
    <div className="relative">
      <AnimatePresence>
        {/* @ mention dropdown removed by design. */}
        {modelPickerOpen && activeAgentModels.length > 0 && (
          <ModelPickerDropdown
            models={activeAgentModels}
            query={modelQuery}
            onSelect={handleModelSelect}
            onClose={() => setModelPickerOpen(false)}
          />
        )}
      </AnimatePresence>
      {/* The computer screen always sits above the input, never in place of it,
          so the input can never disappear when a task ends. */}
      <div className="md:rounded-[28px]">
        <motion.div
          data-compact={compact ? "true" : "false"}
          className={`chat-composer-frame chat-mobile-input-glow composer-card pointer-events-auto relative z-10 transition-[border-radius,margin,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            compact
              ? "mx-0 rounded-[32px] px-2 py-1.5"
              : headerSlot
                ? "mx-0 rounded-[26px] px-3.5 pt-0 pb-2 md:px-4 md:pt-0 md:pb-2.5"
                : "mx-0 rounded-[26px] px-3.5 pt-3 pb-2.5 md:px-4 md:pt-3 md:pb-2.5"
          } ${chatContext ? "chat-composer-liquid" : ""}`}
        >
          {computerSlot ? (
            <div className="-mx-2.5 -mt-1 mb-2 pointer-events-auto md:-mx-3">{computerSlot}</div>
          ) : null}
          {/* Active service strip — fused into the top of the composer card */}
          {headerSlot && <div className="pointer-events-auto -mx-1 mt-1 mb-0.5">{headerSlot}</div>}
          {/* Chips row (model picker, slides template, research depth) — sit ABOVE the input */}
          {inlineSlot && (
            <div dir="ltr" className="flex items-center flex-wrap gap-1.5 pb-1.5">
              {inlineSlot}
            </div>
          )}

          {/* Textarea — full width, on top */}
          <div className="px-1">
            {/* Inline service chip — lives inside the input box and pushes the textarea down */}
            <AnimatePresence>
              {isEditing && (
                <motion.div
                  key="editing-chip"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 pt-2 pb-1.5">
                    <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-full text-[12px] font-medium bg-primary/12 text-primary border border-primary/25">
                      <Pencil className="w-3 h-3" strokeWidth={2.4} />
                      {uiT("editing")}
                    </span>
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition"
                      aria-label={uiT("cancelEdit")}
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.4} />
                    </button>
                  </div>
                </motion.div>
              )}
              {activeServiceSlot && (
                <motion.div
                  key="active-service-chip"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center px-0.5 pt-0.5 pb-1">{activeServiceSlot}</div>
                </motion.div>
              )}
              {activeAgentDef && (
                <motion.div
                  key={activeAgentDef.id}
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center pt-1 pb-1.5">
                    <span className="inline-flex items-center gap-1.5 h-9 pl-3 pr-1.5 rounded-full text-[12.5px] font-medium border border-foreground/20 bg-foreground/10 text-foreground">
                      <activeAgentDef.icon className="w-3.5 h-3.5" />
                      <span className="leading-none">{activeAgentDef.label}</span>
                      <button
                        type="button"
                        onClick={onAgentRemove}
                        className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-foreground/20 transition-colors"
                        aria-label={`Remove ${activeAgentDef.label}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`relative ${listening ? "hidden" : ""}`}>
              {!value && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 hidden md:flex items-start px-1 pt-2 text-[15.5px] md:text-sm text-foreground/90 leading-relaxed overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={shortPlaceholder}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.35 }}
                      className="truncate"
                    >
                      {shortPlaceholder}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}
              {skillDraft && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 whitespace-pre-wrap break-words text-transparent text-[15.5px] md:text-sm py-1.5 px-1 leading-relaxed md:py-2 font-medium"
                >
                  <span
                    className="rounded-[6px]"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, hsl(212 96% 58% / 0.28), hsl(232 92% 62% / 0.32), hsl(262 88% 64% / 0.22))",
                      boxShadow: "inset 0 0 0 1px hsl(219 92% 60% / 0.35)",
                    }}
                  >
                    {SKILL_MARKER}
                  </span>
                  {value.slice(SKILL_MARKER.length)}
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setFocused(true);
                  onFocusChange?.(true);
                }}
                onBlur={() => {
                  setFocused(false);
                  onFocusChange?.(false);
                }}
                placeholder=""

                rows={1}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
                data-form-type="other"
                name="chat-message"
                className="scrollbar-hide relative w-full bg-transparent border-none outline-none resize-none text-[15.5px] md:text-sm text-foreground !text-foreground py-1.5 px-1 leading-relaxed md:py-2 font-medium transition-[min-height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ minHeight: headerSlot ? "34px" : "38px" }}
              />
            </div>
            <AnimatePresence>{listening ? <ComposerVoiceWave /> : null}</AnimatePresence>
          </div>

          {/* Bottom controls row — plus + integrations on the start side, one
              morphing action button (mic ↔ send) on the end side. */}
          <div
            data-composer-controls
            dir={isArabicUi ? "rtl" : "ltr"}
            className={`relative flex items-center gap-1 ${compact ? "pt-0" : "pt-1 md:pt-0"}`}
          >
            <Button
              type="button"
              onClick={onPlusClick}
              variant="ghost"
              size="icon-sm"
              className="animated-plus-btn relative z-[61] flex items-center justify-center h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] rounded-full transition-all duration-150 cursor-pointer active:scale-[0.9] shrink-0"
              aria-label={uiT("openTools")}
              data-plus-trigger
            >
              <Plus className="w-[20px] h-[20px]" strokeWidth={1.9} />
            </Button>

            {(focused || hasText) && (
              <ComposerIntegrationsButton onClick={() => setIntegrationsOpen(true)} />
            )}
            <IntegrationsSheet open={integrationsOpen} onOpenChange={setIntegrationsOpen} />

            {serviceTools}

            <div className="flex-1" />

            <AnimatePresence mode="popLayout" initial={false}>
              {/* Typing a new message must always be sendable — the stop button
                  only takes over while the composer is empty. */}
              {isLoading && !hasText ? (

                <Button
                  key="stop"
                  type="button"
                  onClick={onCancel}
                  variant="destructive"
                  size="icon-sm"
                  className="shrink-0 rounded-full shadow-none"
                  aria-label={uiT("stopGeneration")}
                >
                  <Square className="w-3 h-3" fill="currentColor" />
                </Button>
              ) : (
                <motion.div
                  key="send"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <Button
                    type="button"
                    onClick={handleSendWithSlash}
                    disabled={disabled || !hasText}
                    data-testid="mobile-composer-send"
                    variant="neutral"
                    size="icon-sm"
                    className="shrink-0 rounded-full h-10 w-10 shadow-none disabled:opacity-40"
                    aria-label={uiT("sendMessage")}
                  >
                    <ArrowUp className="w-[18px] h-[18px] md:w-4 md:h-4" strokeWidth={2.2} />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default memo(AnimatedInput);
