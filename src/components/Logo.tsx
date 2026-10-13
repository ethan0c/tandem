/**
 * Tandem mark: two linked frames, representing a shared screen.
 */
export function LogoMark({
  size = 32,
  className = "",
  color = "#7c3aed",
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="5" stroke={color} strokeWidth="2.25" />
      <rect x="12" y="12" width="16" height="16" rx="5" stroke={color} strokeWidth="2.25" />
    </svg>
  );
}

/** Tile version for favicons and app icons. */
export function LogoTile({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#7c3aed" />
      <g transform="translate(8 8) scale(1.5)">
        <rect x="4" y="4" width="16" height="16" rx="5" stroke="#fff" strokeWidth="2.25" />
        <rect x="12" y="12" width="16" height="16" rx="5" stroke="#fff" strokeWidth="2.25" />
      </g>
    </svg>
  );
}

export function Logo({
  size = 32,
  className = "",
  light = true,
}: {
  size?: number;
  className?: string;
  light?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} color="#8b5cf6" />
      <span
        className={`font-sans font-medium tracking-[-0.045em] ${light ? "text-white" : "text-ink"}`}
        style={{ fontSize: size * 0.78, lineHeight: 1 }}
      >
        tandem
      </span>
    </span>
  );
}
