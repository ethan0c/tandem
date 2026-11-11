"use client";

import { IconButton as ControlButton } from "@/components/Button";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Film,
  FolderOpen,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { expectedTime, type PlaybackState, type Source, type SyncReason } from "@/lib/types";
import type { RemotePlayback } from "@/hooks/useRoom";
import { Loader } from "@/components/Loader";
import { formatTime } from "@/lib/format";
import type { ContentCatalog, ContentPlayback } from "@/lib/content-types";
import type { ReadingState, RoomStory } from "@/lib/reading";
import { MangaReader } from "@/components/catalog/MangaReader";
import { useReadingSettings } from "@/components/catalog/useReadingSettings";

interface PlayerProps {
  preview?: { poster: string; time: number; duration: number };
  source: Source | null;
  localFile: File | null;
  remote: RemotePlayback | null;
  selfId: string | null;
  serverNow: () => number;
  emitSync: (playing: boolean, time: number, reason: SyncReason) => void;
  onOpenSource: () => void;
  onPickFile: (file: File) => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onDrift: (drift: number | null) => void;
  onPlayingChange: (playing: boolean) => void;
  chromeVisible: boolean;
  pickerName: string | null;
  story: RoomStory | null;
  reading: ReadingState;
  hostId: string | null;
  changeReading: (patch: Partial<ReadingState>) => void;
}

