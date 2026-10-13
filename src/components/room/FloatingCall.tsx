"use client";

import { useRef, useState, type RefObject } from "react";
import { Check, Copy, Mic, MicOff, Minimize2, Maximize2, Video, VideoOff } from "lucide-react";
import { useDraggable } from "@/hooks/useDraggable";
import type { Peer } from "@/hooks/useWebRTC";
import type { Member } from "@/lib/types";
import { StreamVideo } from "./StreamVideo";

interface Props {
  containerRef: RefObject<HTMLElement | null>;
  localStream: MediaStream | null;
  peers: Peer[];
  members: Member[];
  micOn: boolean;
  camOn: boolean;
  toggleMic: () => void;
  toggleCam: () => void;
  roomUrl: string;
}

export function FloatingCall({ containerRef, localStream, peers, members, micOn, camOn, toggleMic, toggleCam, roomUrl }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const { pos, dragging, handlers } = useDraggable(containerRef, ref, (c, e) => ({
    x: c.width - e.width - 16,
    y: c.height - e.height - 88,
  }));

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Guest";
  const hasLocalVideo = !!localStream?.getVideoTracks().length;
  const hasLocalAudio = !!localStream?.getAudioTracks().length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div
      ref={ref}
      {...handlers}
      style={{
        left: pos?.x ?? 0,
        top: pos?.y ?? 0,
        visibility: pos ? "visible" : "hidden",
        touchAction: "none",
      }}
      className={`absolute z-30 overflow-hidden rounded-2xl border border-white/15 bg-ink-800/90 text-white shadow-2xl shadow-black/50 backdrop-blur transition-[width] ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      } ${minimized ? "w-44" : "w-56 sm:w-72"}`}
    >
      {!minimized && (
        <div className="relative aspect-[4/3] bg-ink-700">
          {peers.length === 0 ? (
            <>
              {hasLocalVideo && camOn ? (
                <StreamVideo stream={localStream} muted mirror className="h-full w-full object-cover" />
              ) : (
                <Placeholder label="You" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-center">
                <p className="text-xs text-zinc-300">Waiting for your partner…</p>
                <button
                  onClick={copy}
                  className="btn3d btn3d-brand btn3d-sm mt-1.5 !h-8"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? "Copied" : "Copy invite link"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={`grid h-full ${peers.length > 1 ? "grid-cols-2 grid-rows-2 gap-0.5" : ""}`}>
                {peers.map((p) => (
                  <div key={p.id} className="relative h-full overflow-hidden bg-ink-700">
                    <StreamVideo stream={p.stream} className="h-full w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium">
                      {nameOf(p.id)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-2 right-2 h-14 w-[4.7rem] overflow-hidden rounded-lg border border-white/20 bg-ink-800 shadow">
                {hasLocalVideo && camOn ? (
                  <StreamVideo stream={localStream} muted mirror className="h-full w-full object-cover" />
                ) : (
                  <Placeholder label="You" small />
                )}
              </div>
            </>
          )}
        </div>
      )}
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <CallButton onClick={toggleMic} active={micOn} disabled={!hasLocalAudio} label={micOn ? "Mute" : "Unmute"}>
            {micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
          </CallButton>
          <CallButton onClick={toggleCam} active={camOn} disabled={!hasLocalVideo} label={camOn ? "Camera off" : "Camera on"}>
            {camOn ? <Video className="size-3.5" /> : <VideoOff className="size-3.5" />}
          </CallButton>
        </div>
        {minimized && (
          <span className="truncate px-1 text-[11px] text-zinc-400">
            {peers.length ? peers.map((p) => nameOf(p.id)).join(", ") : "Waiting…"}
          </span>
        )}
        <CallButton onClick={() => setMinimized((m) => !m)} active label={minimized ? "Expand" : "Minimize"}>
          {minimized ? <Maximize2 className="size-3.5" /> : <Minimize2 className="size-3.5" />}
        </CallButton>
      </div>
    </div>
  );
}

function Placeholder({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <div className="flex h-full items-center justify-center bg-ink-700 text-zinc-400">
      <span
        className={`flex items-center justify-center rounded-full bg-brand-600/25 font-semibold text-brand-200 ${
          small ? "size-7 text-xs" : "size-14 text-lg"
        }`}
      >
        {label.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}

function CallButton({
  children,
  onClick,
  active,
  disabled = false,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex size-7 items-center justify-center rounded-full transition disabled:opacity-40 ${
        active ? "bg-white/10 hover:bg-white/20" : "bg-red-500/90 hover:bg-red-500"
      }`}
    >
      {children}
    </button>
  );
}
