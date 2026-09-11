import { lazy, ComponentType } from "react";
import { recoverFromChunkLoadError } from "@/lib/chunkRecovery";

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(() => {
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        const error = new Error("ChunkLoadError: screen module timed out");
        error.name = "ChunkLoadError";
        reject(error);
      }, 12_000);
    });

    return Promise.race([factory(), timeout]).catch((error) => {
    // Browsers memoize failed module imports. Re-requesting the same URL only
    // delays the inevitable; one guarded reload obtains the current HTML and
    // its matching hashed chunks after a deployment.
      recoverFromChunkLoadError(error);
      throw error;
    });
  });
}
