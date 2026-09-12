import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPayRegionOrGuess, setPayRegion, type PayRegion } from "@/lib/payRegion";
import { setUserLang } from "@/lib/authI18n";
import welcomeResearch from "@/assets/welcome-character-research-v2.jpg";
import welcomeCreate from "@/assets/welcome-character-create-v2.jpg";
import welcomePro from "@/assets/welcome-pro-card-blue.jpg";
import welcomeTrial from "@/assets/welcome-trial-korean-editorial-v1.jpg";
import "@/styles/welcome-showcase.css";

const AUTH_HERO_POSTER = "/route-assets/auth/auth-hero-v6-poster.jpg";
const AUTH_HERO_WEBM = "/route-assets/auth/auth-hero-v6.mp4";
const AUTH_HERO_MP4 = "/route-assets/auth/auth-hero-v6.mp4";

type Direction = "next" | "prev";

/** Index of the last onboarding slide (the free-trial offer). */
const LAST = 3;

const SCREENS = [
  {
    image: welcomeResearch,
    title: "Ask once. Get it done.",
    description: "Megsy researches, checks the facts, and turns your request into a finished report, plan, presentation, or completed task.",
    alt: "Korean fashion model wearing silver glasses against a blue cloud backdrop",
  },
  {
    image: welcomeCreate,
    title: "One idea. Every format.",
    description: "Create images, videos, presentations, websites, and working apps—from the same conversation.",
    alt: "Korean fashion model photographed from above in an early-2000s editorial style",
  },
] as const;

