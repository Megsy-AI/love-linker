async function unregisterAppSw(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
      // Only touch our app SW paths; leave megsy-push-sw.js alone.
      if (/\/sw\.js(\?|$)/.test(url) || /\/service-worker\.js(\?|$)/.test(url)) {
        try { await r.unregister(); } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}

export function registerAppServiceWorker(): void {
  if (typeof window === "undefined") return;
  // Route-level offline caching can serve an old index with deleted hashed
  // chunks after a deploy. Remove that worker permanently; browser HTTP cache
  // still caches immutable assets, while navigations always receive fresh HTML.
  void unregisterAppSw();
}
