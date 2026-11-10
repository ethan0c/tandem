"use client";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import seed from "@/content/catalog.json";
import type { CatalogTitle, MediaKind } from "@/lib/catalog-types";
import { MediaCard } from "./MediaCard";
import { Button } from "@/components/Button";

export function Browse({ kind }: { kind: MediaKind }) {
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState(""); const [sort, setSort] = useState("popular"); const [status, setStatus] = useState(""); const [year, setYear] = useState("");
  const [result, setResult] = useState<{ items: CatalogTitle[]; source: string; hasMore: boolean }>({ items: (seed as CatalogTitle[]).filter(t => t.kind === kind), source: "selection", hasMore: false });
  const [page, setPage] = useState(1); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true); setError("");
      try {
        const response = await fetch(`/api/catalog?${new URLSearchParams({ kind, q, genre, sort, status, year, page: String(page) })}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Couldn’t load the catalog. Try again.");
        const data = await response.json() as typeof result;
        if (!controller.signal.aborted) setResult(prev => ({ ...data, items: page === 1 ? data.items : [...new Map([...prev.items, ...data.items].map(t => [t.id, t])).values()] }));
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Catalog unavailable."); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [kind, q, genre, sort, status, year, page]);
  function change(set: (value: string) => void, value: string) { set(value); setPage(1); }
  return <><p className="eyebrow">{kind === "anime" ? "Find your next watch" : "Turn to something good"}</p><h1 className="mt-2 text-4xl font-medium tracking-tight">Explore {kind}.</h1><p className="mt-3 text-sm text-zinc-400">{kind === "anime" ? "Big feelings, new worlds, and something worth watching together." : "Manga, manhwa, and manhua. Your next favorite is a page away."}</p>
    <div className="catalog-filters mt-8 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4"><label className="relative min-w-48 flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-zinc-500" /><span className="sr-only">Search titles</span><input value={q} onChange={e => change(setQ, e.target.value)} placeholder={`Search ${kind} or an alternative title…`} className="field w-full pl-10" /></label><label><span className="sr-only">Genre</span><select className="field" value={genre} onChange={e => change(setGenre, e.target.value)}><option value="">All genres</option>{["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Romance", "Science Fiction", "Slice of Life", "Sports", "Thriller"].map(g => <option key={g} value={g.toLowerCase().replaceAll(" ", "-")}>{g}</option>)}</select></label><label><span className="sr-only">Release status</span><select className="field" value={status} onChange={e => change(setStatus, e.target.value)}><option value="">Any status</option><option value="current">Ongoing</option><option value="finished">Finished</option><option value="upcoming">Upcoming</option></select></label><label><span className="sr-only">Release year</span><input className="field w-24" inputMode="numeric" placeholder="Year" maxLength={4} value={year} onChange={e => change(setYear, e.target.value.replace(/\D/g, ""))} /></label><label><span className="sr-only">Sort titles</span><select className="field" value={sort} onChange={e => change(setSort, e.target.value)}><option value="popular">Most popular</option><option value="rating">Top rated</option><option value="newest">Newest</option></select></label></div>
    <div className="mb-5 mt-6 flex items-center justify-between gap-4 text-xs text-zinc-500" aria-live="polite"><span>{busy ? "Finding your next favorite…" : `${result.items.length} titles${result.hasMore ? " · more to explore" : ""}`}</span><span>{result.source === "cached" ? "Saved catalog selection · live provider unavailable" : result.source === "selection" ? "Saved selection · checking the catalog" : "From the Kitsu catalog"}</span></div>
    {error && <p role="alert" className="mb-5 text-sm text-rose-300">{error}</p>}
    {result.items.length ? <div className={`media-grid ${busy ? "opacity-60" : ""}`} aria-busy={busy}>{result.items.map(media => <MediaCard key={media.id} media={media} />)}</div> : <div className="empty-state"><SlidersHorizontal className="text-brand-400" /><h2>No stories found</h2><p>Try a different title or loosen the filters.</p><Button variant="ghost" onClick={() => { setQ(""); setGenre(""); setStatus(""); setYear(""); setPage(1); }}>Clear filters</Button></div>}
    {result.hasMore && <div className="mt-10 text-center"><Button variant="ghost" disabled={busy} onClick={() => setPage(p => p + 1)}>{busy ? "Loading…" : "Explore more"}</Button></div>}
  </>;
}
