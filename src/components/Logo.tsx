/**
 * Tandem mark: two overlapping circles on a purple tile.
 * Two people, one screen.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tandem-tile" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#tandem-tile)" />
      <circle cx="25" cy="32" r="13" fill="#ffffff" fillOpacity="0.92" />
      <circle cx="39" cy="32" r="13" fill="#ffffff" fillOpacity="0.92" />
      <path
        d="M32 21.6a13 13 0 0 1 0 20.8a13 13 0 0 1 0-20.8z"
        fill="#6d28d9"
      />
    </svg>
  );
}

export function Logo({ size = 32, className = "", light = false }: { size?: number; className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span
        className={`font-semibold tracking-tight ${light ? "text-white" : "text-zinc-900"}`}
        style={{ fontSize: size * 0.62 }}
      >
        tandem
      </span>
    </span>
  );
}
