"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  Heart,
  Play,
  Star,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import seed from "@/content/catalog.json";
import {
  mediaKey,
  libraryStatuses,
  type CatalogTitle,
  type LibraryStatus,
  type MediaKind,
} from "@/lib/catalog-types";
import { newRoomId } from "@/lib/room-id";
import { Button, ButtonLink } from "@/components/Button";
import { useLibrary } from "./LibraryProvider";
import { ContentChapters } from "./ContentChapters";

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
  const [trailer, setTrailer] = useState(false);
  const { entries, save, ready } = useLibrary();
  const router = useRouter();
  const entry = entries.find((e) => mediaKey(e.media) === `${kind}:${id}`);
  const media = fetchedMedia || entry?.media || null;
  const [progress, setProgress] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/catalog?kind=${kind}&id=${id}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "This title couldn’t be loaded. Try again from the catalog.",
          );
        return response.json();
      })
      .then((data) => {
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
  }, [kind, id]);
  if (!media)
    return (
      <div className="empty-state">
        <h1>{busy ? "Finding your story…" : "Title unavailable"}</h1>
        <p>{error}</p>
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
  return (
    <>
      <Link
        href={`/${kind}`}
        className="mb-6 inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="size-3.5" />
        Back to {kind}
      </Link>
      <div className="detail-banner relative isolate -mx-5 mb-[-90px] h-64 overflow-hidden sm:mx-0 sm:rounded-3xl">
        {media.cover && (
          <Image
            src={media.cover}
            alt=""
            fill
            sizes="1200px"
            unoptimized
            className="-z-20 object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#111015] via-[#111015]/50 to-transparent" />
      </div>
      <section className="relative grid gap-7 sm:grid-cols-[180px_1fr] sm:gap-9 sm:px-7">
        <div className="relative aspect-[0.7] w-32 overflow-hidden rounded-2xl border border-white/15 bg-ink-700 shadow-2xl sm:w-full">
          {media.poster && (
            <Image
              src={media.poster}
              alt={`${media.title} cover`}
              fill
              unoptimized
              sizes="180px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0 sm:pt-16">
          <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
            <span className="text-brand-300">{media.format}</span>
            <span>·</span>
            <span>{media.year || "TBA"}</span>
            <span>·</span>
            <span className="capitalize">{media.status}</span>
            {media.rating && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-amber-200">
                  <Star className="size-3 fill-amber-200" />
                  {media.rating.toFixed(1)}
                </span>
              </>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-medium tracking-[-0.035em] sm:text-4xl">
            {media.title}
          </h1>
          {media.originalTitle !== media.title && (
            <p className="mt-2 text-sm text-zinc-500">{media.originalTitle}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={startTogether}>
              <Users className="size-4" />
              {kind === "anime" ? "Watch together" : "Read together"}
            </Button>
            <Button
              variant="ghost"
              disabled={!ready || !!entry}
              onClick={() => save(media)}
            >
              {entry ? (
                <Check className="size-4" />
              ) : (
                <Bookmark className="size-4" />
              )}
              {entry ? "In your library" : "Save for later"}
            </Button>
            <Button
              variant="ghost"
              aria-label="Favorite title"
              aria-pressed={entry?.favorite || false}
              disabled={!ready}
              onClick={() => save(media, { favorite: !entry?.favorite })}
            >
              <Heart
                className={`size-4 ${entry?.favorite ? "fill-brand-400 text-brand-400" : ""}`}
              />
            </Button>
          </div>
        </div>
      </section>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="mb-5 text-sm leading-7 text-zinc-400">{media.genres.slice(0, 8).join(" · ")}</p>
          <h2 className="text-lg font-medium">The story</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-400">
            {media.synopsis}
          </p>
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
          <section className="mt-9 rounded-2xl border border-white/10 p-6">
            <h2 className="text-lg font-medium">
              {kind === "anime" ? "Where to watch" : "Where to read"}
            </h2>
            <p className="mt-2 text-xs leading-6 text-zinc-500">
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
              <p className="mt-3 text-xs text-zinc-500">
                Checking provider links…
              </p>
            )}
            {!busy && !providers.length && (
              <p className="mt-3 text-xs text-zinc-500">
                No direct provider link is listed. Search results may vary.
              </p>
            )}
          </section>
        </div>
        <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <p className="eyebrow">Your place in the story</p>
          <h2 className="mt-2 text-xl">Keep it close.</h2>
          <p className="mt-2 text-xs leading-6 text-zinc-500">
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
                      ? { progress: media.total }
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
                max={media.total || 1_000_000}
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
          <p className="mt-3 text-[10px] leading-5 text-zinc-600">
            Following keeps this title in your library. Progress on external
            providers is updated manually.
          </p>
        </aside>
      </div>
      {error && (
        <p className="mt-5 text-xs text-zinc-500" role="status">
          Showing the saved catalog selection. {error}
        </p>
      )}
    </>
  );
}
