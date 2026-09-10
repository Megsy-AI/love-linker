/**
 * @doc Mounts inside the router and records one page view per route change.
 * Deliberately renders nothing and swallows all errors.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { closePageView, trackPageView } from "@/lib/analytics/pageViews";

export default function PageViewTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    void trackPageView(pathname);
    const onHide = () => {
      if (document.visibilityState === "hidden") void closePageView();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", closePageView);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", closePageView);
    };
  }, [pathname]);

  return null;
}
