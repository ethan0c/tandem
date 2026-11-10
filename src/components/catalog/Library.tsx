"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Download,
  Heart,
  Import,
  Library as LibraryIcon,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  libraryStatuses,
  mediaKey,
  titleHref,
  type LibraryStatus,
} from "@/lib/catalog-types";
import { useLibrary } from "./LibraryProvider";
import { Button, ButtonLink } from "@/components/Button";

export function Library() {
  const { entries, ready, save, remove, user, notice, sync } = useLibrary();
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [favorites, setFavorites] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const exportLink = useRef<HTMLAnchorElement>(null);
  const filtered = entries
    .filter(
      (e) =>
        (kind === "all" || e.media.kind === kind) &&
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
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow">A home for your favorites</p>
          <h1 className="mt-2 text-4xl font-medium tracking-tight">
            Your library.
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Every story you’re in the middle of. Every one still to come.
          </p>
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
      <div className="my-8 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4">
        <LibraryIcon className="size-5 text-brand-400" />
        <div className="flex-1">
          <p className="text-xs">
            {entries.length} saved titles{" "}
            <span className="mx-2 text-zinc-700">/</span>
            {entries.filter((e) => e.status === "current").length} in progress{" "}
            <span className="mx-2 text-zinc-700">/</span>
            {entries.filter((e) => e.status === "completed").length} completed
          </p>
          <p className="mt-1.5 text-xs text-muted">
            {notice ||
              (user
                ? "Your private library syncs across devices."
                : "Saved in this browser. Sign in for a separate cloud library, or export a backup.")}
          </p>
        </div>
        {user ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              await sync();
              setSyncing(false);
            }}
          >
            <RefreshCw
              className={`size-3.5 ${syncing ? "animate-spin" : ""}`}
            />
            Sync
          </Button>
        ) : (
          <Link href="/account" className="text-xs text-brand-300">
            Sign in <span aria-hidden>→</span>
          </Link>
        )}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div
          className="library-tabs flex gap-1"
          role="group"
          aria-label="Library type"
        >
          {["all", "anime", "manga"].map((k) => (
            <button
              key={k}
              className={`library-tab px-4 py-2 text-sm capitalize ${kind === k ? "library-tab-active text-white" : "text-muted"}`}
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {k === "all" ? "All stories" : k}
            </button>
          ))}
        </div>
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
            className="field w-full pl-9 sm:w-48"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a story…"
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
      </div>
      {!ready ? (
        <p className="py-20 text-center text-sm text-muted">
          Opening your library…
        </p>
      ) : !filtered.length ? (
        <div className="empty-state">
          <BookOpen className="text-brand-400" />
          <h2>
            {entries.length
              ? "No matching stories"
              : "Your next favorite belongs here."}
          </h2>
          <p>
            {entries.length
              ? "Try another filter or search."
              : "Save an anime or manga, or bring your existing list along."}
          </p>
          <ButtonLink href="/discover">Find your first story</ButtonLink>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <article
              key={mediaKey(e.media)}
              className="library-row flex flex-wrap items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.025] p-4"
            >
              <Link
                href={titleHref(e.media)}
                className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg"
              >
                {e.media.poster && (
                  <Image
                    src={e.media.poster}
                    alt=""
                    fill
                    sizes="56px"
                    unoptimized
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={titleHref(e.media)}
                  className="line-clamp-1 text-sm font-medium hover:text-brand-300"
                >
                  {e.media.title}
                </Link>
                <p className="mt-1 text-xs capitalize text-muted">
                  {e.media.kind} · {e.media.year || "TBA"}
                </p>
                <p className="mt-2 text-xs text-brand-300">
                  {e.media.kind === "anime" ? "Episode" : "Chapter"}{" "}
                  {e.progress}
                  {e.media.total ? ` / ${e.media.total}` : ""}
                </p>
                {e.media.total && (
                  <div className="mt-2 h-1 max-w-56 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{
                        width: `${Math.min(100, (e.progress / e.media.total) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
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
                  disabled={!!e.media.total && e.progress >= e.media.total}
                  onClick={() =>
                    save(e.media, {
                      progress: Math.floor(e.progress) + 1,
                      status:
                        e.media.total && e.progress + 1 >= e.media.total
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
            </article>
          ))}
        </div>
      )}
    </>
  );
}
