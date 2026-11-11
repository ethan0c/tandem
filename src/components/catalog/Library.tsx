"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Heart,
  Import,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  libraryStatuses,
  mediaKey,
  titleHref,
  type LibraryEntry,
  type LibraryStatus,
  type MediaKind,
} from "@/lib/catalog-types";
import { useLibrary } from "./LibraryProvider";
import { Button, ButtonLink } from "@/components/Button";
import { canOptimizeArtwork } from "@/lib/artwork";
import { catalogFormatLabel, matchesCatalogFormat } from "@/lib/catalog-formats";
import { unitLabel } from "@/lib/spoilers";
import { FormatFilter } from "./FormatFilter";
import { useClientValue } from "@/hooks/useClientValue";

export function resumeHref(entry: LibraryEntry): string | null {
  const unit = entry.watchPosition?.unit;
  return entry.media.kind === "anime" && unit && /^(?:film|av-mkissa-(?:sub|dub)-\d{1,4}|ra-\d{1,4})$/.test(unit)
    ? `/play/anime/${entry.media.id}?${new URLSearchParams({ unit })}`
    : null;
}

export function Library() {
  const { entries, ready, save, remove, user, notice, sync } = useLibrary();
  const [kind, setKind] = useState<MediaKind | "all">("all");
  const [format, setFormat] = useState("");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const savedView = useClientValue(() => {
    try { return localStorage.getItem("tandem:library-view"); } catch { return null; }
  }, null);
  const [chosenView, setChosenView] = useState<"list" | "grid" | null>(null);
  const view = chosenView ?? (savedView === "grid" ? "grid" : "list");
  const [favorites, setFavorites] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const exportLink = useRef<HTMLAnchorElement>(null);
  const filtered = entries
    .filter(
      (e) =>
        (kind === "all" || e.media.kind === kind) &&
        matchesCatalogFormat(e.media, format) &&
        (status === "all" || e.status === status) &&
        (!favorites || e.favorite) &&
        e.media.title.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.media.title.localeCompare(b.media.title)
        : b.updatedAt - a.updatedAt,
    );
  function backup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(entries, null, 2)], {
        type: "application/json",
      }),
    );
    const a = exportLink.current!;
    a.href = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function changeView(next: "list" | "grid") {
    setChosenView(next);
    try { localStorage.setItem("tandem:library-view", next); } catch {}
  }
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5 pt-2">
        <div>
          <h1>My library</h1>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={backup}
            disabled={!ready || !entries.length}
          >
            <Download className="size-4" />
            Export
          </Button>
          <ButtonLink href="/library/import">
            <Import className="size-4" />
            Import library
          </ButtonLink>
        </div>
      </div>
      <a ref={exportLink} download="tandem-library.json" className="hidden" />
      <div className="mb-6 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
        <span>
          {entries.length} saved · {entries.filter((e) => e.status === "current").length} in progress ·{" "}
          {entries.filter((e) => e.status === "completed").length} completed
        </span>
        <span aria-hidden="true" className="hidden text-zinc-600 sm:inline">|</span>
        <span>
          {notice ||
            (user
              ? "Synced to your account."
              : "Saved in this browser.")}
        </span>
        {user ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-300 hover:text-white disabled:opacity-50"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              await sync();
              setSyncing(false);
            }}
          >
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sync now
          </button>
        ) : (
          <Link href="/account" className="inline-flex min-h-11 items-center font-semibold text-brand-300 hover:text-white">
            Sign in to sync
          </Link>
        )}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4">
        <div
          className="library-tabs mr-2 flex gap-1"
          role="group"
          aria-label="Library type"
        >
          {(["all", "anime", "manga"] as const).map((k) => (
            <button
              key={k}
              className={`library-tab px-4 py-2 text-sm font-semibold capitalize ${kind === k ? "library-tab-active" : ""}`}
              aria-pressed={kind === k}
              onClick={() => { setKind(k); setFormat(""); }}
            >
              {k === "all" ? "All" : k}
            </button>
          ))}
        </div>
        <FormatFilter kind={kind} value={format} onChange={setFormat} className="w-full sm:w-auto" />
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            className="field"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(libraryStatuses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={favorites}
          onClick={() => setFavorites(!favorites)}
        >
          <Heart
            className={`size-3.5 ${favorites ? "fill-brand-400 text-brand-400" : ""}`}
          />
          Favorites
        </Button>
        <label className="relative ml-auto">
          <Search className="absolute left-3 top-3 size-4 text-muted" />
          <span className="sr-only">Search library</span>
          <input
            className="field w-full pl-9 sm:w-44"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search library"
          />
        </label>
        <label>
          <span className="sr-only">Sort library</span>
          <select
            className="field"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Recently updated</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
        <div className="audio-track-control">
          <span className="sr-only">View</span>
          <div className="audio-track-toggle" role="group" aria-label="Library view">
            <button type="button" className="audio-track-option flex items-center justify-center gap-1.5" aria-label="List view" aria-pressed={view === "list"} onClick={() => changeView("list")}><List className="size-3.5" /> List</button>
            <button type="button" className="audio-track-option flex items-center justify-center gap-1.5" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => changeView("grid")}><LayoutGrid className="size-3.5" /> Grid</button>
          </div>
        </div>
      </div>
      {ready && <p className="mb-3 text-xs text-muted" role="status">{filtered.length} of {entries.length} titles shown</p>}
      {!ready ? (
        <p className="py-20 text-center text-sm text-muted">
          Opening your library…
        </p>
      ) : !filtered.length ? (
        <div className="empty-state">
                    <h2>
            {entries.length
              ? "No matching stories"
              : "Nothing saved yet"}
          </h2>
          <p>
            {entries.length
              ? "Try another filter or search."
              : "Save a title from Anime or Manga, or import a list you already keep."}
          </p>
          <ButtonLink href="/discover">Browse titles</ButtonLink>
        </div>
      ) : (
        <div className={view === "grid" ? "grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "space-y-2"}>
          {filtered.map((e) => (
            <article
              key={mediaKey(e.media)}
              className={`library-row flex gap-4 rounded-xl border border-white/[0.07] bg-ink-800 p-3 transition-colors hover:border-white/15 ${view === "grid" ? "min-w-0 flex-col items-stretch" : "flex-wrap items-center"}`}
            >
              <Link
                href={resumeHref(e) || titleHref(e.media)}
                className={`relative shrink-0 overflow-hidden rounded-md bg-ink-700 ${view === "grid" ? "aspect-[0.7] w-full" : "h-20 w-14"}`}
              >
                {e.media.poster && (
                  <Image
                    src={e.media.poster}
                    alt=""
                    fill
                    sizes={view === "grid" ? "(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw" : "56px"}
                    unoptimized={!canOptimizeArtwork(e.media.poster)}
                    className="object-cover"
                  />
                )}
              </Link>
              <div className={`min-w-0 ${view === "grid" ? "w-full" : "flex-1"}`}>
                <Link
                  href={resumeHref(e) || titleHref(e.media)}
                  className={`${view === "grid" ? "line-clamp-2" : "line-clamp-1"} text-[15px] font-semibold hover:text-brand-300`}
                >
                  {e.media.title}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  {catalogFormatLabel(e.media)} · {e.media.year || "TBA"}
                </p>
                <p className="mt-2 text-xs text-brand-300">
                  {e.media.kind === "anime" ? "Episode" : "Chapter"}{" "}
                  {e.progress}
                  {e.media.total ? ` / ${e.media.total}` : ""}
                </p>
                {resumeHref(e) && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <Link href={resumeHref(e)!} className="font-medium text-brand-300 hover:text-white">
                    {e.watchPosition?.unit === "film" ? "Resume film" : `Resume episode ${e.watchPosition?.unit.match(/-(\d+)$/)?.[1] || ""}`} →
                  </Link>
                  <Link href={titleHref(e.media)} className="text-muted hover:text-white">Series details</Link>
                </div>}
                {e.media.total && (
                  <div className="mt-2 h-1 max-w-64 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{
                        width: `${Math.min(100, (e.progress / e.media.total) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
              <div className={`flex w-full flex-wrap items-center gap-2 ${view === "grid" ? "mt-auto justify-start" : "justify-end sm:w-auto"}`}>
                <label>
                  <span className="sr-only">Status for {e.media.title}</span>
                  <select
                    className="field text-xs"
                    value={e.status}
                    onChange={(event) =>
                      save(e.media, {
                        status: event.target.value as LibraryStatus,
                      })
                    }
                  >
                    {Object.entries(libraryStatuses).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={e.progress >= 1_000_000}
                  onClick={() =>
                    save(e.media, {
                      progress: Math.floor(e.progress) + 1,
                      status:
                        e.media.status === "finished" && e.media.total === Math.floor(e.progress) + 1
                          ? "completed"
                          : "current",
                    })
                  }
                  aria-label={`Mark next ${e.media.kind === "anime" ? "episode" : "chapter"} of ${e.media.title} completed`}
                >
                  +1
                </Button>
                <button
                  className="control-button control-lg"
                  aria-label={`Favorite ${e.media.title}`}
                  aria-pressed={e.favorite}
                  onClick={() => save(e.media, { favorite: !e.favorite })}
                >
                  <Heart
                    className={`size-3.5 ${e.favorite ? "fill-brand-400 text-brand-400" : ""}`}
                  />
                </button>
                {pendingRemove === mediaKey(e.media) ? (
                  <>
                    <Button
                      size="xs"
                      variant="danger"
                      onClick={() => {
                        remove(e.media);
                        setPendingRemove(null);
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setPendingRemove(null)}
                    >
                      Keep
                    </Button>
                  </>
                ) : (
                  <button
                    className="control-button control-lg"
                    aria-label={`Remove ${e.media.title}`}
                    onClick={() => setPendingRemove(mediaKey(e.media))}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              {e.media.kind === "anime" && !!e.likedEpisodes?.length && (
                <details className="w-full border-t border-white/10 pt-3">
                  <summary className="cursor-pointer text-sm text-brand-300">Liked episodes ({e.likedEpisodes.length})</summary>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {e.likedEpisodes.map((episode) => (
                      <Link
                        key={episode.unit}
                        href={`/play/anime/${e.media.id}?${new URLSearchParams({ unit: episode.unit })}`}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:border-brand-400 hover:text-white"
                      >
                        {unitLabel("anime", { number: episode.number, group: episode.group })}
                      </Link>
                    ))}
                  </div>
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
