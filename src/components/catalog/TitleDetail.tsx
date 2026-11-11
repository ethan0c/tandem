"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  Check,
  Heart,
  Play,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import seed from "@/content/catalog.json";
import {
  mediaKey,
  libraryStatuses,
  type CatalogTitle,
  type LibraryEntry,
  type LibraryStatus,
  type MediaKind,
} from "@/lib/catalog-types";
import { newRoomId } from "@/lib/room-id";
import { Button, ButtonLink } from "@/components/Button";
import { useLibrary } from "./LibraryProvider";
import { ContentChapters } from "./ContentChapters";
import { TitleSkeleton } from "./LoadingStates";
import { useTitlePreview } from "./useTitlePreview";
import { useContent } from "./useContent";
import { resumeHref } from "./Library";
import type { ContentUnit } from "@/lib/content-types";
import { fetchPublicCatalog } from "@/lib/public-catalog-client";
import { canOptimizeArtwork, largeArtwork } from "@/lib/artwork";
import { catalogFormatLabel } from "@/lib/catalog-formats";

/** Where the main button goes: the saved place if there is one, otherwise the first episode or chapter. */
function playTarget(kind: MediaKind, id: string, units: ContentUnit[], entry?: LibraryEntry) {
  const href = (unit: string) => `/play/${kind}/${id}?${new URLSearchParams({ unit, language: "en" })}`;
  const resume = entry && resumeHref(entry);
  if (resume) return { href: resume, label: "Resume" };
  const chapter = kind === "manga" ? entry?.readingPosition?.chapter : undefined;
  const saved = chapter ? units.find((unit) => unit.number === chapter) : undefined;
  if (saved) return { href: href(saved.id), label: `Continue ch. ${saved.number}` };
  const playable = units.filter((unit) => !unit.group || unit.group === "Sub");
  const first = (playable.length ? playable : units).reduce<ContentUnit | undefined>(
    (lowest, unit) => (!lowest || unit.number < lowest.number ? unit : lowest), undefined);
  if (first) return { href: href(first.id), label: kind === "anime" ? "Play" : "Read ch. " + first.number };
  return { href: "#episodes", label: kind === "anime" ? "Episodes" : "Chapters" };
}

const statusLabels: Record<string, string> = { current: "Ongoing", finished: "Finished", upcoming: "Upcoming", tba: "TBA", unreleased: "Unreleased" };

