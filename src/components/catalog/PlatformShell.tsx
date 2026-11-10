"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { Suspense, type ReactNode } from "react";
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
export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <div className="platform flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="platform-main mx-auto w-full site-width flex-1 site-gutter pb-20 pt-8 sm:pt-10">
        {children}
      </main>
      <footer className="border-t border-white/8">
        <div className="mx-auto flex site-width flex-wrap items-center justify-between gap-4 site-gutter py-6 text-xs text-muted">
          <span>Shows in sync. Time together.</span>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <a
              href="https://kitsu.app"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              Catalog & artwork by Kitsu ↗
            </a>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
function ActiveNavigation() {
  return <Navigation pathname={usePathname()} />;
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

export function PlatformHeader() {
  const { user } = useLibrary();
  return (
    <header className="platform-header sticky top-0 z-40 border-b border-white/8">
      <HeaderFrame className="platform-header-frame">
        <Link href="/" aria-label="Tandem home" className="platform-brand">
          <Logo size={24} />
        </Link>
        <Suspense fallback={<Navigation pathname="" />}>
          <ActiveNavigation />
        </Suspense>
        <div className="platform-header-actions">
          <Link
            href="/account"
            aria-label={user ? "My account" : "Sign in"}
            className="platform-account"
          >
            <UserRound className="size-4" />
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
