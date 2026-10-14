import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GuideShell } from "@/components/GuideShell";
import { guides } from "@/content/guides";

export const metadata: Metadata = {
  title: "Guides",
  description: "How to watch together when you are apart: YouTube, movies, video files, sharing a tab with sound, and date-night ideas.",
  alternates: { canonical: "/guides" },
};

export default function Guides() {
  return (
    <GuideShell>
      <h1 className="font-display text-4xl font-medium tracking-[-0.03em]">Watching together, apart</h1>
      <p className="mt-3 leading-relaxed text-zinc-400">Practical guides for watching the same thing at the same moment, from two different places.</p>
      <ul className="mt-10 divide-y divide-white/10 border-y border-white/10">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="group flex items-start justify-between gap-6 py-6">
              <span>
                <span className="block font-display text-lg font-medium group-hover:text-brand-200">{g.title}</span>
                <span className="mt-1.5 block text-sm leading-relaxed text-zinc-400">{g.description}</span>
              </span>
              <ArrowRight aria-hidden="true" className="mt-1.5 size-4 shrink-0 text-zinc-500 transition group-hover:translate-x-1 group-hover:text-white" />
            </Link>
          </li>
        ))}
      </ul>
    </GuideShell>
  );
}
