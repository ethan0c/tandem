import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "brand" | "dark" | "light" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

function classes(variant: Variant, size: Size, extra = "") {
  return `btn3d btn3d-${variant} btn3d-${size} ${extra}`.trim();
}

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

/** Chunky 3D button. Press it and it sinks into its shadow. */
export function Button({
  variant = "brand",
  size = "md",
  className = "",
  children,
  ...rest
}: BaseProps & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "brand",
  size = "md",
  className = "",
  children,
  href,
  ...rest
}: BaseProps & { href: string } & Omit<ComponentProps<"a">, "className" | "children" | "href">) {
  const external = /^https?:/.test(href);
  if (external) {
    return (
      <a href={href} className={classes(variant, size, className)} target="_blank" rel="noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
