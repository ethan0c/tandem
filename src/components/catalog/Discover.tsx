"use client";
import { CalendarHeart, Users } from "lucide-react";
import seed from "@/content/catalog.json";
import type { CatalogTitle } from "@/lib/catalog-types";
import type { HomeRows } from "@/lib/home-rows";
import { ButtonLink } from "@/components/Button";
import { MediaCard } from "./MediaCard";
import { MediaRow } from "./MediaRow";
import { Billboard } from "./Billboard";
import { useLibrary } from "./LibraryProvider";
import { resumeHref } from "./Library";

const titles = seed as CatalogTitle[];
const featuredNames = ["Your Name.", "Fullmetal Alchemist: Brotherhood", "Demon Slayer: Kimetsu no Yaiba", "A Silent Voice", "Attack on Titan"];
const featured = featuredNames
  .map((name) => titles.find((t) => t.title === name && t.cover))
  .filter((t): t is CatalogTitle => !!t);

export function Discover({ rows }: { rows: HomeRows }) {
  const { entries } = useLibrary();
  const continuing = entries
    .filter((e) => e.status === "current")
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 12);
  return (
    <>
      <h1 className="sr-only">Home</h1>
      <Billboard
        items={featured.length ? featured : titles.filter((t) => t.cover).slice(0, 5)}
        eyebrow={(media) => <span className="pill pill-brand">{media.kind}</span>}
      />
      <div className="rows">
        {continuing.length > 0 && (
          <MediaRow title="Continue watching & reading" href="/library" linkLabel="Your library">
            {continuing.map((e) => (
              <MediaCard
                key={`${e.media.kind}:${e.media.id}`}
                media={e.media}
                href={resumeHref(e) || undefined}
                progress={{
                  value: e.media.total ? e.progress / e.media.total : 0.08,
                  label: `${e.media.kind === "anime" ? "Episode" : "Chapter"} ${e.progress}${e.media.total ? ` of ${e.media.total}` : ""}`,
                }}
              />
            ))}
          </MediaRow>
        )}
        <CatalogRow items={rows.trending} title="Trending anime" href="/anime" eager />
        <CatalogRow items={rows.topAnime} title="Top 10 anime" ranked />
        <CatalogRow items={rows.manga} title="Popular manga" href="/manga" />
        <TogetherBand />
        <CatalogRow items={rows.romance} title="Date night: romance" />
        <CatalogRow items={rows.topManga} title="Top 10 manga" ranked />
        <CatalogRow items={rows.action} title="Action & adventure" />
      </div>
    </>
  );
}

function CatalogRow({ items, title, href, ranked = false, eager = false }: {
  items: CatalogTitle[];
  title: string;
  href?: string;
  ranked?: boolean;
  eager?: boolean;
}) {
  const shown = items.slice(0, ranked ? 10 : 18);
  if (!shown.length) return null;
  return (
    <MediaRow title={title} href={href} ranked={ranked}>
      {shown.map((media, index) => (
        <MediaCard
          key={`${media.kind}:${media.id}`}
          media={media}
          rank={ranked ? index + 1 : undefined}
          eager={eager && index < 4}
          sizes="(max-width: 479px) 42vw, (max-width: 767px) 30vw, (max-width: 1023px) 23vw, 200px"
        />
      ))}
    </MediaRow>
  );
}

function TogetherBand() {
  return (
    <section className="together-band" aria-labelledby="together-heading">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <h2 id="together-heading">Watch with someone</h2>
          <p className="mt-2 text-[15px] leading-relaxed">
            Create a room and send the link. Playback stays in sync and your video call stays on screen.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/rooms" variant="light" size="lg">
            <Users className="size-5" aria-hidden="true" />
            Create a room
          </ButtonLink>
          <ButtonLink href="/plan" variant="ghost" size="lg">
            <CalendarHeart className="size-5" aria-hidden="true" />
            Plan a night
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
