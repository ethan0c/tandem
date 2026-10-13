import Link from "next/link";
import { ArrowUpRight, Globe } from "lucide-react";
import { Logo } from "@/components/Logo";

const GITHUB = "https://github.com/ethan0c";
const OCELABS = "https://ocelabs.xyz";

function GithubIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.2.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how" },
      { label: "Video sources", href: "#faq" },
      { label: "Start a room", href: "#start" },
    ],
  },
  {
    title: "Open source",
    links: [
      { label: "GitHub", href: GITHUB, external: true },
      { label: "Report a bug", href: GITHUB, external: true },
      { label: "Self-host guide", href: GITHUB, external: true },
    ],
  },
  {
    title: "Made by",
    links: [
      { label: "ethan0c", href: GITHUB, external: true },
      { label: "ocelabs.xyz", href: OCELABS, external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50/80">
      <div className="mx-auto max-w-6xl px-5 pb-8 pt-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Logo size={28} />
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              Synced playback and a face-to-face call in one tab. Built for two people who miss watching things
              together.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a
                href={GITHUB}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="btn3d btn3d-light btn3d-icon !h-10 !w-10 text-zinc-700"
              >
                <GithubIcon className="size-[18px]" />
              </a>
              <a
                href={OCELABS}
                target="_blank"
                rel="noreferrer"
                aria-label="ocelabs.xyz"
                className="btn3d btn3d-light btn3d-icon !h-10 !w-10 text-zinc-700"
              >
                <Globe className="size-[18px]" />
              </a>
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label + l.href}>
                    {"external" in l && l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="group inline-flex items-center gap-1 text-sm text-zinc-600 transition hover:text-brand-700"
                      >
                        {l.label}
                        <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm text-zinc-600 transition hover:text-brand-700">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-6 text-xs text-zinc-500 sm:flex-row">
          <p>© 2026 Tandem. Open source, MIT.</p>
          <p className="flex items-center gap-1.5">
            Made with <span className="text-brand-600">♥</span> by{" "}
            <a href={GITHUB} target="_blank" rel="noreferrer" className="font-medium text-zinc-700 hover:text-brand-700">
              ethan0c
            </a>{" "}
            at{" "}
            <a href={OCELABS} target="_blank" rel="noreferrer" className="font-medium text-zinc-700 hover:text-brand-700">
              ocelabs.xyz
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
