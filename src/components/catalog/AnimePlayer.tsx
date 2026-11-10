"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize, PictureInPicture2, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/Button";
import { useClientValue } from "@/hooks/useClientValue";
import type { CatalogTitle } from "@/lib/catalog-types";
import type { ContentPlayback } from "@/lib/content-types";
import { unitLabel } from "@/lib/spoilers";
import { useLibrary } from "./LibraryProvider";

type InlineVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

export function AnimePlayer({ media, playback, onFailure }: {
  media: CatalogTitle;
  playback: ContentPlayback;
  onFailure: (message: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const { entries, save } = useLibrary();
  const entry = entries.find((item) => item.media.kind === "anime" && item.media.id === media.id);
  const [streamIndex, setStreamIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [message, setMessage] = useState("");
  const lastSave = useRef(0);
  const initialSeconds = useRef(entry?.watchPosition?.unit === playback.unit.id ? entry.watchPosition.seconds : 0);
  const switching = useRef(false);
  const transfer = useRef<{ seconds: number; playing: boolean; volume: number; muted: boolean } | null>(null);
  const canPiP = useClientValue(() => !!document.pictureInPictureEnabled, false);
  const streams = playback.streams || [];

  function savePosition(element: HTMLVideoElement) {
    if (switching.current || element.ended || element.readyState < 1) return;
    lastSave.current = Date.now();
    save(media, { status: "current", watchPosition: { unit: playback.unit.id, seconds: element.currentTime } });
  }
  function changeStream(index: number) {
    if (index === streamIndex || !streams[index]) return;
    const element = video.current;
    if (element) transfer.current = { seconds: element.currentTime, playing: !element.paused, volume: element.volume, muted: element.muted };
    switching.current = true;
    setStreamIndex(index);
  }
  function seek(seconds: number) {
    const element = video.current;
    if (element && Number.isFinite(element.duration)) element.currentTime = Math.max(0, Math.min(element.duration, element.currentTime + seconds));
  }
  async function fullscreen() {
    const element = video.current as InlineVideo | null;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (element?.requestFullscreen) await element.requestFullscreen();
      else if (element?.webkitEnterFullscreen) element.webkitEnterFullscreen();
      else setMessage("Use your video’s fullscreen control on this browser.");
    } catch { setMessage("Fullscreen isn’t available here. You can still watch inline."); }
  }
  async function pictureInPicture() {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.current?.requestPictureInPicture();
    } catch { setMessage("Picture in picture isn’t available for this video."); }
  }
  useEffect(() => {
    const element = video.current;
    const key = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest("input,select,textarea,button,video,[contenteditable]")) return;
      if (!element || !element.getBoundingClientRect().height) return;
      const key = event.key.toLowerCase();
      if ([" ", "k", "j", "l", "arrowleft", "arrowright", "m"].includes(key)) event.preventDefault();
      if (key === " " || key === "k") {
        if (element.paused) void element.play().catch(() => setMessage("Press play on the video to start watching."));
        else element.pause();
      } else if (["j", "l", "arrowleft", "arrowright"].includes(key) && Number.isFinite(element.duration)) {
        const delta = key === "j" ? -10 : key === "l" ? 10 : key === "arrowleft" ? -5 : 5;
        element.currentTime = Math.max(0, Math.min(element.duration, element.currentTime + delta));
      } else if (key === "m") element.muted = !element.muted;
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); element?.pause(); };
  }, []);
  return (
    <section className="mt-7" aria-label="Anime player">
      <div className="viewer-video">
        <video ref={video} controls playsInline preload="metadata" aria-label={`${media.title} — ${unitLabel("anime", playback.unit)}`} src={streams[streamIndex]?.url}
          onLoadedMetadata={(event) => {
            const element = event.currentTarget;
            const previous = transfer.current;
            const seconds = previous?.seconds ?? initialSeconds.current;
            if (Number.isFinite(element.duration) && seconds < element.duration - 3) element.currentTime = seconds;
            element.playbackRate = speed;
            if (previous) { element.volume = previous.volume; element.muted = previous.muted; }
            transfer.current = null;
            switching.current = false;
            if (previous?.playing) void element.play().catch(() => setMessage("Press play to continue with this format."));
          }}
          onTimeUpdate={(event) => { if (Date.now() - lastSave.current > 5000) savePosition(event.currentTarget); }}
          onPause={(event) => savePosition(event.currentTarget)}
          onRateChange={(event) => setSpeed(event.currentTarget.playbackRate)}
          onEnded={() => save(media, {
            progress: Math.max(entry?.progress || 0, playback.unit.number),
            status: media.total === playback.unit.number ? "completed" : "current",
            watchPosition: { unit: playback.unit.id, seconds: 0 },
          })}
          onError={() => {
            if (streamIndex + 1 < streams.length) changeStream(streamIndex + 1);
            else onFailure("The video source couldn’t be played. Try again or return to the series.");
          }}
        />
      </div>
      <div className="player-tools mt-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => seek(-10)} aria-label="Back 10 seconds"><RotateCcw className="size-4" />10s</Button>
          <Button variant="ghost" size="sm" onClick={() => seek(10)} aria-label="Forward 10 seconds"><RotateCw className="size-4" />10s</Button>
          {canPiP && <Button variant="ghost" size="icon" onClick={pictureInPicture} aria-label="Picture in picture"><PictureInPicture2 className="size-4" /></Button>}
          <Button variant="ghost" size="icon" onClick={fullscreen} aria-label="Fullscreen video"><Maximize className="size-4" /></Button>
        </div>
        <div className="player-settings">
          <label><span>Playback speed</span><select className="field" value={speed} onChange={(event) => { const value = Number(event.target.value); setSpeed(value); if (video.current) video.current.playbackRate = value; }}>
            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((value) => <option key={value} value={value}>{value}×{value === 1 ? " · Normal" : ""}</option>)}
          </select></label>
          {streams.length > 1 && <label><span>Video format</span><select className="field" value={streamIndex} onChange={(event) => changeStream(Number(event.target.value))}>
            {streams.map((stream, index) => <option key={stream.url} value={index}>{stream.label}</option>)}
          </select></label>}
        </div>
      </div>
      {message && <p className="mt-3 text-sm text-zinc-400" role="status">{message}</p>}
      <details className="viewer-shortcuts mt-4"><summary>Keyboard controls</summary><p>Space or K: play / pause · ← / →: seek 5 seconds · J / L: seek 10 seconds · M: mute</p></details>
    </section>
  );
}
