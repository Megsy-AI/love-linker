/** @doc Payment options menu — minimal bordered rows, no icons, no descriptions. */
import { memo, useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { CreditCard, Smartphone, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserLang } from "@/lib/authI18n";

import { IOS_SPRING as iosSpring } from "@/pages/chat/constants/motion";

function useIsLightTheme() {
  const [light, setLight] = useState(
    typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-theme") === "light",
  );
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setLight(el.getAttribute("data-theme") === "light");
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    update();
    return () => obs.disconnect();
  }, []);
  return light;
}


export type PayOption = "global" | "local" | "wallets";
export type Gateway = PayOption; // backwards compat

const mobileFont =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (option: PayOption) => void | Promise<void>;
  loading?: PayOption | null;
  title?: string;
  subtitle?: string;
  /** Restrict which options are shown (e.g. Kashier-only on the Egypt site). */
  options?: PayOption[];
  /** Override the label of one or more options. */
  labels?: Partial<Record<PayOption, string>>;
}

const ROWS: Array<{ id: PayOption; label: string }> = [
  { id: "global", label: "Global" },
  { id: "local", label: "Local" },
  { id: "wallets", label: "E-Wallets" },
];

function PaymentGatewaySheetImpl({
  open,
  onClose,
  onSelect,
  loading = null,
  title = "Choose payment method",
  subtitle = "Pick an option.",
  options,
  labels,
}: Props) {
  useIsLightTheme();
  const lang = useUserLang();
  const isArabic = lang.startsWith("ar");
  const resolvedTitle = title === "Choose payment method" && isArabic ? "اختر طريقة الدفع" : title;
  const resolvedSubtitle = subtitle === "Pick an option." && isArabic ? "اختر الطريقة المناسبة لك." : subtitle;
  const localizedLabels: Partial<Record<PayOption, string>> = isArabic
    ? { global: "دفع دولي", local: "بطاقة بنكية", wallets: "محفظة إلكترونية" }
    : {};

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/25 sm:items-center"
    >
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
      />
      <motion.div
        data-plus-menu
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985 }}
        transition={{ duration: 0.16, ease: [0.22, 0.9, 0.3, 1] }}
        className="pointer-events-auto relative z-[101] flex w-full flex-col overflow-y-auto rounded-t-2xl border border-border bg-background px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] text-foreground shadow-lg sm:max-w-[420px] sm:rounded-2xl sm:px-5 md:max-h-[70vh]"
        style={{ fontFamily: mobileFont }}
      >
        <div className="sm:hidden pt-2.5 pb-2 flex items-center justify-center shrink-0">
          <div className="h-1 w-9 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="px-1 pt-1 pb-3">
          <p className="text-sm font-semibold leading-none">{resolvedTitle}</p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{resolvedSubtitle}</p>
        </div>

        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          {ROWS.filter((row) => !options || options.includes(row.id)).map((row) => {
            const isLoading = loading === row.id;
            const disabled = loading !== null && !isLoading;
            return (
              <Button
                data-no-neo
                key={row.id}
                type="button"
                disabled={disabled || isLoading}
                onClick={() => onSelect(row.id)}
                variant="ghost"
                className="h-14 w-full justify-start gap-3 rounded-none border-b border-border px-4 text-start last:border-b-0"
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-muted text-foreground">
                  {row.id === "wallets" ? <Smartphone className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                </span>
                <span className="flex-1 text-sm font-medium leading-tight">
                  {labels?.[row.id] ?? localizedLabels[row.id] ?? row.label}
                </span>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" />
                )}
              </Button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}


const PaymentGatewaySheet = memo(PaymentGatewaySheetImpl);
export default PaymentGatewaySheet;