export function TitleDetail({ kind, id }: { kind: MediaKind; id: string }) {
  const [fetchedMedia, setMedia] = useState<CatalogTitle | null>(
    () =>
      (seed as CatalogTitle[]).find((t) => t.id === id && t.kind === kind) ||
      null,
  );
  const [providers, setProviders] = useState<{ name: string; url: string }[]>(
    [],
  );
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [trailer, setTrailer] = useState(false);
  const { entries, save, ready } = useLibrary();
  const router = useRouter();
  const entry = entries.find((e) => mediaKey(e.media) === `${kind}:${id}`);
  const preview = useTitlePreview(kind, id);
  const media = fetchedMedia || preview || entry?.media || null;
  const [progress, setProgress] = useState<string | null>(null);
  const content = useContent(kind, id);
  const play = playTarget(kind, id, content.data?.units || [], entry);
  useEffect(() => {
    const controller = new AbortController();
    fetchPublicCatalog<{ title: CatalogTitle; providers: { name: string; url: string }[] }>(`/api/catalog?kind=${kind}&id=${id}`, retry > 0)
      .then((data) => {
        if (controller.signal.aborted) return;
        setMedia(data.title);
        setProviders(data.providers);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [kind, id, retry]);
  if (!media && busy) return <TitleSkeleton />;
  if (!media)
    return (
      <div className="empty-state">
        <h1>Title unavailable</h1>
        <p>{error}</p>
        <Button variant="ghost" onClick={() => { setBusy(true); setError(""); setRetry((value) => value + 1); }}>Try again</Button>
        <ButtonLink href={`/${kind}`} variant="ghost">
          Back to {kind}
        </ButtonLink>
      </div>
    );
  function startTogether() {
    if (!media) return;
    const room = newRoomId();
    router.push(
      `/${kind === "manga" ? "read" : "room"}/${room}?${new URLSearchParams({ title: media.title, media: media.id, kind })}`,
    );
  }
  const unit = kind === "anime" ? "episode" : "chapter";
  const backdrop = media.cover ? largeArtwork(media.cover) : media.poster;
  const synopsis = media.synopsis.replace(/\s*\(Source:[^)]*\)\s*$/, "");
  return (
    <>
      <section className="title-hero bleed under-header">
        <div className="title-banner" aria-hidden="true">
          {backdrop && (
            <Image
              src={backdrop}
              unoptimized={!canOptimizeArtwork(backdrop)}
              alt=""
              fill
              sizes="100vw"
              preload
              className={media.cover ? "title-banner-art" : "title-banner-wash"}
            />
          )}
        </div>
        <div className="hero-inner site-width site-gutter">
          <div className="title-hero-grid">
            <div className="title-poster">
              {media.poster && (
                <Image
                  src={largeArtwork(media.poster)}
                  unoptimized={!canOptimizeArtwork(media.poster)}
                  alt={`${media.title} cover`}
                  fill
                  sizes="(max-width: 767px) 112px, 240px"
                  loading="eager"
                  fetchPriority="high"
                  className="object-cover"
                />
              )}
            </div>
            <div className="title-info">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill pill-brand">{catalogFormatLabel(media)}</span>
                <span className="pill">{statusLabels[media.status] || media.status}</span>
              </div>
              <h1 className="detail-title mt-3">{media.title}</h1>
              {media.originalTitle !== media.title && (
                <p className="mt-2 text-sm text-zinc-300">{media.originalTitle}</p>
              )}
              <div className="billboard-meta">
                {media.rating && (
                  <>
                    <span className="rating-chip"><Star className="size-3.5 fill-current" aria-hidden="true" />{media.rating.toFixed(1)}</span>
                    <span className="dot" aria-hidden="true" />
                  </>
                )}
                <span>{media.year || "TBA"}</span>
                {media.total && media.total > 1 ? (
                  <>
                    <span className="dot" aria-hidden="true" />
                    <span>{media.total} {unit}s</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="title-actions">
            <ButtonLink href={play.href} variant="light" size="lg">
              <Play className="size-5 fill-current" aria-hidden="true" />
              {play.label}
            </ButtonLink>
            <Button size="lg" onClick={startTogether}>
              <Users className="size-5" />
              {kind === "anime" ? "Watch together" : "Read together"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={entry ? "In your library" : "Save for later"}
              title={entry ? "In your library" : "Save for later"}
              disabled={!ready || !!entry}
              onClick={() => save(media)}
            >
              {entry ? <Check className="size-5" /> : <Plus className="size-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Favorite title"
              title="Favorite"
              aria-pressed={entry?.favorite || false}
              disabled={!ready}
              onClick={() => save(media, { favorite: !entry?.favorite })}
            >
              <Heart className={`size-5 ${entry?.favorite ? "fill-brand-400 text-brand-400" : ""}`} />
            </Button>
          </div>
        </div>
      </section>
      <div className="title-body grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <p className="max-w-3xl whitespace-pre-line text-[15px] leading-7 text-zinc-300 line-clamp-4">
            {synopsis}
          </p>
          {synopsis.length > 320 && (
            <details className="mt-1 max-w-3xl text-[15px] text-zinc-300">
              <summary className="w-fit cursor-pointer text-sm font-semibold text-brand-300">Full description</summary>
              <p className="mt-2 whitespace-pre-line leading-7">{synopsis}</p>
            </details>
          )}
          {!!media.genres.length && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Genres">
              {media.genres.slice(0, 8).map((genre) => (
                <li key={genre} className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">{genre}</li>
              ))}
            </ul>
          )}
          <ContentChapters kind={kind} id={id} />
          {media.trailer && (
            <>
              <Button
                variant="ghost"
                className="mt-6"
                onClick={() => setTrailer(!trailer)}
              >
                <Play className="size-4" />
                {trailer ? "Close trailer" : "Watch trailer"}
              </Button>
              {trailer && (
                <iframe
                  className="mt-4 aspect-video w-full rounded-2xl"
                  src={`https://www.youtube-nocookie.com/embed/${media.trailer}`}
                  title={`${media.title} trailer`}
                  allow="fullscreen; picture-in-picture"
                  allowFullScreen
                />
              )}
            </>
          )}
          <section className="mt-10 rounded-xl border border-white/[0.08] bg-ink-800 p-6">
            <h2 className="text-lg font-bold tracking-tight">
              {kind === "anime" ? "Where to watch" : "Where to read"}
            </h2>
            <p className="mt-2 text-xs leading-6 text-muted">
              {kind === "anime"
                ? "Open a provider, then use Tandem’s extension to watch in sync. Availability and subscriptions vary by region."
                : "Find a licensed edition through the publisher. To read inside Tandem, open a reading room and choose page images you have access to."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {providers.map((p, i) => (
                <ButtonLink
                  key={`${p.url}:${i}`}
                  href={p.url}
                  variant="ghost"
                  size="sm"
                >
                  {p.name}
                  <ArrowUpRight className="size-3" />
                </ButtonLink>
              ))}
              {!providers.length && (
                <ButtonLink
                  href={
                    kind === "anime"
                      ? `https://www.crunchyroll.com/search?q=${encodeURIComponent(media.title)}`
                      : `https://www.viz.com/search?search=${encodeURIComponent(media.title)}`
                  }
                  size="sm"
                  variant="ghost"
                >
                  Search {kind === "anime" ? "Crunchyroll" : "VIZ"}
                  <ArrowUpRight className="size-3" />
                </ButtonLink>
              )}
            </div>
            {busy && (
              <p className="mt-3 text-xs text-muted">
                Checking provider links…
              </p>
            )}
            {!busy && !providers.length && (
              <p className="mt-3 text-xs text-muted">
                No direct provider link is listed. Search results may vary.
              </p>
            )}
          </section>
        </div>
        <aside className="h-fit rounded-xl border border-white/[0.08] bg-ink-800 p-6 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
          <h2 className="text-lg font-bold tracking-tight">Your progress</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            {media.total
              ? `${media.total} ${unit}s in the catalog.`
              : `The total ${unit} count isn’t listed yet.`}{" "}
            Update your progress after watching or reading.
          </p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save(media, {
                progress: Number(progress ?? entry?.progress ?? 0),
                status: entry?.status || "current",
              });
              setProgress(null);
            }}
          >
            <label className="block text-xs text-zinc-400">
              Status
              <select
                value={entry?.status || "planned"}
                className="field mt-2 w-full"
                disabled={!ready}
                onChange={(e) =>
                  save(media, {
                    status: e.target.value as LibraryStatus,
                    ...(e.target.value === "completed" && media.total
                      ? { progress: Math.max(media.total, entry?.progress || 0) }
                      : {}),
                  })
                }
              >
                {Object.entries(libraryStatuses).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs capitalize text-zinc-400">
              Last {unit} completed
              <input
                type="number"
                min="0"
                max={1_000_000}
                step={kind === "manga" ? "0.1" : "1"}
                value={progress ?? entry?.progress ?? 0}
                onChange={(e) => setProgress(e.target.value)}
                className="field mt-2 w-full"
              />
            </label>
            <Button type="submit" disabled={!ready} className="w-full">
              Save progress
            </Button>
          </form>
          <Button
            variant="ghost"
            className="mt-4 w-full"
            disabled={!ready}
            aria-pressed={entry?.subscribed || false}
            onClick={() => save(media, { subscribed: !entry?.subscribed })}
          >
            {entry?.subscribed ? "Following series" : "Follow series"}
          </Button>
          <p className="mt-3 text-xs leading-5 text-muted">
            Following keeps this title in your library. Progress on external
            providers is updated manually.
          </p>
        </aside>
      </div>
      {error && (
        <p className="mt-5 text-xs text-muted" role="status">
          Showing the saved catalog selection. {error}
        </p>
      )}
    </>
  );
}