export default function FeatureShowcase({
  onFinish,
}: {
  onFinish?: (target?: "trial") => void;
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>("next");
  const touch = useRef({ x: 0, y: 0 });
  const [region] = useState<PayRegion>(() => getPayRegionOrGuess());
  const isPro = index === 2;
  const isTrial = index === LAST;

  useEffect(() => {
    setPayRegion(region);
    // The welcome showcase is always shown in English, regardless of region.
    void setUserLang("en", { syncRemote: false });
  }, [region]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyColor = document.body.style.backgroundColor;
    const previousHtmlColor = document.documentElement.style.backgroundColor;
    document.body.style.overflow = "hidden";
    document.body.style.backgroundColor = "hsl(var(--welcome-paper))";
    document.documentElement.style.backgroundColor = document.body.style.backgroundColor;
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.backgroundColor = previousBodyColor;
      document.documentElement.style.backgroundColor = previousHtmlColor;
    };
  }, [isPro]);

  const goTo = useCallback((target: number) => {
    setIndex((current) => {
      const nextIndex = Math.max(0, Math.min(LAST, target));
      if (nextIndex === current) return current;
      setDirection(nextIndex > current ? "next" : "prev");
      return nextIndex;
    });
  }, []);

  // Slide 2 pre-warms the sign-up screen: its code chunk and poster image only.
  // The hero video (6 MB) is deliberately NOT pre-fetched here: it is a desktop-
  // only decoration, and downloading it during onboarding stole all bandwidth
  // from the app itself, which is what made the first open feel slow on phones.
  useEffect(() => {
    if (index !== 1) return;
    void import("@/pages/auth/AuthPage").catch(() => {});
    const poster = new Image();
    poster.src = AUTH_HERO_POSTER;
  }, [index]);


  // Horizontal scroll (trackpad / mouse wheel) moves between slides.
  useEffect(() => {
    let locked = false;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) < 24 || Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (locked) return;
      locked = true;
      window.setTimeout(() => {
        locked = false;
      }, 450);
      goTo(index + (event.deltaX > 0 ? 1 : -1));
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [goTo, index]);

  const continueFlow = () => {
    if (isTrial) {
      onFinish?.("trial");
      return;
    }
    goTo(index + 1);
  };

  const finishWithoutOffer = () => onFinish?.();

  const onTouchStart = (event: React.TouchEvent) => {
    touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const dx = event.changedTouches[0].clientX - touch.current.x;
    const dy = event.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    goTo(dx < 0 ? index + 1 : index - 1);
  };

  return (
    <main
      dir="ltr"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="fixed inset-0 isolate h-[100dvh] w-full overflow-hidden bg-[hsl(var(--welcome-paper))]"
    >
      <h1 className="sr-only">Welcome to Megsy</h1>

      <section
        key={index}
        aria-live="polite"
        className={`flex h-full flex-col ${
          direction === "next" ? "welcome-screen-enter-next" : "welcome-screen-enter-prev"
        }`}
      >
        {isTrial ? (
          <TrialScreen />
        ) : isPro ? (
          <ProScreen />
        ) : (
          <IntroScreen screen={SCREENS[index]} eager={index === 0} />
        )}
      </section>

      <div
        className="absolute inset-x-0 bottom-0 z-20 bg-[hsl(var(--welcome-paper))] px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-5 sm:mx-auto sm:max-w-md"
      >
        <div className="mb-3 flex justify-center gap-2" aria-label={`Step ${index + 1} of 4`}>
          {[0, 1, 2, 3].map((step) => (
            <Button
              key={step}
              type="button"
              variant="ghost"
              data-plain
              aria-label={`Go to step ${step + 1}`}
              aria-current={step === index ? "step" : undefined}
              onClick={() => goTo(step)}
              className="grid h-6 w-7 min-w-0 place-items-center p-0 hover:bg-transparent"
            >
              <span
                className={`block h-1.5 rounded-full transition-[width,background-color] duration-200 ${
                  step === index
                    ? "w-7 bg-[hsl(var(--welcome-ink))]"
                    : "w-1.5 bg-[hsl(var(--welcome-ink)/.2)]"
                }`}
              />
            </Button>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          data-plain
          onClick={continueFlow}
          className="h-14 w-full rounded-md bg-[hsl(var(--welcome-ink))] text-base font-bold !text-[hsl(var(--welcome-paper))] shadow-none hover:bg-[hsl(var(--welcome-ink)/.9)]"
        >
          {isTrial ? "Start 3 days for $1" : "Continue"}
          {!isTrial && <ArrowRight className="size-5" />}
        </Button>

        {isTrial && (
          <Button
            type="button"
            variant="ghost"
            data-plain
            onClick={finishWithoutOffer}
            className="mt-2 h-10 w-full rounded-md text-sm font-semibold text-[hsl(var(--welcome-muted))] hover:bg-transparent"
          >
            Maybe later
          </Button>
        )}
      </div>
    </main>
  );
}

function IntroScreen({
  screen,
  eager,
}: {
  screen: (typeof SCREENS)[number];
  eager: boolean;
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col pb-36 sm:max-w-lg">
      <div className="relative h-[68dvh] min-h-[420px] max-h-[680px] w-full overflow-hidden">
        <img
          src={screen.image}
          alt={screen.alt}
          width={1024}
          height={1280}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[hsl(var(--welcome-paper))] to-transparent" />
      </div>

      <div className="relative z-10 px-7 pt-5 text-left">
        <h2 className="max-w-[330px] text-[38px] font-extrabold leading-[1.03] text-[hsl(var(--welcome-ink))] sm:text-[42px]">
          {screen.title}
        </h2>
        <p className="mt-4 max-w-[330px] text-[16px] font-medium leading-6 text-[hsl(var(--welcome-muted))]">
          {screen.description}
        </p>
      </div>
    </div>
  );
}

function ProScreen() {
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col pb-36 sm:max-w-lg">
      <div className="relative h-[68dvh] min-h-[420px] max-h-[680px] w-full overflow-hidden">
        <img
          src={welcomePro}
          alt="Woman holding a Megsy Pro card toward the camera"
          width={1024}
          height={1280}
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[hsl(var(--welcome-paper))] to-transparent" />
      </div>

      <div className="relative z-10 px-7 pt-5 text-left">
        <h2 className="max-w-[330px] text-[38px] font-extrabold leading-[1.03] text-[hsl(var(--welcome-ink))] sm:text-[42px]">
          Unlock more.
        </h2>
        <p className="mt-4 max-w-[330px] text-[16px] font-medium leading-6 text-[hsl(var(--welcome-muted))]">
          More powerful models, longer tasks, and bigger creations with Megsy Pro.
        </p>
      </div>
    </div>
  );
}
function TrialScreen() {
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col pb-44 sm:max-w-lg">
      <div className="relative h-[60dvh] min-h-[360px] max-h-[620px] w-full overflow-hidden">
        <img
          src={welcomeTrial}
          alt="Korean fashion model holding a translucent three-light membership card"
          width={1024}
          height={1280}
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-cover object-[center_38%]"
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[hsl(var(--welcome-paper))] to-transparent" />
      </div>

      <div className="relative z-10 px-7 pt-5 text-left">
        <h2 className="max-w-[330px] text-[38px] font-extrabold leading-[1.03] text-[hsl(var(--welcome-ink))] sm:text-[42px]">
          3 days for $1.
        </h2>
        <p className="mt-4 max-w-[330px] text-[16px] font-medium leading-6 text-[hsl(var(--welcome-muted))]">
          Get 3 premium images every day during your trial. Then continue for $7 in your first
          month with unlimited premium images, or cancel anytime.
        </p>
      </div>
    </div>
  );
}
