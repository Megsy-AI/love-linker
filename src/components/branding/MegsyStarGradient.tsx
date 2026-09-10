// Brand 8-point sparkle rendered with the Megsy gradient (blue → violet → warm).
// Used for the empty-state hero mark above the greeting line.

type Props = { className?: string };

const PATH =
  "M12 1.5c.4 0 .76.28.87.69l1.55 5.93a3 3 0 0 0 2.1 2.1l5.94 1.55a.9.9 0 0 1 0 1.74l-5.93 1.55a3 3 0 0 0-2.1 2.1l-1.55 5.94a.9.9 0 0 1-1.74 0l-1.55-5.93a3 3 0 0 0-2.1-2.1L1.55 13.5a.9.9 0 0 1 0-1.74l5.93-1.55a3 3 0 0 0 2.1-2.1l1.55-5.94c.11-.4.46-.67.87-.67Z";

const MegsyStarGradient = ({ className = "w-8 h-8" }: Props) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="megsyStarGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="hsl(212 96% 58%)" />
        <stop offset="38%" stopColor="hsl(268 88% 64%)" />
        <stop offset="70%" stopColor="hsl(340 86% 62%)" />
        <stop offset="100%" stopColor="hsl(28 96% 58%)" />
      </linearGradient>
    </defs>
    <path d={PATH} fill="url(#megsyStarGrad)" />
  </svg>
);

export default MegsyStarGradient;
