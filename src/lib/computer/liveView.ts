/**
 * @doc Tiny store holding the live screen of the computer run that is currently
 * working, so the composer can embed a small peek of it and expand it in place.
 * Only the surfaces that actually own a run (ComputerTaskCard, ComputerPreview)
 * publish here; the composer only reads.
 */
import { useEffect, useState } from "react";

export interface ComputerLiveView {
  /** Owning run/task id — used so a stale card cannot clear a newer run. */
  id: string;
  /** Live view iframe url, when the session exposes one. */
  url?: string | null;
  /** Last screenshot, used when there is no live url yet. */
  poster?: string | null;
  /** Real current activity line. */
  status?: string | null;
  /** True while the run is still working. */
  active: boolean;
}

let current: ComputerLiveView | null = null;
const listeners = new Set<(v: ComputerLiveView | null) => void>();

const emit = () => listeners.forEach((l) => l(current));

export function setComputerLiveView(view: ComputerLiveView) {
  const same =
    current &&
    current.id === view.id &&
    current.url === view.url &&
    current.poster === view.poster &&
    current.status === view.status &&
    current.active === view.active;
  if (same) return;
  current = view;
  emit();
}

// Dev-only handle so the composer dock can be reviewed visually without a
// real cloud run. Never used by app code.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__megsySetComputerLiveView = setComputerLiveView;
}

export function clearComputerLiveView(id: string) {
  if (!current || current.id !== id) return;
  current = null;
  emit();
}

export function useComputerLiveView(): ComputerLiveView | null {
  const [value, setValue] = useState<ComputerLiveView | null>(current);
  useEffect(() => {
    listeners.add(setValue);
    setValue(current);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}
