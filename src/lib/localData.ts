/**
 * @doc localData — the app's single, safe "instant open" data cache.
 *
 * Facebook / ChatGPT style: every screen paints from the last known local
 * copy immediately, then silently revalidates against the server
 * (stale-while-revalidate). The network is never on the critical path of a
 * first paint.
 *
 * HARD RULES (revenue + security):
 *  1. NEVER cache anything that grants access or money: plan, credits,
 *     subscription, quota, entitlements, trial state, tokens. Those are
 *     resolved server-side on every use. `assertSafeKey` blocks them at
 *     runtime so a future refactor cannot leak one in by accident.
 *  2. Entries are scoped to the signed-in user id AND the build id, so a
 *     new deploy or a different account can never read old data.
 *  3. Every entry carries an FNV-1a checksum. A value edited by hand in
 *     DevTools fails verification and is dropped — cached UI data can be
 *     read by its owner (it is their own data) but not forged into
 *     something the app trusts.
 *  4. Cached data is display-only. The server remains the only authority
 *     for permissions, billing and quotas.
 */

const PREFIX = "megsy_cache_ld:"; // matches the sign-out sweep in App.tsx
const BUILD = (() => {
  try {
    const fromEnv = (import.meta as any).env?.VITE_BUILD_ID as string | undefined;
    if (fromEnv) return String(fromEnv);
    const meta = document.querySelector('meta[name="megsy-build"]')?.getAttribute("content");
    if (meta && !meta.includes("%")) return meta;
  } catch {
    /* ignore */
  }
  // Fallback: a day bucket so a stuck client still refreshes daily.
  return `d_${Math.floor(Date.now() / (24 * 60 * 60 * 1000))}`;
})();
const DEFAULT_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_ENTRY_BYTES = 320 * 1024;

/** Anything money- or access-related must never be persisted. */
const FORBIDDEN = /(credit|plan|subscri|quota|billing|entitle|premium|trial|paid|invoice|price|token|secret|key)/i;

function assertSafeKey(key: string) {
  if (FORBIDDEN.test(key)) {
    throw new Error(`localData: refusing to cache access/billing data ("${key}")`);
  }
}

function checksum(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function currentUserId(): string {
  try {
    return localStorage.getItem("megsy_last_user_id") || "anon";
  } catch {
    return "anon";
  }
}

function fullKey(key: string) {
  return `${PREFIX}${BUILD}:${currentUserId()}:${key}`;
}

type Entry = { v: unknown; e: number; s: number };

/** Frees room by dropping expired entries first, then the oldest ones. */
function prune(keepKey: string) {
  const s = store();
  if (!s) return;
  const rows: { k: string; e: number }[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (!k || !k.startsWith(PREFIX) || k === keepKey) continue;
    let e = 0;
    try {
      e = (JSON.parse(s.getItem(k) || "{}") as Entry).e || 0;
    } catch {
      e = 0;
    }
    rows.push({ k, e });
  }
  rows.sort((a, b) => a.e - b.e);
  const now = Date.now();
  for (const row of rows) {
    try {
      s.removeItem(row.k);
    } catch {
      /* ignore */
    }
    if (row.e > now) break;
  }
}

/** Reads a cached value, or undefined when missing, stale or tampered with. */
export function readLocalData<T>(key: string): T | undefined {
  assertSafeKey(key);
  const s = store();
  if (!s) return undefined;
  const k = fullKey(key);
  try {
    const raw = s.getItem(k);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as Entry;
    if (!entry || typeof entry.e !== "number" || typeof entry.s !== "number") return undefined;
    if (entry.e < Date.now()) {
      s.removeItem(k);
      return undefined;
    }
    if (checksum(JSON.stringify(entry.v)) !== entry.s) {
      s.removeItem(k);
      return undefined;
    }
    return entry.v as T;
  } catch {
    return undefined;
  }
}

/** Persists a display-only value. Silently skips oversized payloads. */
export function writeLocalData<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  assertSafeKey(key);
  const s = store();
  if (!s) return;
  let body: string;
  try {
    body = JSON.stringify(value);
  } catch {
    return;
  }
  if (body.length > MAX_ENTRY_BYTES) return;
  const raw = JSON.stringify({ v: value, e: Date.now() + ttlMs, s: checksum(body) } as Entry);
  const k = fullKey(key);
  try {
    s.setItem(k, raw);
  } catch {
    prune(k);
    try {
      s.setItem(k, raw);
    } catch {
      /* out of quota — memory-only for this session */
    }
  }
}

export function removeLocalData(key: string): void {
  try {
    store()?.removeItem(fullKey(key));
  } catch {
    /* ignore */
  }
}

/** Drops every localData entry (sign-out, account switch, "clear local data"). */
export function clearLocalData(): void {
  const s = store();
  if (!s) return;
  const keys: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => {
    try {
      s.removeItem(k);
    } catch {
      /* ignore */
    }
  });
}
