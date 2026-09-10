import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ComposerComputerContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const ComposerComputerContext = createContext<ComposerComputerContextValue | null>(null);

export function ComposerComputerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return (
    <ComposerComputerContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </ComposerComputerContext.Provider>
  );
}

export function useComposerComputer() {
  const ctx = useContext(ComposerComputerContext);
  if (!ctx) {
    throw new Error("useComposerComputer must be used within ComposerComputerProvider");
  }
  return ctx;
}
