"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, UserRound } from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import { useLibrary } from "./LibraryProvider";
import { ButtonLink } from "@/components/Button";

const links = [
  { href: "/", label: "Home" },
  { href: "/anime", label: "Anime" },
  { href: "/manga", label: "Manga" },
  { href: "/library", label: "Library" },
];
const footerColumns: [string, [string, string][]][] = [
  ["Browse", [["Home", "/"], ["Anime", "/anime"], ["Manga", "/manga"], ["Your library", "/library"]]],
  ["Together", [["Create a room", "/rooms"], ["Plan a watch night", "/plan"], ["How Tandem works", "/about"], ["Guides", "/guides"]]],
  ["About", [["Privacy", "/privacy"], ["Terms", "/terms"], ["Catalog & artwork by Kitsu", "https://kitsu.app"]]],
];

export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <div className="platform flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="platform-main mx-auto w-full site-width flex-1 site-gutter pb-12">
        {children}
      </main>
      <Suspense fallback={<SiteFooter />}><RouteFooter /></Suspense>
    </div>
  );
}

/** Focused screens such as sign-in skip the footer so they fit in one view. */
function RouteFooter() {
  return usePathname().startsWith("/account") ? null : <SiteFooter />;
}

function SiteFooter() {
  return (
      <footer className="mt-16 border-t border-white/[0.06]">
        <div className="mx-auto grid site-width gap-8 site-gutter py-10 text-sm text-muted sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo size={20} />
            <p className="mt-3 max-w-xs text-[13px] leading-6">Shows in sync. Time together. Anime and manga, with your favorite person beside you.</p>
          </div>
          {footerColumns.map(([heading, items]) => (
            <nav key={heading} aria-label={heading}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-300">{heading}</h2>
              <ul className="mt-3 space-y-2 text-[13px]">
                {items.map(([label, href]) => (
                  <li key={href}>
                    {href.startsWith("http") ? (
                      <a href={href} target="_blank" rel="noreferrer" className="hover:text-white">{label} ↗</a>
                    ) : (
                      <Link href={href} className="hover:text-white">{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </footer>
  );
}
function ActiveNavigation() {
  return <Navigation pathname={usePathname()} />;
}
function HeaderSearch() {
  const pathname = usePathname();
  const target = /^\/(manga|title\/manga|play\/manga|read)(\/|$)/.test(pathname) ? "/manga" : "/anime";
  return (
    <>
      <form action={target} className="platform-quick-search relative" role="search">
        <label htmlFor="platform-search" className="sr-only">Search {target === "/anime" ? "anime" : "manga"}</label>
        <input id="platform-search" name="q" type="search" placeholder={`Search ${target === "/anime" ? "anime" : "manga"}`} className="field w-full pr-3" />
        <button type="submit" aria-label="Search titles" className="absolute left-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-zinc-300 hover:text-white">
          <Search className="size-4" />
        </button>
      </form>
      <Link href={target} aria-label="Search titles" className="platform-mobile-search" ><Search className="size-4" /></Link>
    </>
  );
}
function Navigation({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main navigation" className="platform-nav">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            pathname === href ? "page" :
            (href !== "/" && pathname.startsWith(`${href}/`)) ||
            ((href === "/anime" || href === "/manga") &&
              (pathname.startsWith(`/title${href}/`) || pathname.startsWith(`/play${href}/`)))
              ? "location" : undefined
          }
          className="platform-nav-link"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** True while the page sits at the very top, so the header can stay a soft scrim over heroes. */
function useAtTop() {
  const [top, setTop] = useState(true);
  useEffect(() => {
    const update = () => setTop(window.scrollY < 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return top;
}

export function PlatformHeader() {
  const { user } = useLibrary();
  const top = useAtTop();
  return (
    <header className="platform-header sticky top-0 z-40" data-top={top}>
      <HeaderFrame className="platform-header-frame">
        <Link href="/" aria-label="Tandem home" className="platform-brand">
          <Logo size={24} />
        </Link>
        <Suspense fallback={<Navigation pathname="" />}>
          <ActiveNavigation />
        </Suspense>
        <div className="platform-header-actions">
          <Suspense fallback={null}><HeaderSearch /></Suspense>
          <Link
            href="/account"
            aria-label={user ? "My account" : "Sign in"}
            className="platform-account"
          >
            <span className="platform-avatar" aria-hidden="true"><UserRound className="size-4" /></span>
            <span>{user ? "Account" : "Sign in"}</span>
          </Link>
          <ButtonLink href="/rooms" size="sm">
            Create a room
          </ButtonLink>
        </div>
      </HeaderFrame>
    </header>
  );
}
