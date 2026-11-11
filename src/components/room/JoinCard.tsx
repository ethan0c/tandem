"use client";

import { useEffect, useRef, useState } from "react";
import { useClientValue } from "@/hooks/useClientValue";
import { reloadSession, saveSession } from "@/lib/last-room";
import Link from "next/link";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { HeaderFrame } from "@/components/HeaderFrame";
import { Logo } from "@/components/Logo";
import { StreamVideo } from "./StreamVideo";
import { prefetchIceServers } from "@/hooks/useWebRTC";

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

  // Fresh relay credentials, fetched while the camera starts and the name is typed.
  useEffect(() => prefetchIceServers(), []);

  useEffect(() => {
    let cancelled = false;
    let acquired: MediaStream | null = null;
    const resume = reloadSession(roomId);
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
      if (resume) {
        acquired?.getVideoTracks().forEach((track) => { track.enabled = resume.camOn; });
        acquired?.getAudioTracks().forEach((track) => { track.enabled = resume.micOn; });
        handedOff.current = true;
        onJoin({ name: resume.name, stream: acquired });
      }
    })();
    return () => {
      cancelled = true;
      if (!handedOff.current) acquired?.getTracks().forEach((t) => t.stop());
    };
  }, [roomId, onJoin]);

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
    saveSession({ roomId, name: clean, camOn, micOn, active: true });
    onJoin({ name: clean, stream });
  }

  const hasVideo = !!stream?.getVideoTracks().length;

  return (
    <div
      className={
        compact
          ? "flex flex-col bg-ink text-white"
          : "relative flex flex-1 flex-col items-center text-white"
      }
    >
      {!compact && (
        <>
          <header className="relative w-full">
            <HeaderFrame>
              <Link href="/" aria-label="Tandem home">
                <Logo size={24} light />
              </Link>
            </HeaderFrame>
          </header>
        </>
      )}
      <div className={compact ? "" : "relative flex w-full flex-1 items-center justify-center site-gutter py-10"}>
        <form
          onSubmit={join}
          className={
            compact
              ? "relative w-full overflow-hidden bg-ink"
              : "relative grid w-full max-w-5xl gap-8 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-center md:gap-12"
          }
        >
          <div className={`relative bg-ink-700 ${compact ? "aspect-video" : "aspect-video overflow-hidden rounded-xl ring-1 ring-white/10"}`}>
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
                className={`control-button control-xl ${
                  micOn ? "bg-black/50" : "control-danger"
                }`}
                aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
              >
                {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              </button>
              <button
                type="button"
                onClick={toggleCam}
                disabled={!hasVideo}
                className={`control-button control-xl ${
                  camOn ? "bg-black/50" : "control-danger"
                }`}
                aria-label={camOn ? "Turn camera off" : "Turn camera on"}
              >
                {camOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
              </button>
            </div>
          </div>
          <div className={compact ? "space-y-3 p-4" : "space-y-5"}>
            {compact ? (
              <div>
                <p className="text-xs font-medium text-muted">Joining room</p>
                <p className="font-sans text-base text-white">{roomId}</p>
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Ready to join?</h1>
                <p className="mt-2 text-sm text-zinc-400">Room <span className="font-mono text-zinc-200">{roomId}</span></p>
              </div>
            )}
            {mediaError && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">{mediaError}</p>}
            <label className="block">
              <span className="mb-1.5 block text-sm text-zinc-300">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                placeholder="Cash"
                autoFocus
                className="field w-full"
              />
            </label>
            <button
              type="submit"
              className={`btn3d btn3d-brand w-full ${compact ? "btn3d-md" : "btn3d-lg"}`}
            >
              Join room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
