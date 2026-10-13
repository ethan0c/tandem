/**
 * Tandem mark: two linked rings, like the wheels of a tandem bicycle.
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
      height={size * 0.625}
      viewBox="0 0 64 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="21" cy="20" r="15" stroke={color} strokeWidth="7" />
      <circle cx="43" cy="20" r="15" stroke={color} strokeWidth="7" />
    </svg>
  );
}

/** Tile version for favicons and app icons. */
export function LogoTile({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#7c3aed" />
      <circle cx="23" cy="32" r="13" stroke="#fff" strokeWidth="6" />
      <circle cx="41" cy="32" r="13" stroke="#fff" strokeWidth="6" />
    </svg>
  );
}

export function Logo({
  size = 32,
  className = "",
  light = false,
}: {
  size?: number;
  className?: string;
  light?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size * 1.15} color={light ? "#a78bfa" : "#7c3aed"} />
      <span
        className={`font-display font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}
        style={{ fontSize: size * 0.72, lineHeight: 1 }}
      >
        tandem
      </span>
    </span>
  );
}
