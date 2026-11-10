"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Heart, Import, Play, Users } from "lucide-react";
import seed from "@/content/catalog.json";
import { titleHref, type CatalogTitle } from "@/lib/catalog-types";
import { ButtonLink } from "@/components/Button";
import { MediaCard } from "./MediaCard";
import { useLibrary } from "./LibraryProvider";

const titles = seed as CatalogTitle[];
export function Discover() {
  const { entries } = useLibrary();
  const continuing = entries
    .filter((e) => e.status === "current")
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);
  const featured = titles.find((t) => t.title === "Your Name.") || titles[0];
  return (
    <>
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">A little closer, one story at a time</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
            Find your next favorite.
          </h1>
        </div>
        <span className="hidden items-center gap-1.5 pb-1 text-xs text-zinc-400 sm:flex">
          <Heart className="size-3 text-brand-400" />
          Made for you. Better with two.
        </span>
      </div>
      <section className="discovery-hero relative isolate overflow-hidden rounded-3xl border border-white/10">
        {featured.cover && (
          <Image
            src={featured.cover}
            alt=""
            fill
            priority
            sizes="1200px"
            unoptimized
            className="-z-20 object-cover object-center"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#121018] via-[#121018]/90 to-[#121018]/20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#121018] via-transparent to-transparent" />
        <div className="relative max-w-xl px-7 py-12 sm:px-12 sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-300/20 bg-brand-500/10 px-3 py-1.5 text-[11px] text-brand-200">
            <span className="size-1.5 rounded-full bg-brand-400" />
            YOUR STORIES. YOUR PEOPLE.
          </span>
          <h2 className="mt-6 font-display text-4xl font-medium leading-[1.12] tracking-[-0.045em] sm:text-5xl">
            One more episode.
            <br />
            <span className="text-brand-300">One more chapter.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-zinc-300">
            Find something you love. Keep your place. Share the good parts with
            your favorite person.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/anime">
              <Play className="size-4" />
              Explore anime
            </ButtonLink>
            <ButtonLink href="/manga" variant="ghost">
              <BookOpen className="size-4" />
              Find a manga
            </ButtonLink>
          </div>
        </div>
        <Link
          href={titleHref(featured)}
          className="absolute bottom-7 right-8 hidden text-right sm:block"
        >
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/50">
            In the spotlight
          </span>
          <span className="mt-1 block text-lg font-medium">
            {featured.title} <ArrowRight className="ml-1 inline size-4" />
          </span>
          <span className="mt-1 block text-xs text-zinc-400">
            A connection that crosses time.
          </span>
        </Link>
      </section>
      <div className="my-8 grid gap-3 md:grid-cols-3">
        {[
          {
            icon: Users,
            title: "Make a night of it",
            text: "One link. The two of you. In sync.",
            href: "/rooms",
          },
          {
            icon: BookOpen,
            title: "Pick up where you left off",
            text: "Your anime and manga, in one library.",
            href: "/library",
          },
          {
            icon: Import,
            title: "Bring your favorites along",
            text: "Import your manga list and progress.",
            href: "/library/import",
          },
        ].map(({ icon: Icon, title, text, href }) => (
          <Link
            key={href}
            href={href}
            className="feature-link flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-300">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium">{title}</span>
              <span className="mt-1 block text-[11px] text-zinc-500">
                {text}
              </span>
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-zinc-600" />
          </Link>
        ))}
      </div>
      {continuing.length > 0 && (
        <section className="catalog-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Right where you left it</p>
              <h2>Continue your story</h2>
            </div>
            <Link href="/library">
              Your library <ArrowRight />
            </Link>
          </div>
          <div className="media-grid">
            {continuing.map((e) => (
              <div key={`${e.media.kind}:${e.media.id}`}>
                <MediaCard media={e.media} />
                <p className="mt-2 text-xs text-brand-300">
                  {e.media.kind === "anime" ? "Episode" : "Chapter"}{" "}
                  {e.progress}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      <CatalogSection
        kind="anime"
        title="Worth pressing play."
        eyebrow="Popular anime"
      />
      <section className="together-banner my-12 flex flex-col items-start justify-between gap-5 rounded-2xl border border-brand-400/20 px-7 py-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-5">
          <span className="hidden size-12 place-items-center rounded-2xl border border-brand-300/20 bg-brand-500/20 text-brand-300 sm:grid">
            <Users />
          </span>
          <div>
            <h2 className="text-xl font-medium tracking-tight">
              Distance doesn’t get the last word.
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Watch in sync or turn the page together. No account needed.
            </p>
          </div>
        </div>
        <ButtonLink href="/rooms" size="md">
          Find your room <ArrowRight className="size-4" />
        </ButtonLink>
      </section>
      <CatalogSection
        kind="manga"
        title="A good place to get lost."
        eyebrow="Popular manga"
      />
    </>
  );
}
function CatalogSection({
  kind,
  title,
  eyebrow,
}: {
  kind: "anime" | "manga";
  title: string;
  eyebrow: string;
}) {
  return (
    <section className="catalog-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <Link href={`/${kind}`}>
          View all <ArrowRight />
        </Link>
      </div>
      <div className="media-grid">
        {titles
          .filter((t) => t.kind === kind)
          .slice(0, 6)
          .map((media, i) => (
            <MediaCard key={media.id} media={media} rank={i + 1} />
          ))}
      </div>
      <p className="mt-4 text-[10px] text-zinc-600">
        A selection from Kitsu’s popular titles. Explore the catalog for live
        results.
      </p>
    </section>
  );
}
