import Link from "next/link";
import { Logo } from "@/components/Logo";
import { EXTENSION_URL, GITHUB } from "@/lib/links";

const OCELABS = "https://ocelabs.xyz";

const columns = [
  {
    title: "Tandem",
    links: [
      { label: "Start a room", href: "/#start" },
      { label: "Plan a watch night", href: "/plan" },
      { label: "Guides", href: "/guides" },
      { label: "How it works", href: "/#sync" },
      { label: "Questions", href: "/#faq" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    title: "Extension",
    links: [
      { label: "Chrome · Edge · Brave", href: EXTENSION_URL, external: true },
      { label: "Supported sites", href: "/#sources" },
      { label: "Project on GitHub", href: GITHUB, external: true },
    ],
  },
  {
    title: "People",
    links: [
      { label: "ethan0c", href: GITHUB, external: true },
      { label: "ocelabs.xyz", href: OCELABS, external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="text-white">
      <div className="mx-auto site-width site-gutter pb-10 pt-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo size={30} light />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-zinc-400">
              Watch your favorite shows together, with your call beside the video.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-sm font-medium text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {"external" in l && l.external ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className="text-sm text-zinc-400 transition hover:text-white">
                        {l.label} ↗
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm text-zinc-400 transition hover:text-white">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 font-sans text-[11px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 tandem</span>
          <span>
            built by{" "}
            <a href={GITHUB} target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-white">
              ethan0c
            </a>{" "}
            /{" "}
            <a href={OCELABS} target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-white">
              ocelabs.xyz
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
