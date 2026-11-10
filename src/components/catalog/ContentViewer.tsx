"use client";
/* Remote chapter pages retain their source dimensions and load directly from the provider. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { useClientValue } from "@/hooks/useClientValue";
import { Button, ButtonLink } from "@/components/Button";
import { newRoomId } from "@/lib/room-id";
import { titleHref, type MediaKind } from "@/lib/catalog-types";
import type { ContentPlayback } from "@/lib/content-types";
import { useLibrary } from "./LibraryProvider";
import { useContent } from "./useContent";

export function ContentViewer({ kind, id }: { kind: MediaKind; id: string }) {
  const router = useRouter();
  const query = useClientValue(() => location.search, "");
  const params = new URLSearchParams(query); const requested = params.get("unit"); const language = params.get("language") || "en";
  const catalog = useContent(kind, id, language);
  const unitId = requested || catalog.data?.units[0]?.id;
  const [playback, setPlayback] = useState<ContentPlayback | null>(null);
  const [failure, setFailure] = useState(""); const [loading, setLoading] = useState(false); const [retry, setRetry] = useState(0);
  const [position, setPosition] = useState(0); const [mode, setMode] = useState("page"); const [direction, setDirection] = useState("ltr");
  const [streamIndex, setStreamIndex] = useState(0);
  const { save, entries, ready } = useLibrary();
  const video = useRef<HTMLVideoElement>(null); const canvas = useRef<HTMLDivElement>(null); const lastSave = useRef(0);
  const media = catalog.data?.media;
  const entry = entries.find(e => e.media.kind === kind && e.media.id === id);
  const entryRef = useRef(entry); useEffect(() => { entryRef.current = entry; }, [entry]);
  useEffect(() => {
    if (!unitId) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setFailure(""); setPlayback(null); setStreamIndex(0);
      try {
        const response = await fetch(`/api/content?${new URLSearchParams({ kind, id, unit: unitId })}`, { signal: controller.signal }); const data = await response.json();
        if (!response.ok) throw new Error(data.error || "This source is unavailable.");
        if (controller.signal.aborted) return;
        setPlayback(data);
        const saved = entryRef.current?.readingPosition;
        setPosition(saved && saved.chapter === data.unit.number && saved.page < (data.pages?.length || 0) ? saved.page : 0);
      } catch (e) { if (!controller.signal.aborted) setFailure(e instanceof Error ? e.message : "This source is unavailable."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load(); return () => controller.abort();
  }, [kind, id, unitId, retry]);
  useEffect(() => {
    if (mode === "scroll") canvas.current?.querySelector(`[data-page="${position}"]`)?.scrollIntoView({ block: "start" });
  }, [position, mode]);
  useEffect(() => {
    if (ready && media && playback?.pages && playback.unit.number >= 1) save(media, { status: "current", readingPosition: { chapter: playback.unit.number, page: position } });
  }, [ready, media, playback, position, save]);
  const count = playback?.pages?.length || 0;
  function go(next: number) { if (next >= 0 && next < count) setPosition(next); }
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.target as HTMLElement).closest("input,select,textarea,button")) return; if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); const next = position + ((e.key === "ArrowRight") === (direction === "ltr") ? 1 : -1); if (next >= 0 && next < count) setPosition(next); } };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [position, count, direction]);
  const togetherParams = new URLSearchParams({ media: id, kind, title: media?.title || "Our story", ...(playback ? { unit: playback.unit.id, chapter: String(playback.unit.number) } : {}) });
  const startTogether = () => router.push(`/${kind === "manga" ? "read" : "room"}/${newRoomId()}?${togetherParams}`);
  return <>
    <Link href={titleHref({ kind, id })} className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="size-4" />Back to series</Link>
    <div className="viewer-heading"><div className="min-w-0"><h1>{media?.title || (kind === "anime" ? "Watch" : "Read")}</h1><p className="mt-2 text-sm text-zinc-400">{playback?.unit.label || "Finding your place…"}{playback ? ` · ${playback.source}` : ""}</p></div>{playback && <Button onClick={startTogether} variant="ghost"><Users className="size-4" />{kind === "anime" ? "Watch together" : "Read together"}</Button>}</div>
    {catalog.pending || loading ? <p className="py-16 text-center text-sm text-zinc-400" role="status">Loading {kind === "anime" ? "video" : "chapter"}…</p> : failure || catalog.error ? <div className="empty-state mt-7"><h2>Couldn’t open this source</h2><p>{failure || catalog.error}</p><Button variant="ghost" onClick={() => { setRetry(n => n + 1); catalog.retry(); }}>Try again</Button></div> : !playback ? <div className="empty-state mt-7"><h2>No {kind === "anime" ? "episodes" : "chapters"} available</h2><p>{catalog.data?.notice || "Choose another source or return to the series."}</p><ButtonLink href={titleHref({ kind, id })} variant="ghost">Back to series</ButtonLink></div> : <>
      {kind === "anime" && playback.streams && <><div className="viewer-video mt-7"><video key={`${unitId}:${streamIndex}`} ref={video} controls playsInline preload="metadata" aria-label={`${media?.title} — ${playback.unit.label}`} src={playback.streams[streamIndex]?.url} onLoadedMetadata={e => { const saved = entryRef.current?.watchPosition; if (saved && saved.unit === unitId && saved.seconds < e.currentTarget.duration - 3) e.currentTarget.currentTime = saved.seconds; }} onTimeUpdate={e => { if (ready && media && Date.now() - lastSave.current > 5000) { lastSave.current = Date.now(); save(media, { status: "current", watchPosition: { unit: unitId!, seconds: e.currentTarget.currentTime } }); } }} onEnded={() => { if (media) save(media, { progress: playback.unit.number, status: media.total === playback.unit.number ? "completed" : "current", watchPosition: { unit: unitId!, seconds: 0 } }); }} onError={() => { if (streamIndex + 1 < playback.streams!.length) setStreamIndex(n => n + 1); else setFailure("The video source couldn’t be played. Try again or return to the series."); }} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-4"><label className="flex items-center gap-3 text-sm text-zinc-400">Video format<select className="field" value={streamIndex} onChange={e => setStreamIndex(Number(e.target.value))}>{playback.streams.map((stream, index) => <option key={stream.url} value={index}>{stream.label}</option>)}</select></label><p className="text-xs text-zinc-400">Silent film · 4 minutes</p></div></>}
      {kind === "manga" && playback.pages && <><div className="reader-toolbar mt-6"><label><span className="sr-only">Reading mode</span><select className="field" value={mode} onChange={e => setMode(e.target.value)}><option value="page">Page by page</option><option value="scroll">Vertical scroll</option></select></label><label><span className="sr-only">Reading direction</span><select className="field" value={direction} onChange={e => setDirection(e.target.value)}><option value="ltr">Left to right</option><option value="rtl">Right to left</option></select></label></div><div className="reader-page mt-6" data-mode={mode} ref={canvas}>{mode === "page" ? <img src={playback.pages[position]} alt={`Page ${position + 1} of ${playback.unit.label}`} referrerPolicy="no-referrer" onError={() => setFailure("This page couldn’t be loaded. Retry to refresh the page source.")} /> : playback.pages.map((url, index) => <div key={url} data-page={index}><img src={url} alt={`Page ${index + 1} of ${playback.unit.label}`} loading={index > 1 ? "lazy" : "eager"} referrerPolicy="no-referrer" /></div>)}</div><div className="reader-pagination"><Button variant="ghost" size="sm" disabled={position === 0} onClick={() => go(position - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button><label className="flex items-center gap-2 text-sm text-zinc-400">Page<input className="field w-16" type="number" aria-label="Page number" min="1" max={count} value={position + 1} onChange={e => go(Number(e.target.value) - 1)} /><span>/ {count}</span></label><Button variant="ghost" size="sm" disabled={position >= count - 1} onClick={() => go(position + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button></div><div className="mt-7 text-center"><Button variant="ghost" size="sm" onClick={() => { if (media && playback.unit.number >= 1) save(media, { progress: Math.max(entry?.progress || 0, playback.unit.number), status: "current" }); }}>Mark {playback.unit.label.toLowerCase()} complete</Button></div></>}
      <p className="mt-7 text-xs leading-6 text-zinc-400">{playback.credit} <a className="underline underline-offset-4 hover:text-white" href={playback.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a></p>
    </>}
  </>;
}
