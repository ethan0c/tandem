"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
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
      <div className="page-heading">
        <h1>Find something to share.</h1>
        <p>Anime, manga, and a place to keep your favorites.</p>
      </div>
      <section className="discovery-hero relative isolate overflow-hidden rounded-2xl border border-white/10">
        {featured.cover && (
          <Image
            src={featured.cover}
            alt=""
            fill
            preload
            sizes="(max-width: 700px) 100vw, 1200px"
            className="-z-20 object-cover object-center"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#121018] via-[#121018]/85 to-[#121018]/25" />
        <div className="discovery-copy">
          <p className="text-sm text-zinc-300">Tonight’s pick</p>
          <h2>{featured.title}</h2>
          <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-300">
            A connection that crosses time. Pick a story, then bring your
            favorite person.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={titleHref(featured)}>
              View series <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/rooms" variant="ghost">
              Create a room
            </ButtonLink>
          </div>
        </div>
      </section>
      {continuing.length > 0 && (
        <section className="catalog-section">
          <div className="section-heading">
            <h2>Continue</h2>
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
      <CatalogSection kind="anime" title="Popular anime" />
      <CatalogSection kind="manga" title="Popular manga" />
      <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-6 text-sm text-zinc-400">
        <Link href="/library/import" className="hover:text-white">
          Import your manga list →
        </Link>
        <Link href="/plan" className="hover:text-white">
          Plan a watch night →
        </Link>
      </div>
    </>
  );
}
function CatalogSection({
  kind,
  title,
}: {
  kind: "anime" | "manga";
  title: string;
}) {
  return (
    <section className="catalog-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <Link href={`/${kind}`}>
          View all <ArrowRight />
        </Link>
      </div>
      <div className="media-grid">
        {titles
          .filter((t) => t.kind === kind)
          .slice(0, 6)
          .map((media) => (
            <MediaCard key={media.id} media={media} />
          ))}
      </div>
    </section>
  );
}
