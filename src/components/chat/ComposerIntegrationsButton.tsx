import { Blocks } from "lucide-react";
import { useEffect, useState } from "react";
import { useConnectedApps } from "@/hooks/useConnectedApps";
import { Button } from "@/components/ui/button";

interface Props {
  onClick: () => void;
  label?: string;
}

/**
 * Composer integrations control.
 * - No connected apps → generic integrations glyph.
 * - One app → that app's real logo.
 * - Many apps → a clean overlapped stack of up to 3 logos (+N).
 * Fully transparent: no background, no border.
 */
const prefetchIntegrationsSheet = () => {
  void import("@/components/chat/IntegrationsSheet");
  void import("@/pages/chat/components/DraggablePlusSheet");
};

function ConnectedAppLogo({ name, domain }: { name: string; domain?: string }) {
  const sources = domain
    ? [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        `https://unavatar.io/${domain}?fallback=false`,
      ]
    : [];
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex];

  return source ? (
    <img
      src={source}
      alt={name}
      width={24}
      height={24}
      loading="lazy"
      className="h-full w-full object-contain p-1"
      onError={() => setSourceIndex((current) => current + 1)}
    />
  ) : (
    <span className="text-[10px] font-semibold text-foreground/80">{name.slice(0, 1)}</span>
  );
}

export function ComposerIntegrationsButton({ onClick, label = "Integrations" }: Props) {
  const apps = useConnectedApps();
  const shown = apps.slice(0, 3);
  const extra = apps.length - shown.length;

  useEffect(() => {
    if (window.requestIdleCallback) {
      const idleId = window.requestIdleCallback(prefetchIntegrationsSheet);
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId: ReturnType<typeof setTimeout> = globalThis.setTimeout(
      prefetchIntegrationsSheet,
      300,
    );
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return (
    <Button
      type="button"
      onClick={onClick}
      onPointerDown={(event) => {
        event.preventDefault();
        prefetchIntegrationsSheet();
      }}
      aria-label={label}
      variant="ghost"
      size="icon-sm"
      className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
    >
      {shown.length === 0 ? (
        <Blocks className="w-[20px] h-[20px] text-foreground/70" strokeWidth={1.9} />
      ) : (
        <span className="flex items-center">
          {shown.map((a, i) => (
            <span
              key={a.app}
              className="inline-flex items-center justify-center w-6 h-6 rounded-full overflow-hidden bg-foreground/10 ring-1 ring-background"
              style={{ marginInlineStart: i === 0 ? 0 : -8, zIndex: 10 - i }}
            >
              <ConnectedAppLogo name={a.name} domain={a.domain} />
            </span>
          ))}
          {extra > 0 && (
            <span className="ms-1 text-[11px] font-semibold text-foreground/60">+{extra}</span>
          )}
        </span>
      )}
    </Button>
  );
}

export default ComposerIntegrationsButton;
