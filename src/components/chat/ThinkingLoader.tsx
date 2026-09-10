import { memo } from "react";

import MegsyStar from "@/components/branding/MegsyStar";
import { t as uiT, useUserLang } from "@/lib/authI18n";

interface ThinkingLoaderProps {
  searchStatus?: string;
}

const ThinkingLoader = ({ searchStatus }: ThinkingLoaderProps) => {
  const lang = useUserLang();
  const starClass = "text-[var(--megsy-blue)]";
  const thinkingLabel = uiT("thinking", lang);
  const rtl = lang === "ar-eg";
  return (
    <div className="flex items-center gap-2 py-1" aria-live="polite" dir={rtl ? "rtl" : undefined}>
      <MegsyStar className={`h-4 w-4 ${starClass}`} />
      <span className="ai-shimmer text-[13px] font-medium motion-reduce:animate-none">
        {searchStatus?.trim() || thinkingLabel}
      </span>
    </div>
  );
};

export default memo(ThinkingLoader);
