import type { ReactNode } from "react";

/** Shared header geometry across public pages and the room overlay. */
export function HeaderFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`site-header mx-auto flex site-width items-center justify-between gap-3 site-gutter ${className}`}>
      {children}
    </div>
  );
}
