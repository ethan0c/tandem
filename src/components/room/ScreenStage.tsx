"use client";

import { IconButton as ControlButton } from "@/components/Button";

import { useEffect, useRef, useState } from "react";
import { Film, Maximize, Minimize, MonitorUp, Play, ScreenShareOff, Volume2, VolumeX } from "lucide-react";

import { Loader } from "@/components/Loader";

interface Props {
  isSharer: boolean;
  label: string;
  sharerName: string | null;
  localScreen: MediaStream | null;
  remoteScreen: MediaStream | null;
  error: string | null;
  onDismissError: () => void;
  onStop: () => void;
  onOpenSource: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  chromeVisible: boolean;
}

export function ScreenStage({
  isSharer,
  label,
  sharerName,
  localScreen,
  remoteScreen,
  error,
  onDismissError,
  onStop,
  onOpenSource,
  onToggleFullscreen,
  isFullscreen,
  chromeVisible,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  // The sharer previews their own capture muted, so they never hear it twice.
  const stream = isSharer ? localScreen : remoteScreen;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream;
    setWaiting(true);
    setBlocked(false);
    if (stream) {
      v.play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    }
    return () => {
      v.srcObject = null;
    };
  }, [stream]);

  // The sharer's "you're sharing" notice shows for a few seconds per share, then gets out of the way.
  const [noticeDoneFor, setNoticeDoneFor] = useState<MediaStream | null>(null);
  useEffect(() => {
    if (!isSharer || !localScreen) return;
    const t = setTimeout(() => setNoticeDoneFor(localScreen), 3000);
    return () => clearTimeout(t);
  }, [isSharer, localScreen]);
  const showNotice = isSharer && !!localScreen && noticeDoneFor !== localScreen;

  const toggleMute = () => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  };

  // Keyboard: f for fullscreen, m for mute (matches the regular player).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "f") onToggleFullscreen();
      else if (e.key === "m" && !isSharer) toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggleFullscreen, isSharer]);

  const who = sharerName ?? "Your partner";

  return (
    <div className="relative flex-1 select-none bg-black" onDoubleClick={onToggleFullscreen}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSharer}
        className="absolute inset-0 h-full w-full object-contain object-center"
        onPlaying={() => setWaiting(false)}
        onWaiting={() => setWaiting(true)}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
      />

      {!isSharer && (!remoteScreen || waiting) && !blocked && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-zinc-300">
          <Loader label={`Connecting to ${who}’s screen…`} />
        </div>
      )}

      {blocked && (
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

      {isSharer && (
        <div
          aria-hidden={!showNotice}
          className={`absolute inset-x-0 top-16 z-10 flex justify-center px-4 transition-opacity duration-300 ${
            showNotice ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="max-w-md rounded-2xl border border-white/10 bg-ink-800/85 px-4 py-3 text-sm shadow-xl backdrop-blur">
            <p className="flex items-center gap-2 font-medium">
              <MonitorUp className="size-4 text-brand-300" /> You&rsquo;re sharing {label}
            </p>
            <p className="mt-1 text-zinc-400">
              Play and pause in that tab. Everyone here watches along. Your preview has no sound so you do not hear the show twice.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-x-0 bottom-24 z-10 flex justify-center px-4">
          <button
            onClick={onDismissError}
            className="btn3d btn3d-ghost max-w-md whitespace-normal border-amber-400/30 bg-amber-950/80 px-4 py-2.5 text-center text-sm text-amber-200 backdrop-blur"
          >
            {error}
          </button>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-14 transition-opacity duration-300 ${
          chromeVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-white">
          <span className="flex items-center gap-2 rounded-full bg-red-600/90 px-2.5 py-1 text-xs font-semibold">
            <span className="size-1.5 animate-pulse rounded-full bg-white" /> Live
          </span>
          <span className="text-xs text-zinc-300">
            {isSharer ? `Sharing ${label}` : `${who} is sharing ${label}`}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {isSharer ? (
              <button
                onClick={onStop}
                className="btn3d btn3d-danger btn3d-sm"
              >
                <ScreenShareOff className="size-4" /> Stop sharing
              </button>
            ) : (
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
            )}
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

function IconButton({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <ControlButton
      onClick={onClick}
      aria-label={label}
      title={label}
      size="lg"
    >
      {children}
    </ControlButton>
  );
}
