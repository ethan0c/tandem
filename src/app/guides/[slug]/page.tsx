import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/Button";
import { GuideShell } from "@/components/GuideShell";
import { guide, guides, type Block } from "@/content/guides";
import { SITE_URL } from "@/lib/links";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const g = guide((await params).slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    // Setting openGraph here replaces the root's, so the site name and preview image come along explicitly.
    openGraph: { type: "article", siteName: "Tandem", title: g.title, description: g.description, images: ["/opengraph-image.png"] },
    twitter: { card: "summary_large_image", title: g.title, description: g.description, images: ["/twitter-image.png"] },
  };
}

function Content({ block }: { block: Block }) {
  if ("h" in block) return <h2 className="mt-10 font-display text-xl font-medium">{block.h}</h2>;
  if ("p" in block) return <p className="mt-4 leading-relaxed text-zinc-300">{block.p}</p>;
  if ("steps" in block) {
    return (
      <ol className="mt-4 list-decimal space-y-2 pl-5 leading-relaxed text-zinc-300 marker:text-zinc-500">
        {block.steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
    );
  }
  return (
    <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-zinc-300 marker:text-zinc-500">
      {block.list.map((s) => <li key={s}>{s}</li>)}
    </ul>
  );
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const g = guide((await params).slug);
  if (!g) notFound();
  const others = guides.filter((o) => o.slug !== g.slug).slice(0, 3);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.description,
    dateModified: g.updated,
    url: `${SITE_URL}/guides/${g.slug}`,
    publisher: { "@type": "Organization", name: "Tandem", url: SITE_URL },
  };
  return (
    <GuideShell>
      <script
        type="application/ld+json"
        // Escaped so nothing in the text can close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <article>
        <p className="text-sm text-zinc-500">
          <Link href="/guides" className="hover:text-white">Guides</Link>
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium leading-tight tracking-[-0.03em] sm:text-4xl">{g.title}</h1>
        <p className="mt-3 font-sans text-xs text-zinc-500">Updated {new Date(`${g.updated}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        {g.body.map((block, i) => <Content key={i} block={block} />)}
      </article>
      <section className="mt-14 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-display text-xl font-medium">Watch together on Tandem</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">Free, no account. Your call sits beside the show, and playback stays in sync.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/#start" size="md">Create a room</ButtonLink>
          <ButtonLink href="/plan" variant="ghost" size="md">Plan a watch night</ButtonLink>
        </div>
      </section>
      <nav aria-label="More guides" className="mt-14">
        <h2 className="font-display text-lg font-medium">More guides</h2>
        <ul className="mt-4 space-y-3">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/guides/${o.slug}`} className="text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white hover:decoration-white">
                {o.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </GuideShell>
  );
}
