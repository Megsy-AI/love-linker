import { useEffect, useState } from "react";
import { m as motion } from "framer-motion";
import { t as uiT, useUserLang } from "@/lib/authI18n";
import MegsyStarGradient from "@/components/branding/MegsyStarGradient";

interface DesktopGreetingProps {
  userName: string | null | undefined;
  isFirstVisit: boolean;
  returningGreetingIdx: number;
}

// Keys resolved through the shared UI dictionary so the hero line follows the
// user's language instead of always rendering English.
const entryTaglineKeys = ["greeting1", "greeting2", "greeting3", "greeting4", "greeting5"];

/**
 * Chat empty-state greeting. The line changes once per page entry and then
 * stays fixed. Renders above the centered composer on desktop and centered
 * in the middle of the screen on mobile (positioned by ChatComposerSection).
 */
export const DesktopGreeting = (_: DesktopGreetingProps) => {
  const lang = useUserLang();
  const [taglineIdx, setTaglineIdx] = useState(0);

  useEffect(() => {
    const key = "megsy:desktop-greeting-index";
    const previous = Number(window.localStorage.getItem(key) || "-1");
    const next = Number.isFinite(previous) ? (previous + 1) % entryTaglineKeys.length : 0;
    window.localStorage.setItem(key, String(next));
    setTaglineIdx(next);
  }, []);

  const tagline = uiT(entryTaglineKeys[taglineIdx], lang);


  return (
    <>
      {/* Flat unified surface — decorative wave removed. */}

      <div className="relative z-[7] flex items-center justify-center px-6 md:pb-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-3 md:mb-4"
          >
            <MegsyStarGradient className="h-9 w-9 md:h-10 md:w-10" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <h1
              data-greeting
              className="max-w-3xl text-center text-[24px] font-normal leading-snug tracking-[-0.01em] text-foreground md:text-[30px] lg:text-[34px]"
            >
              {tagline}
            </h1>
          </motion.div>

        </motion.div>
      </div>
    </>
  );
};

export default DesktopGreeting;