export function Player({
  preview,
  source,
  localFile,
  remote,
  selfId,
  serverNow,
  emitSync,
  onOpenSource,
  onPickFile,
  onToggleFullscreen,
  isFullscreen,
  onDrift,
  onPlayingChange,
  chromeVisible,
  pickerName,
  story,
  reading,
  hostId,
  changeReading,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stateRef = useRef<PlaybackState>({ playing: false, time: 0, updatedAt: 0 });

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogVideo, setCatalogVideo] = useState<{ key: string; url: string; type: string } | null>(null);
  const [mangaCatalog, setMangaCatalog] = useState<ContentCatalog | null>(null);
  const [mangaPlayback, setMangaPlayback] = useState<ContentPlayback | null>(null);
  const [mangaCatalogLoading, setMangaCatalogLoading] = useState(false);
  const [mangaPlaybackLoading, setMangaPlaybackLoading] = useState(false);
  const [readingSettings, setReadingSettings] = useReadingSettings();
  const catalogMediaId = source?.kind === "catalog" ? source.mediaId : "";
  const catalogUnitId = source?.kind === "catalog" ? source.unitId : "";
  const catalogSourceId = source?.kind === "catalog" ? source.sourceId || "" : "";
  const catalogKey = `${catalogMediaId}:${catalogUnitId}:${catalogSourceId}`;
  const catalogLoading = source?.kind === "catalog" && catalogVideo?.key !== catalogKey && !error;
  const mangaMode = story?.kind === "manga";
  const mangaId = mangaMode ? story.id : "";

  const needsFile = source?.kind === "file" && !localFile;
  const hasMedia = !!preview || (!!source && !needsFile) || mangaMode;

  const stamp = useCallback(
    (p: boolean, t: number) => {
      stateRef.current = { playing: p, time: t, updatedAt: serverNow() };
    },
    [serverNow],
  );

  /** Bring the <video> in line with stateRef (used for remote updates and after media loads). */
  const applyState = useCallback(() => {
    const v = videoRef.current;
    if (!v || v.readyState < 1) return;
    const st = stateRef.current;
    const expected = expectedTime(st, serverNow());
    if (Math.abs(v.currentTime - expected) > 0.5) v.currentTime = expected;
    if (st.playing && v.paused) {
      v.play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    } else if (!st.playing && !v.paused) {
      v.pause();
    }
  }, [serverNow]);

  // Remote playback changes.
  useEffect(() => {
    if (!remote || remote.from === selfId) return;
    stateRef.current = remote.playback;
    applyState();
  }, [remote, selfId, applyState]);

  useEffect(() => {
    if (!catalogMediaId || !catalogUnitId) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ kind: "anime", id: catalogMediaId, unit: catalogUnitId,
      ...(catalogSourceId ? { sourceId: catalogSourceId } : {}) });
    void fetch(`/api/content?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as ContentPlayback & { error?: string };
        if (!response.ok) throw new Error(data.error || "This episode is unavailable.");
        const stream = data.streams?.[0];
        if (!stream) throw new Error("This episode has no video the room can play. Share its tab instead.");
        if (!controller.signal.aborted) setCatalogVideo({ key: catalogKey, url: stream.url, type: stream.type });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setBuffering(false);
          setError(reason instanceof Error ? reason.message : "This episode is unavailable.");
        }
      });
    return () => controller.abort();
  }, [catalogMediaId, catalogUnitId, catalogSourceId, catalogKey]);

  useEffect(() => {
    if (!mangaId) {
      queueMicrotask(() => {
        setMangaCatalog(null);
        setMangaPlayback(null);
        setMangaCatalogLoading(false);
        setMangaPlaybackLoading(false);
      });
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setMangaCatalog(null);
      setMangaPlayback(null);
      setMangaCatalogLoading(true);
      setError(null);
    });
    void fetch(`/api/content?${new URLSearchParams({ kind: "manga", id: mangaId })}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json() as ContentCatalog & { error?: string };
        if (!response.ok) throw new Error(data.error || "This manga is unavailable.");
        if (controller.signal.aborted) return;
        setMangaCatalog(data);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : "This manga is unavailable.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setMangaCatalogLoading(false);
      });
    return () => controller.abort();
  }, [mangaId]);

  useEffect(() => {
    if (!mangaId || !mangaCatalog || mangaCatalog.media.id !== mangaId) return;
    if (!mangaCatalog.units.some((unit) => unit.id === reading.unit) && mangaCatalog.units[0]) {
      changeReading({
        unit: mangaCatalog.units[0].id,
        chapter: Math.max(1, mangaCatalog.units[0].number),
        page: 0,
      });
    }
  }, [mangaId, mangaCatalog, reading.unit, changeReading]);

  useEffect(() => {
    if (!mangaId || !reading.unit) {
      queueMicrotask(() => {
        setMangaPlayback(null);
        setMangaPlaybackLoading(false);
      });
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setMangaPlayback(null);
      setMangaPlaybackLoading(true);
    });
    void fetch(`/api/content?${new URLSearchParams({ kind: "manga", id: mangaId, unit: reading.unit })}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json() as ContentPlayback & { error?: string };
        if (!response.ok) throw new Error(data.error || "This chapter is unavailable.");
        if (!data.pages?.length) throw new Error("This chapter has no readable pages.");
        if (!controller.signal.aborted) setMangaPlayback(data);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(reason instanceof Error ? reason.message : "This chapter is unavailable.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setMangaPlaybackLoading(false);
      });
    return () => controller.abort();
  }, [mangaId, reading.unit]);

  // Load the media element whenever the source (or our local file) changes.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setError(null);
    setDuration(0);
    setCurrentTime(0);
    setBlocked(false);

    if (source?.kind === "catalog") {
      const selected = catalogVideo?.key === catalogKey ? catalogVideo : null;
      if (!selected) { v.removeAttribute("src"); v.load(); return; }
      if (selected.type !== "application/vnd.apple.mpegurl" || v.canPlayType(selected.type)) {
        v.src = selected.url;
        v.load();
        return;
      }
      let disposed = false;
      let destroy: (() => void) | undefined;
      void import("hls.js").then(({ default: Hls }) => {
        if (disposed) return;
        if (!Hls.isSupported()) { setError("This browser cannot play this episode's HLS video."); setBuffering(false); return; }
        const hls = new Hls();
        hls.loadSource(selected.url);
        hls.attachMedia(v);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) { setError("The source video could not be loaded. Share its tab instead."); setBuffering(false); }
        });
        destroy = () => hls.destroy();
      }).catch(() => { if (!disposed) { setError("The HLS player could not be loaded."); setBuffering(false); } });
      return () => { disposed = true; destroy?.(); v.removeAttribute("src"); v.load(); };
    }
    if (source?.kind === "remote") {
      v.src = source.url;
      v.load();
      return;
    }
    if (source?.kind !== "file" || !localFile) {
      v.removeAttribute("src");
      v.load();
      return;
    }
    const objectUrl = URL.createObjectURL(localFile);
    v.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [source, localFile, catalogVideo, catalogKey]);

  // Drift correction: nudge playback rate for small drift, hard-seek for large drift.
  useEffect(() => {
    if (preview || mangaMode) {
      if (mangaMode) onDrift(null);
      return;
    }
    const id = setInterval(() => {
      const v = videoRef.current;
      const st = stateRef.current;
      if (!v || !hasMedia) {
        onDrift(null);
        return;
      }
      if (!st.playing || v.paused || v.seeking || v.readyState < 3) {
        v.playbackRate = 1;
        onDrift(st.playing ? null : 0);
        return;
      }
      const expected = expectedTime(st, serverNow());
      const diff = v.currentTime - expected;
      onDrift(diff);
      if (Math.abs(diff) > 1.5) {
        v.currentTime = expected;
        v.playbackRate = 1;
      } else if (Math.abs(diff) > 0.12) {
        v.playbackRate = diff > 0 ? 0.92 : 1.08;
      } else {
        v.playbackRate = 1;
      }
    }, 500);
    return () => clearInterval(id);
  }, [hasMedia, serverNow, onDrift, preview, mangaMode]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || !hasMedia) return;
    if (v.paused) {
      stamp(true, v.currentTime);
      emitSync(true, v.currentTime, "play");
      v.play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    } else {
      v.pause();
      stamp(false, v.currentTime);
      emitSync(false, v.currentTime, "pause");
    }
  }, [hasMedia, stamp, emitSync]);

  const seekTo = useCallback(
    (t: number) => {
      const v = videoRef.current;
      if (!v || !hasMedia) return;
      const max = Number.isFinite(v.duration) ? v.duration : t;
      const clamped = Math.max(0, Math.min(t, max));
      v.currentTime = clamped;
      setCurrentTime(clamped);
      stamp(!v.paused, clamped);
      emitSync(!v.paused, clamped, "seek");
    },
    [hasMedia, stamp, emitSync],
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    if (preview || mangaMode) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const v = videoRef.current;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          if (v) seekTo(v.currentTime - 5);
          break;
        case "ArrowRight":
          if (v) seekTo(v.currentTime + 5);
          break;
        case "j":
          if (v) seekTo(v.currentTime - 10);
          break;
        case "l":
          if (v) seekTo(v.currentTime + 10);
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          onToggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekTo, toggleMute, onToggleFullscreen, preview, mangaMode]);

  useEffect(() => onPlayingChange(playing), [playing, onPlayingChange]);

  const shown = preview?.time ?? scrub ?? currentTime;
  const shownDuration = preview?.duration ?? duration;
  const pct = shownDuration > 0 ? (shown / shownDuration) * 100 : 0;
  const controlsVisible = chromeVisible || !playing;
  const canChangePage = !reading.hostOnly || selfId === hostId;
  const mangaLoading = mangaCatalogLoading || mangaPlaybackLoading;

  return (
    <div
      className={`relative flex-1 select-none bg-black ${playing && !chromeVisible ? "cursor-none" : ""}`}
      onDoubleClick={onToggleFullscreen}
    >
      <video
        ref={videoRef}
        playsInline
        aria-label={preview ? "Haikyu episode preview" : undefined}
        preload="auto"
        className={`absolute inset-0 h-full w-full object-contain object-center ${mangaMode ? "hidden" : ""}`}
        onClick={togglePlay}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          applyState();
        }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
        onEnded={(e) => {
          const d = e.currentTarget.duration;
          stamp(false, d);
          emitSync(false, d, "ended");
        }}
        onError={() => {
          if (!mangaMode && hasMedia) setError(source?.kind === "catalog" ? "The source video could not be played. Share its tab instead." : "This file could not be played. Try an MP4 or WebM.");
        }}
      />
      {preview && <Image src={preview.poster} alt="" fill preload sizes="(max-width: 767px) 92vw, (max-height: 800px) 640px, 1080px" className="pointer-events-none object-contain" />}

      {mangaMode && (
        <div className="absolute inset-0 overflow-y-auto bg-ink-950 px-4 pb-8 pt-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{story.title}</h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {mangaPlayback ? `${mangaPlayback.unit.label} · ${mangaPlayback.source}` : "Loading chapter…"}
                </p>
              </div>
              {mangaCatalog?.units.length ? (
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  Chapter
                  <select
                    className="field max-w-[min(60vw,20rem)]"
                    value={reading.unit || ""}
                    disabled={!canChangePage || mangaCatalogLoading}
                    onChange={(event) => {
                      const unit = mangaCatalog.units.find((item) => item.id === event.target.value);
                      if (unit) changeReading({
                        unit: unit.id,
                        chapter: Math.max(1, unit.number),
                        page: 0,
                      });
                    }}
                  >
                    {mangaCatalog.units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.label}{unit.group ? ` · ${unit.group}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            {mangaCatalog?.media && mangaPlayback && (
              <MangaReader
                key={`${mangaId}:${mangaPlayback.unit.id}`}
                media={mangaCatalog.media}
                playback={mangaPlayback}
                settings={readingSettings}
                onSettings={setReadingSettings}
                onFailure={setError}
                sharedPosition={reading.page}
                onPositionChange={(page) => changeReading({ page })}
                canNavigate={canChangePage}
              />
            )}
            {!mangaCatalogLoading && !mangaCatalog?.units.length && !error && (
              <p className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300" role="status">
                No MangaDex chapters are available for this title.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!source && !preview && !mangaMode && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-sm rounded-2xl border border-white/10 bg-ink-800/70 p-8 text-center backdrop-blur">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-600/20 text-brand-300">
              <Film className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Nothing playing yet</h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              Share the tab playing your show, or choose a video file you both have.
            </p>
            <button
              onClick={onOpenSource}
              className="btn3d btn3d-brand btn3d-md mt-5"
            >
              Choose a video
            </button>
          </div>
        </div>
      )}

      {/* Partner picked a local file we have not chosen yet */}
      {needsFile && source?.kind === "file" && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-sm rounded-2xl border border-white/10 bg-ink-800/70 p-8 text-center backdrop-blur">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-600/20 text-brand-300">
              <FolderOpen className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">{pickerName ?? "Your partner"} picked a file</h2>
            <p className="mt-1.5 break-all text-sm text-zinc-400">
              Choose <span className="font-sans text-zinc-200">{source.name}</span> on your computer to watch together.
            </p>
            <button
              onClick={() => fileInput.current?.click()}
              className="btn3d btn3d-brand btn3d-md mt-5"
            >
              Choose file
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="video/*,.mkv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      )}

      {error && hasMedia && (
        <div className="absolute inset-x-0 top-16 flex justify-center px-4">
          <div className="max-w-md rounded-xl border border-red-500/30 bg-red-950/70 px-4 py-2.5 text-center text-sm text-red-200 backdrop-blur">
            {error}
          </div>
        </div>
      )}

      {(buffering || catalogLoading || mangaLoading) && hasMedia && !blocked && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader label={mangaMode ? "Loading manga…" : "Loading video…"} />
        </div>
      )}

      {blocked && hasMedia && (
        <button
          onClick={() => {
            videoRef.current
              ?.play()
              .then(() => setBlocked(false))
              .catch(() => {});
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/40"
        >
          <span className="btn3d btn3d-brand btn3d-lg">
            <Play className="size-4" /> Tap to start watching
          </span>
        </button>
      )}

      {/* Controls */}
      {!mangaMode && <div
        className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-14 transition-opacity duration-300 ${
          controlsVisible && hasMedia ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <input
          type="range"
          min={0}
          max={shownDuration || 0}
          step={0.1}
          value={shown}
          disabled={!shownDuration}
          onChange={(e) => setScrub(parseFloat(e.target.value))}
          onPointerUp={() => {
            if (scrub !== null) seekTo(scrub);
            setScrub(null);
          }}
          onKeyUp={() => {
            if (scrub !== null) seekTo(scrub);
            setScrub(null);
          }}
          className="tandem-range w-full"
          style={{ "--fill": `${pct}%` } as React.CSSProperties}
          aria-label="Video progress"
        />
        <div className="mt-2 flex items-center gap-2 text-white">
          <IconButton onClick={togglePlay} label={playing ? "Pause" : "Play"} primary>
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </IconButton>
          <IconButton onClick={() => videoRef.current && seekTo(videoRef.current.currentTime - 10)} label="Back 10 seconds">
            <RotateCcw className="size-4" />
          </IconButton>
          <IconButton onClick={() => videoRef.current && seekTo(videoRef.current.currentTime + 10)} label="Forward 10 seconds">
            <RotateCw className="size-4" />
          </IconButton>
          <span className="ml-1 font-sans text-xs text-zinc-300">
            {formatTime(shown)} <span className="text-muted">/</span> {formatTime(shownDuration)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <div className="group flex items-center gap-1">
              <IconButton onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
                {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </IconButton>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = videoRef.current;
                  if (!v) return;
                  v.volume = parseFloat(e.target.value);
                  v.muted = v.volume === 0;
                }}
                className="tandem-range w-0 opacity-0 transition-all group-hover:w-20 group-hover:opacity-100"
                style={{ "--fill": `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
                aria-label="Volume"
              />
            </div>
            <IconButton onClick={onOpenSource} label="Change video">
              <Film className="size-4" />
            </IconButton>
            <IconButton onClick={onToggleFullscreen} label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </IconButton>
          </div>
        </div>
      </div>}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  primary?: boolean;
}) {
  return (
    <ControlButton
      onClick={onClick}
      aria-label={label}
      title={label}
      size="lg"
      tone={primary ? "primary" : "neutral"}
    >
      {children}
    </ControlButton>
  );
}
