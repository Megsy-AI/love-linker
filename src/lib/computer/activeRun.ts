/** @doc Tiny store holding the id of the computer run that is currently active,
 * so the composer can turn its send button into a stop button. */
import { useEffect, useState } from "react";

/** Placeholder id used while a computer turn is starting but has no run id yet. */
export const PENDING_COMPUTER_RUN = "__pending__";

let current: string | null = null;
const listeners = new Set<(v: string | null) => void>();
let watchdog: ReturnType<typeof setTimeout> | null = null;

export function setActiveComputerRun(id: string | null) {
  if (current === id) return;
  current = id;
  listeners.forEach((l) => l(current));
  // Safety net: the composer must never stay locked on a stop button. A run
  // that never reports back is released automatically (2 minutes while it is
  // still starting, 15 minutes once it has a real id).
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
  if (id) {
    const ttl = id === PENDING_COMPUTER_RUN ? 120_000 : 15 * 60_000;
    watchdog = setTimeout(() => {
      if (current === id) setActiveComputerRun(null);
    }, ttl);
  }
}

/** The run currently occupying the composer, if any. */
export function getActiveComputerRun(): string | null {
  return current;
}

export function clearActiveComputerRun(id: string) {
  if (current === id) setActiveComputerRun(null);
}


export function useActiveComputerRun(): string | null {
  const [value, setValue] = useState<string | null>(current);
  useEffect(() => {
    listeners.add(setValue);
    setValue(current);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}
