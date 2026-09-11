const CHUNK_ERROR_RE =
  /(Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError|Loading CSS chunk)/i;

const RECOVERY_KEY = "__megsy_chunk_recovery";
const RECOVERY_WINDOW_MS = 60_000;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error ?? "");
  return CHUNK_ERROR_RE.test(message);
}

/**
 * A failed ESM import is cached as rejected by the browser and React.lazy.
 * Re-rendering cannot recover it. A single document reload is the only safe
 * recovery after a rolling deploy; the time guard prevents reload loops.
 */
export function recoverFromChunkLoadError(error: unknown): boolean {
  if (!isChunkLoadError(error) || typeof window === "undefined") return false;

  try {
    const previous = Number(sessionStorage.getItem(RECOVERY_KEY) || "0");
    const now = Date.now();
    if (Number.isFinite(previous) && now - previous < RECOVERY_WINDOW_MS) return false;
    sessionStorage.setItem(RECOVERY_KEY, String(now));
  } catch {
    // Storage can be unavailable in private/embedded browsing. The in-memory
    // flag still guarantees one reload for this document.
    const marker = window as Window & { __megsyChunkReloading?: boolean };
    if (marker.__megsyChunkReloading) return false;
    marker.__megsyChunkReloading = true;
  }

  window.location.reload();
  return true;
}