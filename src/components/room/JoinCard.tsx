"use client";

import { useEffect, useRef, useState } from "react";
import { useClientValue } from "@/hooks/useClientValue";
import Link from "next/link";
import { ArrowRight, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { StreamVideo } from "./StreamVideo";

export interface JoinResult {
  name: string;
  stream: MediaStream | null;
}

const NAME_KEY = "tandem:name";

export function JoinCard({
  roomId,
  onJoin,
  compact = false,
}: {
  roomId: string;
  onJoin: (r: JoinResult) => void;
  /** Tight layout for the extension overlay: no logo, no page chrome. */
  compact?: boolean;
}) {
  const storedName = useClientValue(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  }, "");
  const [typedName, setName] = useState<string | null>(null);
  const name = typedName ?? storedName;
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const handedOff = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let acquired: MediaStream | null = null;
    (async () => {
      try {
        acquired = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        try {
          acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!cancelled) setMediaError("Camera unavailable. Joining with microphone only.");
        } catch {
          if (!cancelled) setMediaError("No camera or microphone. You can still watch together.");
        }
      }
      if (cancelled) {
        acquired?.getTracks().forEach((t) => t.stop());
        return;
      }
      setStream(acquired);
    })();
    return () => {
      cancelled = true;
      if (!handedOff.current) acquired?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function toggleCam() {
    const next = !camOn;
    stream?.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  }
  function toggleMic() {
    const next = !micOn;
    stream?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    const clean = name.trim() || "Guest";
    try {
      localStorage.setItem(NAME_KEY, clean);
    } catch {
      /* ignore */
    }
    handedOff.current = true;
    onJoin({ name: clean, stream });
  }

  const hasVideo = !!stream?.getVideoTracks().length;

  return (
    <div
      className={
        compact
          ? "flex flex-col bg-ink text-white"
          : "flex flex-1 flex-col items-center justify-center bg-ink px-5 py-10 text-white"
      }
    >
      {!compact && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(50rem_20rem_at_50%_-5%,rgb(124_58_237/0.25),transparent_60%)]" />
          <Link href="/" className="relative mb-8">
            <Logo size={30} light />
          </Link>
        </>
      )}
      <form
        onSubmit={join}
        className={
          compact
            ? "relative w-full overflow-hidden bg-ink"
            : "relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-ink-800/80 shadow-2xl shadow-black/40 backdrop-blur"
        }
      >
        <div className={`relative bg-ink-700 ${compact ? "aspect-video" : "aspect-[4/3]"}`}>
          {stream && hasVideo && camOn ? (
            <StreamVideo stream={stream} muted mirror className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-400">
              <div className="flex size-16 items-center justify-center rounded-full bg-brand-600/20 text-2xl font-semibold text-brand-300">
                {(name.trim() || "?").slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs">{camOn && !mediaError ? "Starting camera…" : "Camera off"}</span>
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            <button
              type="button"
              onClick={toggleMic}
              disabled={!stream?.getAudioTracks().length}
              className={`flex size-10 items-center justify-center rounded-full border transition disabled:opacity-40 ${
                micOn ? "border-white/15 bg-black/50 hover:bg-black/70" : "border-red-500/40 bg-red-500/80"
              }`}
              aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            </button>
            <button
              type="button"
              onClick={toggleCam}
              disabled={!hasVideo}
              className={`flex size-10 items-center justify-center rounded-full border transition disabled:opacity-40 ${
                camOn ? "border-white/15 bg-black/50 hover:bg-black/70" : "border-red-500/40 bg-red-500/80"
              }`}
              aria-label={camOn ? "Turn camera off" : "Turn camera on"}
            >
              {camOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
            </button>
          </div>
        </div>
        <div className={compact ? "space-y-3 p-4" : "space-y-4 p-5"}>
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Joining room</p>
            <p className={`font-mono text-white ${compact ? "text-base" : "text-lg"}`}>{roomId}</p>
          </div>
          {mediaError && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">{mediaError}</p>}
          <label className="block">
            <span className="mb-1.5 block text-sm text-zinc-300">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              placeholder="What should we call you?"
              autoFocus
              className="h-11 w-full rounded-xl border border-white/10 bg-ink-700 px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
            />
          </label>
          <button
            type="submit"
            className="btn3d btn3d-brand btn3d-md w-full"
          >
            Join room <ArrowRight className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
