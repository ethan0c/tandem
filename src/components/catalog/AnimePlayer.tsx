"use client";
import { useEffect, useRef, useState } from "react";
import {
  Heart, Maximize, Minimize, Pause, PictureInPicture2, Play,
  RotateCcw, RotateCw, Settings2, Users, Volume2, VolumeX,
} from "lucide-react";
import { useClientValue } from "@/hooks/useClientValue";
import type { CatalogTitle } from "@/lib/catalog-types";
import type { ContentPlayback } from "@/lib/content-types";
import { aniSkipWindows, type SkipWindow } from "@/lib/skip-times";
import { unitLabel } from "@/lib/spoilers";
import { useLibrary } from "./LibraryProvider";

type InlineVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
const EMPTY_STREAMS: NonNullable<ContentPlayback["streams"]> = [];
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function clockTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
    : `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

export function AnimePlayer({ media, playback, onFailure, onWatchTogether, transitioning = false }: {
  media: CatalogTitle;
  playback: ContentPlayback;
  onFailure: (message: string) => void;
  onWatchTogether?: () => void;
  transitioning?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const { entries, save } = useLibrary();
  const entry = entries.find((item) => item.media.kind === "anime" && item.media.id === media.id);
  const liked = entry?.likedEpisodes?.some((item) => item.unit === playback.unit.id) || false;
  const [streamIndex, setStreamIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [message, setMessage] = useState("");
  const [buffering, setBuffering] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [skipTimes, setSkipTimes] = useState<{ intro?: SkipWindow; outro?: SkipWindow }>({ intro: playback.intro, outro: playback.outro });
  const lastSave = useRef(0);
  const initialSeconds = useRef(entry?.watchPosition?.unit === playback.unit.id ? entry.watchPosition.seconds : 0);
  const switching = useRef(false);
  const transfer = useRef<{ seconds: number; playing: boolean; volume: number; muted: boolean; rate: number } | null>(null);
  const requestedSkipFor = useRef("");
  const canPiP = useClientValue(() => !!document.pictureInPictureEnabled, false);
  const streams = playback.streams || EMPTY_STREAMS;

  useEffect(() => { if (transitioning) video.current?.pause(); }, [transitioning]);
  useEffect(() => {
    const element = video.current;
    const source = streams[streamIndex];
    if (!element || !source || source.type !== "application/vnd.apple.mpegurl") return;
    let disposed = false;
    let destroy: (() => void) | undefined;
    if (element.canPlayType(source.type)) {
      element.src = source.url;
    } else {
      void import("hls.js").then(({ default: Hls }) => {
        if (disposed) return;
        if (!Hls.isSupported()) { onFailure("This browser cannot play the source's HLS video."); return; }
        const hls = new Hls();
        hls.loadSource(source.url);
        hls.attachMedia(element);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) onFailure("The source video could not be loaded. Try another episode or source.");
        });
        destroy = () => hls.destroy();
      }).catch(() => onFailure("The HLS player could not be loaded."));
    }
    return () => { disposed = true; destroy?.(); element.removeAttribute("src"); element.load(); };
  }, [streams, streamIndex, onFailure]);

  useEffect(() => {
    const update = () => setExpanded(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  useEffect(() => {
    if (!playback.malId || !Number.isFinite(duration) || duration < 60 || (skipTimes.intro && skipTimes.outro)) return;
    const key = `${playback.malId}:${playback.unit.number}:${Math.round(duration)}`;
    if (requestedSkipFor.current === key) return;
    requestedSkipFor.current = key;
    const controller = new AbortController();
    const url = new URL(`https://api.aniskip.com/v2/skip-times/${playback.malId}/${playback.unit.number}`);
    for (const type of ["op", "ed", "mixed-op", "mixed-ed"]) url.searchParams.append("types", type);
    url.searchParams.set("episodeLength", duration.toFixed(3));
    void fetch(url, { signal: controller.signal }).then((response) => response.json()).then((data) => {
      if (controller.signal.aborted) return;
      const found = aniSkipWindows(data, duration);
      setSkipTimes((current) => ({ intro: current.intro || found.intro, outro: current.outro || found.outro }));
    }).catch(() => { /* Skipping stays unavailable when timing data is missing. */ });
    return () => controller.abort();
  }, [duration, playback.malId, playback.unit.number, skipTimes.intro, skipTimes.outro]);

  function savePosition(element: HTMLVideoElement) {
    if (switching.current || element.ended || element.readyState < 1) return;
    lastSave.current = Date.now();
    save(media, { status: "current", watchPosition: { unit: playback.unit.id, seconds: element.currentTime } });
  }
  function changeStream(index: number) {
    if (index === streamIndex || !streams[index]) return;
    const element = video.current;
    if (element) transfer.current = { seconds: element.currentTime, playing: !element.paused, volume: element.volume, muted: element.muted, rate: element.playbackRate };
    switching.current = true;
    setBuffering(true);
    setStreamIndex(index);
  }
  function seek(seconds: number) {
    const element = video.current;
    if (element && Number.isFinite(element.duration)) {
      element.currentTime = Math.max(0, Math.min(element.duration, element.currentTime + seconds));
      setCurrentTime(element.currentTime);
    }
  }
  function togglePlay() {
    const element = video.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => setMessage("Press play again to start the video."));
    else element.pause();
  }
  function toggleLike() {
    const previous = entry?.likedEpisodes || [];
    const likedEpisodes = liked
      ? previous.filter((item) => item.unit !== playback.unit.id)
      : [...previous, { unit: playback.unit.id, number: playback.unit.number, group: playback.unit.group === "Sub" || playback.unit.group === "Dub" ? playback.unit.group : undefined }];
    save(media, { likedEpisodes, status: entry?.status || "current" });
  }
  async function toggleFullscreen() {
    const element = video.current as InlineVideo | null;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (frame.current?.requestFullscreen) await frame.current.requestFullscreen();
      else if (element?.webkitEnterFullscreen) element.webkitEnterFullscreen();
      else setMessage("Fullscreen is unavailable in this browser.");
    } catch { setMessage("Fullscreen is unavailable here. You can keep watching inline."); }
  }
  async function pictureInPicture() {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.current?.requestPictureInPicture();
    } catch { setMessage("Picture in picture is unavailable for this video."); }
  }
  useEffect(() => {
    const element = video.current;
    const key = (event: KeyboardEvent) => {
      if (transitioning || event.altKey || event.ctrlKey || event.metaKey || !(event.target instanceof HTMLElement) || event.target.closest("input,select,textarea,button,video,[contenteditable]")) return;
      if (!element || !element.getBoundingClientRect().height) return;
      const pressed = event.key.toLowerCase();
      if ([" ", "k", "j", "l", "arrowleft", "arrowright", "m"].includes(pressed)) event.preventDefault();
      if (pressed === " " || pressed === "k") {
        if (element.paused) void element.play().catch(() => setMessage("Press play on the video to start watching."));
        else element.pause();
      } else if (["j", "l", "arrowleft", "arrowright"].includes(pressed) && Number.isFinite(element.duration)) {
        const delta = pressed === "j" ? -10 : pressed === "l" ? 10 : pressed === "arrowleft" ? -5 : 5;
        element.currentTime = Math.max(0, Math.min(element.duration, element.currentTime + delta));
      } else if (pressed === "m") element.muted = !element.muted;
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); element?.pause(); };
  }, [transitioning]);

  const actions = (
    <div className="custom-player-actions">
      <button type="button" className="custom-player-pill" aria-label={liked ? "Unlike episode" : "Like episode"} aria-pressed={liked} onClick={toggleLike}>
        <Heart className={`size-4 ${liked ? "fill-brand-400 text-brand-400" : ""}`} />{liked ? "Liked" : "Like"}
      </button>
      {onWatchTogether && <button type="button" className="custom-player-pill" onClick={onWatchTogether}><Users className="size-4" />Watch together</button>}
    </div>
  );
  if (playback.embedUrl && !streams.length) return (
    <section className="mt-7" aria-label="Anime player">
      <div className="viewer-video custom-player-frame" ref={frame}>
        <iframe title={`${media.title} — ${unitLabel("anime", playback.unit)}`} src={playback.embedUrl} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        {actions}
      </div>
      <p className="mt-3 text-xs leading-6 text-zinc-400">This source supplies its own player. Tandem cannot control its playback or save your position.</p>
    </section>
  );

  const activeSkip = (["intro", "outro"] as const).find((name) => {
    const window = skipTimes[name];
    return window && currentTime >= window.start - 2 && currentTime < window.end - 1;
  });
  return (
    <section className="mt-7" aria-label="Anime player">
      <div className="viewer-video custom-player-frame" ref={frame} aria-busy={buffering}>
        <video ref={video} playsInline preload="metadata" aria-label={`${media.title} — ${unitLabel("anime", playback.unit)}`} src={streams[streamIndex]?.type === "application/vnd.apple.mpegurl" ? undefined : streams[streamIndex]?.url}
          onClick={togglePlay}
          onLoadStart={() => setBuffering(true)}
          onWaiting={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onPlay={() => setPlaying(true)}
          onPlaying={() => { setPlaying(true); setBuffering(false); }}
          onVolumeChange={(event) => { setVolume(event.currentTarget.volume); setMuted(event.currentTarget.muted); }}
          onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
          onLoadedMetadata={(event) => {
            const element = event.currentTarget;
            const previous = transfer.current;
            const seconds = previous?.seconds ?? initialSeconds.current;
            if (Number.isFinite(element.duration) && seconds < element.duration - 3) element.currentTime = seconds;
            element.playbackRate = previous?.rate ?? speed;
            if (previous) { element.volume = previous.volume; element.muted = previous.muted; }
            setCurrentTime(element.currentTime);
            setDuration(Number.isFinite(element.duration) ? element.duration : 0);
            transfer.current = null;
            switching.current = false;
            if (previous?.playing) void element.play().catch(() => setMessage("Press play to continue with this format."));
          }}
          onTimeUpdate={(event) => {
            setCurrentTime(event.currentTarget.currentTime);
            if (Date.now() - lastSave.current > 5000) savePosition(event.currentTarget);
          }}
          onPause={(event) => { setPlaying(false); savePosition(event.currentTarget); }}
          onRateChange={(event) => { if (!switching.current) setSpeed(event.currentTarget.playbackRate); }}
          onEnded={() => {
            setPlaying(false);
            save(media, {
              progress: Math.max(entry?.progress || 0, playback.unit.number),
              status: media.total === playback.unit.number ? "completed" : "current",
              watchPosition: { unit: playback.unit.id, seconds: 0 },
            });
          }}
          onError={() => {
            setBuffering(false);
            if (streamIndex + 1 < streams.length) changeStream(streamIndex + 1);
            else onFailure("The video source couldn’t be played. Try again or return to the series.");
          }}
        />
        {actions}
        {buffering && <div className="video-loading-note" role="status">Loading video…</div>}
        {!playing && !buffering && <button type="button" className="custom-player-center" onClick={togglePlay} aria-label="Play video"><Play className="size-7 fill-current" /></button>}
        <div className="custom-player-controls" role="group" aria-label="Playback controls">
          {activeSkip && <button type="button" className="custom-player-skip" onClick={() => {
            const end = skipTimes[activeSkip]?.end;
            if (end !== undefined && video.current) { video.current.currentTime = Math.min(end, duration || end); setCurrentTime(video.current.currentTime); }
          }}>Skip {activeSkip}</button>}
          <label className="custom-player-seek-label">
            <span className="sr-only">Seek video</span>
            <input type="range" className="custom-player-seek" aria-label="Seek video" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} disabled={!duration} onChange={(event) => {
              if (video.current) video.current.currentTime = Number(event.target.value);
              setCurrentTime(Number(event.target.value));
            }} />
          </label>
          <div className="custom-player-control-row">
            <button type="button" className="custom-player-icon" aria-label={playing ? "Pause" : "Play"} onClick={togglePlay}>{playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}</button>
            <button type="button" className="custom-player-icon" aria-label="Back 10 seconds" onClick={() => seek(-10)}><RotateCcw className="size-5" /><span>10</span></button>
            <button type="button" className="custom-player-icon" aria-label="Forward 10 seconds" onClick={() => seek(10)}><RotateCw className="size-5" /><span>10</span></button>
            <span className="custom-player-time">{clockTime(currentTime)} / {duration ? clockTime(duration) : "--:--"}</span>
            <span className="custom-player-spacer" />
            <button type="button" className="custom-player-icon" aria-label={muted || volume === 0 ? "Unmute" : "Mute"} onClick={() => { if (video.current) video.current.muted = !video.current.muted; }}>{muted || volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button>
            <label className="custom-player-volume-label"><span className="sr-only">Volume</span><input type="range" aria-label="Volume" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => {
              if (video.current) { video.current.volume = Number(event.target.value); video.current.muted = false; }
            }} /></label>
            <details className="custom-player-settings">
              <summary className="custom-player-icon" aria-label="Playback settings" title="Playback settings"><Settings2 className="size-5" /></summary>
              <div className="custom-player-settings-panel">
                <label>Playback speed<select value={speed} onChange={(event) => { const rate = Number(event.target.value); setSpeed(rate); if (video.current) video.current.playbackRate = rate; }}>
                  {SPEEDS.map((value) => <option key={value} value={value}>{value}×{value === 1 ? " · Normal" : ""}</option>)}
                </select></label>
                <label>Video format<select value={streamIndex} disabled={streams.length < 2} onChange={(event) => changeStream(Number(event.target.value))}>
                  {streams.map((stream, index) => <option key={stream.url} value={index}>{stream.label} · {stream.type === "application/vnd.apple.mpegurl" ? "HLS" : stream.type.replace("video/", "").toUpperCase()}</option>)}
                </select></label>
              </div>
            </details>
            {canPiP && <button type="button" className="custom-player-icon" onClick={pictureInPicture} aria-label="Picture in picture"><PictureInPicture2 className="size-5" /></button>}
            <button type="button" className="custom-player-icon" onClick={toggleFullscreen} aria-label={expanded ? "Exit fullscreen" : "Fullscreen"}>{expanded ? <Minimize className="size-5" /> : <Maximize className="size-5" />}</button>
          </div>
        </div>
      </div>
      {message && <p className="mt-3 text-sm text-zinc-400" role="status">{message}</p>}
      <p className="mt-3 text-xs text-zinc-500">Space or K: play and pause · ← / →: seek 5 seconds · J / L: seek 10 seconds · M: mute</p>
    </section>
  );
}
