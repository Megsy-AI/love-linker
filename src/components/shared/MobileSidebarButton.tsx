import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileSidebarButtonProps {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
  testId?: string;
  /**
   * Anchor the button to the inline-start edge of the viewport (same spot the
   * chat header uses) instead of letting it flow inside a centered container.
   * Keeps the toggle in an identical position on every page and in both
   * text directions.
   */
  edge?: boolean;
}

/** Unified mobile sidebar toggle button used across all pages. */
export function MobileSidebarButton({
  onClick,
  className,
  ariaLabel = "Open menu",
  testId,
  edge = false,
}: MobileSidebarButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid={testId}
      variant="ghost"
      size="icon-sm"
      className={cn(
        "md:hidden h-11 w-11 rounded-full bg-transparent text-foreground shadow-none hover:bg-transparent",
        edge &&
          "fixed z-30 start-3 top-[calc(var(--promo-banner-h,0px)+max(env(safe-area-inset-top),0.25rem)+0.375rem)]",
        className,
      )}
    >

      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="h-[22px] w-[22px]"
      >
        <rect
          x="3.25"
          y="4.5"
          width="17.5"
          height="15"
          rx="3.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <line x1="9.25" y1="4.5" x2="9.25" y2="19.5" stroke="currentColor" strokeWidth="1.6" />
        <line
          x1="5.5"
          y1="9"
          x2="7"
          y2="9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <line
          x1="5.5"
          y1="12"
          x2="7"
          y2="12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <line
          x1="5.5"
          y1="15"
          x2="7"
          y2="15"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </Button>
  );
}

export default MobileSidebarButton;
