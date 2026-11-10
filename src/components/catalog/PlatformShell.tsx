"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, Library, MonitorPlay, Users, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import { useLibrary } from "./LibraryProvider";

const links = [{ href: "/discover", label: "Discover", icon: Compass }, { href: "/anime", label: "Anime", icon: MonitorPlay }, { href: "/manga", label: "Manga", icon: BookOpen }, { href: "/library", label: "Library", icon: Library }, { href: "/rooms", label: "Rooms", icon: Users }];
export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useLibrary();
  return <div className="platform flex min-h-screen flex-col">
    <header className="platform-header sticky top-0 z-40 border-b border-white/8">
      <HeaderFrame className="flex-wrap py-4 sm:flex-nowrap sm:py-0">
        <Link href="/" aria-label="Tandem home"><Logo size={29} /></Link>
        <nav aria-label="Main navigation" className="platform-nav order-3 flex w-full items-center justify-between gap-1 sm:order-none sm:w-auto sm:justify-center">
          {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs sm:px-3 sm:text-sm"><Icon className="size-3.5 sm:hidden" />{label}</Link>)}
        </nav>
        <Link href="/account" className="flex items-center gap-2 rounded-xl border border-white/12 px-3 py-2 text-xs text-zinc-300 hover:border-brand-400/50"><UserRound className="size-4" /><span>{user ? "My account" : "Sign in"}</span></Link>
      </HeaderFrame>
    </header>
    <main className="mx-auto w-full site-width flex-1 site-gutter pb-20 pt-8 sm:pt-10">{children}</main>
    <footer className="border-t border-white/8"><div className="mx-auto flex site-width flex-wrap items-center justify-between gap-4 site-gutter py-6 text-xs text-zinc-500"><span>Stories are better together.</span><div className="flex gap-5"><a href="https://kitsu.app" target="_blank" rel="noreferrer" className="hover:text-white">Catalog & artwork by Kitsu ↗</a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></div></footer>
  </div>;
}
