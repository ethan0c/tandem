"use client";
/* Page images are local blob URLs with unknown dimensions and never go through an image server. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Copy, FileImage, LockKeyhole, LogOut, MessageCircle, Mic, MicOff, Users } from "lucide-react";
import { Button } from "@/components/Button";
import { useRoom } from "@/hooks/useRoom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useReleaseStream } from "@/hooks/useReleaseStream";
import { useClientValue } from "@/hooks/useClientValue";
import { StreamVideo } from "@/components/room/StreamVideo";
import { ChatPanel } from "@/components/room/ChatPanel";
import { TakenOver } from "@/components/TakenOver";
import type { CatalogTitle } from "@/lib/catalog-types";
import { useLibrary } from "./LibraryProvider";

export function Reader({ roomId }: { roomId: string }) {
  const [session, setSession] = useState<{ name: string; stream: MediaStream | null } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  if (session) return <ReadingSession roomId={roomId} name={session.name} stream={session.stream} onLeave={() => setSession(null)} />;
  return <div className="mx-auto max-w-md py-10"><span className="grid size-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-300"><BookOpen /></span><p className="eyebrow mt-7">The same page. The same moment.</p><h1 className="mt-3 text-3xl font-medium tracking-tight">Read a little closer.</h1><p className="mt-4 text-sm leading-7 text-zinc-400">Choose your name, join the room, and open your page images. Everyone selects their own copy; pages stay on your device.</p><form className="mt-7 space-y-5" onSubmit={async e => { e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); setError(""); let stream: MediaStream | null = null; try { if (form.get("voice")) stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); const name = String(form.get("name")).trim() || "Guest"; setSession({ name, stream }); } catch { setError("Microphone unavailable. Uncheck voice chat to join without it."); } finally { setBusy(false); } }}><label className="block text-xs text-zinc-400">Your name<input name="name" maxLength={32} required autoComplete="nickname" className="field mt-2 w-full" placeholder="What should we call you?" /></label><label className="flex items-center gap-3 text-xs text-zinc-400"><input name="voice" type="checkbox" className="accent-violet-500" /><Mic className="size-3.5" />Join with voice chat</label><Button className="w-full" disabled={busy}>{busy ? "Joining…" : "Join reading room"}</Button>{error && <p role="alert" className="text-xs text-rose-300">{error}</p>}</form><p className="mt-5 text-center font-mono text-[10px] text-zinc-600">Room {roomId}</p></div>;
}
function ReadingSession({ roomId, name, stream, onLeave }: { roomId: string; name: string; stream: MediaStream | null; onLeave: () => void }) {
  const room = useRoom(roomId, name);
  const rtc = useWebRTC({ socketRef: room.socketRef, selfId: room.selfId, members: room.members, localStream: stream });
  useReleaseStream(stream);
  const { entries, save, ready } = useLibrary();
  const [pages, setPages] = useState<{ url: string; name: string }[]>([]);
  const [mode, setMode] = useState("page"); const [direction, setDirection] = useState("ltr"); const [follow, setFollow] = useState(true); const [independentPage, setIndependentPage] = useState(0);
  const [copied, setCopied] = useState(false); const [error, setError] = useState(""); const [chat, setChat] = useState(false);
  const [media, setMedia] = useState<CatalogTitle | null>(null);
  const input = useRef<HTMLInputElement>(null); const canvas = useRef<HTMLDivElement>(null); const sentPosition = useRef("");
  const query = useClientValue(() => location.search, "");
  const isHost = room.selfId !== null && room.selfId === room.hostId;
  const page = follow ? room.reading.page : independentPage;
  const canNavigate = !follow || !room.reading.hostOnly || isHost;
  const { changeReading, changeStory } = room;
  useEffect(() => {
    const params = new URLSearchParams(query);
    if (isHost && room.status === "joined" && !room.story && params.get("media")) changeStory({ id: params.get("media")!, kind: "manga", title: params.get("title") || "Our manga" });
  }, [query, isHost, room.status, room.story, changeStory]);
  useEffect(() => {
    if (!room.story) return;
    const controller = new AbortController();
    fetch(`/api/catalog?kind=manga&id=${room.story.id}`, { signal: controller.signal }).then(r => r.ok ? r.json() : null).then(data => { if (data?.title) setMedia(data.title); }).catch(() => {});
    return () => controller.abort();
  }, [room.story]);
  useEffect(() => () => { pages.forEach(p => URL.revokeObjectURL(p.url)); }, [pages]);
  useEffect(() => {
    if (mode === "scroll" && pages[page]) canvas.current?.querySelector(`[data-page="${page}"]`)?.scrollIntoView({ block: "start" });
  }, [page, mode, pages]);
  useEffect(() => {
    if (!ready || !media || !pages.length) return;
    const key = `${media.id}:${room.reading.chapter}:${page}`;
    if (sentPosition.current === key) return;
    sentPosition.current = key;
    save(media, { status: "current", readingPosition: { chapter: room.reading.chapter, page } });
  }, [ready, media, pages.length, page, room.reading.chapter, save]);
  function go(next: number) {
    if (!canNavigate || next < 0 || next >= pages.length) return;
    if (follow) changeReading({ page: next }); else setIndependentPage(next);
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input,textarea,select,button")) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const next = page + ((event.key === "ArrowRight") === (direction === "ltr") ? 1 : -1);
        if (!canNavigate || next < 0 || next >= pages.length) return;
        if (follow) changeReading({ page: next }); else setIndependentPage(next);
      }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [page, pages.length, direction, canNavigate, follow, changeReading]);
  const savedPosition = media ? entries.find(e => e.media.id === media.id && e.media.kind === "manga")?.readingPosition : undefined;
  return <div className="relative"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Reading room · {room.status === "joined" ? `${room.members.length} here` : room.status}</p><h1 className="mt-2 text-2xl font-medium tracking-tight">{room.story?.title || "A story for the two of you."}</h1><p className="mt-2 text-xs text-zinc-500">{room.members.map(m => m.name).join(" & ") || "Connecting…"}</p></div><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(`${location.origin}/read/${roomId}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError(`Invite link: ${location.origin}/read/${roomId}`); } }}>{copied ? <Check className="size-3" /> : <Copy className="size-3" />}{copied ? "Copied" : "Invite"}</Button><Button size="sm" variant="ghost" disabled={!stream} onClick={rtc.toggleMic} aria-label={rtc.micOn ? "Mute microphone" : "Unmute microphone"}>{stream && rtc.micOn ? <Mic className="size-3" /> : <MicOff className="size-3" />}</Button><Button size="sm" variant="ghost" onClick={() => setChat(!chat)} aria-label="Open room chat"><MessageCircle className="size-3" /></Button><Button size="sm" variant="ghost" onClick={onLeave} aria-label="Leave reading room"><LogOut className="size-3" /></Button></div></div>
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4"><label className="flex items-center gap-2 text-xs text-zinc-400">Chapter<input className="field w-20" type="number" min="1" max="1000000" step="0.1" value={room.reading.chapter} disabled={!canNavigate || !follow || room.status !== "joined"} onChange={e => changeReading({ chapter: Number(e.target.value), page: 0 })} /></label><label><span className="sr-only">Reading mode</span><select className="field" value={mode} onChange={e => setMode(e.target.value)}><option value="page">Page by page</option><option value="scroll">Vertical scroll</option></select></label><label><span className="sr-only">Reading direction</span><select className="field" value={direction} onChange={e => setDirection(e.target.value)}><option value="ltr">Left to right</option><option value="rtl">Right to left</option></select></label><Button variant="ghost" size="sm" onClick={() => { setIndependentPage(page); setFollow(!follow); }} aria-pressed={follow}><Users className="size-3" />{follow ? "Reading in sync" : "Reading independently"}</Button>{isHost && <Button variant="ghost" size="sm" aria-pressed={room.reading.hostOnly} onClick={() => changeReading({ hostOnly: !room.reading.hostOnly })}><LockKeyhole className="size-3" />{room.reading.hostOnly ? "Host turns pages" : "Anyone turns pages"}</Button>}<Button size="sm" variant="ghost" onClick={() => input.current?.click()}><FileImage className="size-3" />{pages.length ? "Change images" : "Choose images"}</Button></div>
    <input ref={input} className="hidden" type="file" multiple accept="image/png,image/jpeg,image/webp,image/avif" onChange={e => { const files = Array.from(e.target.files || []).filter(f => /^image\/(png|jpeg|webp|avif)$/.test(f.type)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })); if (files.length > 500 || files.reduce((n, f) => n + f.size, 0) > 250_000_000) { setError("Choose up to 500 images, under 250 MB total."); return; } if (!files.length) { setError("Choose PNG, JPG, WebP, or AVIF page images."); return; } setError(""); setPages(files.map(f => ({ url: URL.createObjectURL(f), name: f.name }))); e.target.value = ""; }} />
    {error && <p className="mt-4 text-xs text-rose-300" role="alert">{error}</p>}
    <p className="my-4 text-center text-[11px] text-zinc-500">{follow ? room.reading.hostOnly && !isHost ? "Following the host. Switch to independent reading to turn your own pages." : "Chapter and page changes are shared. Everyone opens their own images in the same order." : "You’re on your own page. Switch back to sync to catch up."}</p>
    {pages.length ? <><div className="reader-page" data-mode={mode} ref={canvas}>{mode === "page" ? pages[page] ? <img src={pages[page].url} alt={`Page ${page + 1}: ${pages[page].name}`} /> : <div className="empty-state"><h2>Choose the matching chapter.</h2><p>The room is on page {page + 1}; your selected images contain {pages.length} pages.</p></div> : pages.map((p, index) => <button key={p.url} type="button" data-page={index} className={`block w-full ${index === page ? "outline-2 outline-brand-500" : ""}`} onClick={() => go(index)} aria-label={`Sync room to page ${index + 1}`}><img src={p.url} alt={`Page ${index + 1}: ${p.name}`} /></button>)}</div><div className="sticky bottom-4 z-20 mx-auto mt-5 flex max-w-sm items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#17131d]/95 p-3 shadow-2xl backdrop-blur"><Button variant="ghost" size="sm" aria-label="Previous page" disabled={page <= 0 || !canNavigate} onClick={() => go(page - 1)}><ChevronLeft className="size-4" /></Button><label className="text-xs text-zinc-400">Page <input aria-label="Page number" type="number" className="field mx-1 w-16" min="1" max={pages.length} value={page + 1} disabled={!canNavigate} onChange={e => go(Number(e.target.value) - 1)} /> / {pages.length}</label><Button variant="ghost" size="sm" aria-label="Next page" disabled={page >= pages.length - 1 || !canNavigate} onClick={() => go(page + 1)}><ChevronRight className="size-4" /></Button></div>{media && <div className="mt-6 text-center"><Button size="sm" variant="ghost" onClick={() => save(media, { status: "current", progress: room.reading.chapter })}><Check className="size-3" />Mark chapter {room.reading.chapter} complete</Button></div>}</> : <div className="empty-state mt-8"><BookOpen className="text-brand-400" /><h2>Every good story starts on page one.</h2><p>Select the page images for your chapter. Files stay on your device; only chapter and page numbers are shared.</p><Button onClick={() => input.current?.click()}><FileImage className="size-4" />Choose page images</Button>{savedPosition && <Button variant="ghost" size="sm" disabled={!canNavigate} onClick={() => changeReading({ chapter: savedPosition.chapter, page: savedPosition.page })}>Resume chapter {savedPosition.chapter}, page {savedPosition.page + 1}</Button>}</div>}
    <ChatPanel open={chat} onClose={() => setChat(false)} messages={room.messages} selfId={room.selfId} onSend={room.sendMessage} />
    {rtc.peers.map(peer => <StreamVideo key={peer.id} stream={peer.stream} className="hidden" />)}
    {room.takenOver && <TakenOver onUseHere={room.useHere} />}
  </div>;
}
