"use client";
/* Pages retain their source dimensions; chapter artwork is not cropped. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/Button";
import { useClientValue } from "@/hooks/useClientValue";
import type { CatalogTitle } from "@/lib/catalog-types";
import type { ContentPlayback } from "@/lib/content-types";
import { isUnitCompleted, unitLabel } from "@/lib/spoilers";
import { useLibrary } from "./LibraryProvider";
import { createPagePreloader } from "@/lib/reader-preload";
import { ScrollReaderPage } from "./ScrollReaderPage";

export interface ReadingSettings {
  mode: "page" | "scroll";
  direction: "ltr" | "rtl";
  fit: "height" | "width";
}
const EMPTY_PAGES: string[] = [];

export function MangaReader({ media, playback, settings, onSettings, onFailure, transitioning = false }: {
  media: CatalogTitle;
  playback: ContentPlayback;
  settings: ReadingSettings;
  onSettings: (settings: ReadingSettings) => void;
  onFailure: (message: string) => void;
  transitioning?: boolean;
}) {
  const { entries, save } = useLibrary();
  const entry = entries.find((item) => item.media.kind === "manga" && item.media.id === media.id);
  const pages = playback.pages || EMPTY_PAGES;
  const [position, setPosition] = useState(() => {
    const saved = entry?.readingPosition;
    return saved?.chapter === playback.unit.number && saved.page < pages.length ? saved.page : 0;
  });
  const [message, setMessage] = useState("");
  const [loadedPage, setLoadedPage] = useState("");
  const [pageRatio, setPageRatio] = useState(0.7);
  const [nearPages, setNearPages] = useState(() => new Set([position]));
  const [expanded, setExpanded] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const currentPage = useRef(position);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const preloader = useRef<ReturnType<typeof createPagePreloader> | null>(null);
  const canFullscreen = useClientValue(() => !!document.fullscreenEnabled, false);
  const complete = isUnitCompleted(playback.unit.number, entry?.progress || 0);
  const label = unitLabel("manga", playback.unit);
  const isExpanded = expanded || nativeFullscreen;

  function go(next: number) {
    if (!Number.isInteger(next) || next < 0 || next >= pages.length) return;
    setPosition(next);
    if (settings.mode === "scroll") canvas.current?.querySelector(`[data-page="${next}"]`)?.scrollIntoView({ block: "start" });
  }
  useEffect(() => {
    const loader = createPagePreloader();
    preloader.current = loader;
    return () => { loader.dispose(); preloader.current = null; };
  }, [pages]);
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (settings.mode !== "page" || loadedPage !== pages[position] || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || "")) {
      preloader.current?.setTargets([]);
      return;
    }
    const timer = setTimeout(() => preloader.current?.setTargets([pages[position + 1], pages[position - 1], pages[position + 2]].filter(Boolean)), 100);
    return () => clearTimeout(timer);
  }, [pages, position, loadedPage, settings.mode]);
  useEffect(() => {
    currentPage.current = position;
    if (playback.unit.number >= 1) save(media, { status: "current", readingPosition: { chapter: playback.unit.number, page: position } });
  }, [position, playback.unit.number, media, save]);

  useEffect(() => {
    if (settings.mode !== "scroll" || !canvas.current) return;
    canvas.current.querySelector(`[data-page="${currentPage.current}"]`)?.scrollIntoView({ block: "start" });
    const near = new Set<number>();
    const pageLoader = new IntersectionObserver((observed) => {
      for (const item of observed) {
        const index = Number(item.target.getAttribute("data-page"));
        if (item.isIntersecting) near.add(index); else near.delete(index);
      }
      setNearPages(new Set(near));
    }, { rootMargin: "100% 0px", threshold: 0 });
    // A narrow viewport band follows the page being read, rather than the last loaded image.
    const visible = new Set<number>();
    const observer = new IntersectionObserver((observed) => {
      for (const item of observed) {
        const page = Number(item.target.getAttribute("data-page"));
        if (item.isIntersecting) visible.add(page);
        else visible.delete(page);
      }
      if (visible.size) setPosition(Math.min(...visible));
    }, { rootMargin: `${-Math.round(window.innerHeight * 0.15)}px 0px ${-Math.round(window.innerHeight * 0.65)}px 0px`, threshold: 0 });
    canvas.current.querySelectorAll("[data-page]").forEach((element) => { observer.observe(element); pageLoader.observe(element); });
    return () => { observer.disconnect(); pageLoader.disconnect(); };
  }, [settings.mode, isExpanded]);

  useEffect(() => {
    const changed = () => setNativeFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    root.current?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setExpanded(false); }
      if (event.key !== "Tab") return;
      const items = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select, input, a[href]') || [])].filter((element) => element.getBoundingClientRect().height > 0);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root.current)) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", trap); previousFocus?.focus(); };
  }, [expanded]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (transitioning) return;
      if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest("input,select,textarea,button,[contenteditable]")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const next = currentPage.current + ((event.key === "ArrowRight") === (settings.direction === "ltr") ? 1 : -1);
        if (next < 0 || next >= pages.length) return;
        setPosition(next);
        if (settings.mode === "scroll") canvas.current?.querySelector(`[data-page="${next}"]`)?.scrollIntoView({ block: "start" });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [pages.length, settings.direction, settings.mode, transitioning]);

  async function fullscreen() {
    try {
      if (nativeFullscreen) await document.exitFullscreen();
      else if (expanded) setExpanded(false);
      else if (canFullscreen) await root.current?.requestFullscreen();
      else setExpanded(true);
    } catch { setExpanded(true); setMessage("Expanded reader view is open. Browser fullscreen isn’t available here."); }
  }
  const change = (changes: Partial<ReadingSettings>) => onSettings({ ...settings, ...changes });
  return (
    <section className="manga-reader mt-6" aria-label="Manga reader" data-expanded={expanded || undefined} tabIndex={-1} ref={root}>
      {isExpanded && <Button className="reader-immersive-close" variant="dark" size="sm" onClick={fullscreen} aria-label="Close reader view"><Minimize className="size-4" />Close reader view</Button>}
      <div className="reader-toolbar">
        <label><span className="sr-only">Reading mode</span><select className="field" value={settings.mode} onChange={(event) => change({ mode: event.target.value as ReadingSettings["mode"] })}>
          <option value="page">Page by page</option><option value="scroll">Vertical scroll</option>
        </select></label>
        <label><span className="sr-only">Reading direction</span><select className="field" value={settings.direction} onChange={(event) => change({ direction: event.target.value as ReadingSettings["direction"] })}>
          <option value="ltr">Left to right</option><option value="rtl">Right to left</option>
        </select></label>
        {settings.mode === "page" && <label><span className="sr-only">Page sizing</span><select className="field" value={settings.fit} onChange={(event) => change({ fit: event.target.value as ReadingSettings["fit"] })}>
          <option value="height">Fit to screen</option><option value="width">Fit to width</option>
        </select></label>}
        <Button variant="ghost" size="sm" onClick={fullscreen} aria-label={isExpanded ? "Exit fullscreen reader" : canFullscreen ? "Fullscreen reader" : "Expand reader"} aria-pressed={isExpanded}>
          {isExpanded ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          {isExpanded ? "Exit reader view" : canFullscreen ? "Fullscreen" : "Expand reader"}
        </Button>
      </div>
      <div className="reader-page mt-6" data-mode={settings.mode} data-fit={settings.fit} ref={canvas}
        onTouchStart={(event) => { touch.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }}
        onTouchEnd={(event) => {
          const start = touch.current;
          touch.current = null;
          if (!start || settings.mode !== "page" || event.touches.length || event.changedTouches.length !== 1 || (window.visualViewport?.scale || 1) > 1) return;
          const dx = event.changedTouches[0].clientX - start.x;
          const dy = event.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 70 && Math.abs(dy) < 50) go(position + ((dx < 0) === (settings.direction === "ltr") ? 1 : -1));
        }}>
        {settings.mode === "page" ? <div className="reader-image-frame" style={{ aspectRatio: pageRatio }} aria-busy={loadedPage !== pages[position]}>
          {loadedPage !== pages[position] && <div className="reader-image-loading loading-shape" role="status"><span>Loading page {position + 1}…</span></div>}
          <img src={pages[position]} alt={`Page ${position + 1} of ${label}`} referrerPolicy="no-referrer" decoding="async" fetchPriority="high" className={loadedPage === pages[position] ? "reader-image-ready" : "reader-image-pending"} onLoad={(event) => { setPageRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight); setLoadedPage(pages[position]); }} onError={() => onFailure("This page couldn’t be loaded. Retry to refresh the page source.")} />
        </div> : pages.map((url, index) => (
          <ScrollReaderPage key={url} url={url} index={index} label={label} active={nearPages.has(index)} current={index === position} initialRatio={pageRatio} onFailure={onFailure} />
        ))}
      </div>
      <div className="reader-pagination" data-direction={settings.direction}>
        <Button variant="ghost" size="icon" disabled={position === 0} onClick={() => go(position - 1)} aria-label="Previous page">
          {settings.direction === "rtl" ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
        <label>Page<input className="field" type="number" aria-label="Page number" min="1" max={pages.length} value={position + 1} onChange={(event) => go(Number(event.target.value) - 1)} /><span>/ {pages.length}</span></label>
        <Button variant="ghost" size="icon" disabled={position >= pages.length - 1} onClick={() => go(position + 1)} aria-label="Next page">
          {settings.direction === "rtl" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
        </Button>
      </div>
      <div className="mt-7 text-center">
        <Button variant="ghost" size="sm" disabled={complete} onClick={() => save(media, { progress: Math.max(entry?.progress || 0, playback.unit.number), status: media.total === playback.unit.number ? "completed" : "current" })}>
          {complete ? `${label} complete` : `Mark ${label.toLowerCase()} complete`}
        </Button>
      </div>
      <p className="mt-4 text-center text-xs leading-6 text-zinc-400">{settings.mode === "page" ? "Swipe or use the arrow keys to turn pages. Pinch to zoom on mobile." : "Your place saves as you scroll. Chapters change only when you choose."}</p>
      {message && <p className="mt-3 text-sm text-zinc-400" role="status">{message}</p>}
    </section>
  );
}
