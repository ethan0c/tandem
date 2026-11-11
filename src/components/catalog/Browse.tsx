"use client";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import seed from "@/content/catalog.json";
import type { CatalogTitle, MediaKind } from "@/lib/catalog-types";
import { MediaCard } from "./MediaCard";
import { Button } from "@/components/Button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchPublicCatalog } from "@/lib/public-catalog-client";
import { FormatFilter } from "./FormatFilter";

export function Browse({ kind }: { kind: MediaKind }) {
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") || "";
  const [q, setQ] = useState(queryFromUrl);
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("");
  const [sort, setSort] = useState("popular");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [result, setResult] = useState<{
    items: CatalogTitle[];
    source: string;
    hasMore: boolean;
  }>({
    items: (seed as CatalogTitle[]).filter((t) => t.kind === kind),
    source: "selection",
    hasMore: false,
  });
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setQ(queryFromUrl); setPage(1); }, [queryFromUrl]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const data = await fetchPublicCatalog<typeof result>(
          `/api/catalog?${new URLSearchParams({ kind, q, genre, format, sort, status, year, page: String(page) })}`,
        );
        if (!controller.signal.aborted)
          setResult((prev) => ({
            ...data,
            items:
              page === 1
                ? data.items
                : [
                    ...new Map(
                      [...prev.items, ...data.items].map((t) => [t.id, t]),
                    ).values(),
                  ],
          }));
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Catalog unavailable.");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, q, genre, format, sort, status, year, page]);
  function change(set: (value: string) => void, value: string, current: string) {
    if (value === current) return;
    setBusy(true);
    set(value);
    setPage(1);
  }
  return (
    <>
      <div className="page-heading">
        <h1>{kind === "anime" ? "Anime" : "Manga"}</h1>
        <p>
          {kind === "anime"
            ? "Find your next watch."
            : "Manga, manhwa, and manhua. Pick up a new story."}
        </p>
      </div>
      <div className="catalog-filters mt-4">
        <label className="catalog-search relative">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" />
          <span className="sr-only">Search titles</span>
          <input
            value={q}
            onChange={(e) => change(setQ, e.target.value, q)}
            placeholder="Search titles…"
            className="field w-full pl-10"
          />
        </label>
        <button
          type="button"
          className="catalog-filter-toggle"
          aria-expanded={filtersOpen}
          aria-controls="catalog-filter-controls"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal className="size-4" />
          Filters{[format, genre, status, year, sort !== "popular" ? sort : ""].filter(Boolean).length
            ? ` (${[format, genre, status, year, sort !== "popular" ? sort : ""].filter(Boolean).length})`
            : ""}
        </button>
        <div id="catalog-filter-controls" className="catalog-filter-controls" data-open={filtersOpen}>
        <FormatFilter kind={kind} value={format} onChange={(value) => change(setFormat, value, format)} />
        <label className="filter-genre">
          <span className="sr-only">Genre</span>
          <select
            className="field"
            value={genre}
            onChange={(e) => change(setGenre, e.target.value, genre)}
          >
            <option value="">All genres</option>
            {[
              "Action",
              "Adventure",
              "Comedy",
              "Drama",
              "Fantasy",
              "Romance",
              "Science Fiction",
              "Slice of Life",
              "Sports",
              "Thriller",
            ].map((g) => (
              <option key={g} value={g.toLowerCase().replaceAll(" ", "-")}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-status">
          <span className="sr-only">Release status</span>
          <select
            className="field"
            value={status}
            onChange={(e) => change(setStatus, e.target.value, status)}
          >
            <option value="">Any status</option>
            <option value="current">Ongoing</option>
            <option value="finished">Finished</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </label>
        <label className="filter-year">
          <span className="sr-only">Release year</span>
          <input
            className="field w-24"
            inputMode="numeric"
            placeholder="Year"
            maxLength={4}
            value={year}
            onChange={(e) => change(setYear, e.target.value.replace(/\D/g, ""), year)}
          />
        </label>
        <label className="filter-sort">
          <span className="sr-only">Sort titles</span>
          <select
            className="field"
            value={sort}
            onChange={(e) => change(setSort, e.target.value, sort)}
          >
            <option value="popular">Popular</option>
            <option value="rating">Top rated</option>
            <option value="newest">Newest</option>
          </select>
        </label>
        </div>
      </div>
      <div
        className="catalog-result-note mb-4 mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-zinc-400"
        aria-live="polite"
      >
        <span>
          {busy
            ? "Finding your next favorite…"
            : `${result.items.length} titles${result.hasMore ? " · more to explore" : ""}`}
        </span>
        <span>
          {result.source === "cached"
            ? "Saved catalog selection · live provider unavailable"
            : result.source === "selection"
              ? "Saved selection · checking the catalog"
              : "From the Kitsu catalog"}
        </span>
      </div>
      {error && (
        <p role="alert" className="mb-5 text-sm text-rose-300">
          {error}
        </p>
      )}
      {result.items.length ? (
        <div
          className="media-grid"
          aria-busy={busy}
        >
          {result.items.map((media, index) => (
            <MediaCard key={media.id} media={media} eager={index < 2} />
          ))}
        </div>
      ) : busy ? (
        <div className="media-grid" aria-busy="true" role="status" aria-label="Loading search results">
          {Array.from({ length: 12 }, (_, index) => <div className="loading-shape aspect-[0.7] rounded-xl" aria-hidden="true" key={index} />)}
        </div>
      ) : (
        <div className="empty-state">
          <SlidersHorizontal className="text-brand-400" />
          <h2>No stories found</h2>
          <p>Try a different title or loosen the filters.</p>
          <Button
            variant="ghost"
            onClick={() => {
              if (q || genre || format || status || year || page !== 1) setBusy(true);
              setQ("");
              setGenre("");
              setFormat("");
              setStatus("");
              setYear("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
      {result.hasMore && (
        <div className="mt-10 text-center">
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => { setBusy(true); setPage((p) => p + 1); }}
          >
            {busy ? "Loading…" : "Explore more"}
          </Button>
        </div>
      )}
      {kind === "anime" && (
        <p className="mt-10 border-t border-white/10 pt-6 text-sm text-zinc-400">
          <Link href="/play/anime/4650" className="hover:text-white">
            Watch Namakura Gatana (1917) in Tandem →
          </Link>
        </p>
      )}
      {kind === "manga" && (
        <p className="mt-10 border-t border-white/10 pt-6 text-sm text-zinc-400">
          <Link
            href="/play/manga/24249?unit=ubunchu-12"
            className="hover:text-white"
          >
            Read Ubunchu! in Tandem →
          </Link>
        </p>
      )}
    </>
  );
}
