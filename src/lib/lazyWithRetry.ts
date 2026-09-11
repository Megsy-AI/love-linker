import { lazy, ComponentType } from "react";
import { recoverFromChunkLoadError } from "@/lib/chunkRecovery";

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(() => factory().catch((error) => {
    // Browsers memoize failed module imports. Re-requesting the same URL only
    // delays the inevitable; one guarded reload obtains the current HTML and
    // its matching hashed chunks after a deployment.
    recoverFromChunkLoadError(error);
    throw error;
  }));
}
