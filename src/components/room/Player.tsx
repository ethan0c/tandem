"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  const needsFile = source?.kind === "file" && !localFile;
  const hasMedia = !!preview || (!!source && !needsFile);

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

  // Load the media element whenever the source (or our local file) changes.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setError(null);
    setDuration(0);
    setCurrentTime(0);
    setBlocked(false);

    if (source?.kind !== "file" || !localFile) {
      v.removeAttribute("src");
      v.load();
      return;
    }
    const objectUrl = URL.createObjectURL(localFile);
    v.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [source, localFile]);

  // Drift correction: nudge playback rate for small drift, hard-seek for large drift.
  useEffect(() => {
    if (preview) return;
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
  }, [hasMedia, serverNow, onDrift, preview]);

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
    if (preview) return;
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
  }, [togglePlay, seekTo, toggleMute, onToggleFullscreen, preview]);

  useEffect(() => onPlayingChange(playing), [playing, onPlayingChange]);

  const shown = preview?.time ?? scrub ?? currentTime;
  const shownDuration = preview?.duration ?? duration;
  const pct = shownDuration > 0 ? (shown / shownDuration) * 100 : 0;
  const controlsVisible = chromeVisible || !playing;

  return (
    <div
      className={`relative flex-1 select-none bg-black ${playing && !chromeVisible ? "cursor-none" : ""}`}
      onDoubleClick={onToggleFullscreen}
    >
      <video
        ref={videoRef}
        playsInline
        poster={preview?.poster}
        aria-label={preview ? "Haikyu episode preview" : undefined}
        preload="auto"
        className="absolute inset-0 h-full w-full"
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
          if (hasMedia) setError("This file could not be played. Try an MP4 or WebM.");
        }}
      />

      {/* Empty state */}
      {!source && !preview && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-sm rounded-2xl border border-white/10 bg-ink-800/70 p-8 text-center backdrop-blur">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-600/20 text-brand-300">
              <Film className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Nothing playing yet</h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              Share a browser tab live, or pick a file you both have.
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

      {buffering && hasMedia && !blocked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader label="Buffering…" size={48} />
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
            <Play className="size-4" /> Tap to start playback
          </span>
        </button>
      )}

      {/* Controls */}
      <div
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
          aria-label="Seek"
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
            {formatTime(shown)} <span className="text-zinc-500">/</span> {formatTime(shownDuration)}
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
      </div>
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
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-9 items-center justify-center rounded-full transition ${
        primary ? "bg-brand-600 hover:bg-brand-500" : "hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}
