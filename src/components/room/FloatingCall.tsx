"use client";

import { useRef, useState, type RefObject } from "react";
import { Check, Copy, Mic, MicOff, Minimize2, Maximize2, Video, VideoOff } from "lucide-react";
import { CallVolumeControl } from "@/components/CallVolumeControl";
import { ConnectionNotice } from "@/components/ConnectionNotice";
import { useClientValue } from "@/hooks/useClientValue";
import { useDraggable } from "@/hooks/useDraggable";
import { useCallOutputVolume } from "@/lib/call-volume";
import type { Peer } from "@/hooks/useWebRTC";
import type { Member } from "@/lib/types";
import { StreamVideo } from "./StreamVideo";

const WIDTH_KEY = "tandem:call-width";
const MIN_WIDTH = 176;
const MAX_WIDTH = 720;
const SMALL_WIDTH = 288;
const LARGE_WIDTH = 480;
/** The video area is 4:3, so height grows by 3/4 of any width change. */
const HEIGHT_PER_WIDTH = 3 / 4;

function readSavedWidth(): number | null {
  try {
    const w = Number(localStorage.getItem(WIDTH_KEY));
    return w >= MIN_WIDTH ? Math.min(w, MAX_WIDTH) : null;
  } catch {
    return null;
  }
}

function saveWidth(w: number) {
  try {
    localStorage.setItem(WIDTH_KEY, String(Math.round(w)));
  } catch {
    /* storage blocked: the size still applies for this page */
  }
}

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
  poorConnection: boolean;
  turnCameraOff: () => void;
}

export function FloatingCall({ containerRef, localStream, peers, members, micOn, camOn, toggleMic, toggleCam, roomUrl, poorConnection, turnCameraOff }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [copied, setCopied] = useState(false);
  const callVolume = useCallOutputVolume();
  const savedWidth = useClientValue(readSavedWidth, null);
  const [width, setWidth] = useState<number | null>(null);
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef<{ px: number; width: number; height: number; right: number; bottom: number; maxWidth: number } | null>(null);
  const { pos, dragging, moveTo, handlers } = useDraggable(containerRef, ref, (c, e) => ({
    x: c.width - e.width - 16,
    y: c.height - e.height - 88,
  }));

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Guest";
  const hasLocalVideo = !!localStream?.getVideoTracks().length;
  const hasLocalAudio = !!localStream?.getAudioTracks().length;

  const currentWidth = width ?? savedWidth;

  /** Resize to `next` px wide while keeping the bottom-right corner where it is. */
  function resizeTo(next: number, from = resizeStart.current) {
    const el = ref.current;
    const container = containerRef.current;
    if (!el || !container || !pos) return;
    const rect = el.getBoundingClientRect();
    const start = from ?? {
      px: 0,
      width: rect.width,
      height: rect.height,
      right: pos.x + rect.width,
      bottom: pos.y + rect.height,
      maxWidth: maxWidthFor(container.getBoundingClientRect(), rect),
    };
    const w = Math.round(Math.min(Math.max(next, MIN_WIDTH), start.maxWidth));
    const h = start.height + (w - start.width) * HEIGHT_PER_WIDTH;
    setWidth(w);
    moveTo({ x: start.right - w, y: start.bottom - h });
    return w;
  }

  function onResizeDown(e: React.PointerEvent<HTMLButtonElement>) {
    const el = ref.current;
    const container = containerRef.current;
    if (!el || !container || !pos) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    resizeStart.current = {
      px: e.clientX,
      width: rect.width,
      height: rect.height,
      right: pos.x + rect.width,
      bottom: pos.y + rect.height,
      maxWidth: maxWidthFor(container.getBoundingClientRect(), rect),
    };
    setResizing(true);
  }

  function onResizeMove(e: React.PointerEvent<HTMLButtonElement>) {
    const s = resizeStart.current;
    if (!s) return;
    // The grip sits on the left edge, so dragging left makes the call wider.
    resizeTo(s.width - (e.clientX - s.px), s);
  }

  function onResizeUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!resizeStart.current) return;
    resizeStart.current = null;
    setResizing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (ref.current) saveWidth(ref.current.getBoundingClientRect().width);
  }

  function onResizeKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const step = e.shiftKey ? 64 : 24;
    const delta = e.key === "ArrowLeft" || e.key === "ArrowUp" ? step : e.key === "ArrowRight" || e.key === "ArrowDown" ? -step : 0;
    if (!delta) return;
    e.preventDefault();
    const w = resizeTo(rect.width + delta, null);
    if (w) saveWidth(w);
  }

  function toggleSize() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const w = resizeTo(rect.width < (SMALL_WIDTH + LARGE_WIDTH) / 2 ? LARGE_WIDTH : SMALL_WIDTH, null);
    if (w) saveWidth(w);
  }

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
        width: !minimized && currentWidth ? currentWidth : undefined,
      }}
      className={`group/call absolute z-30 max-w-[calc(100%-16px)] overflow-hidden rounded-2xl border border-white/15 bg-ink-800/90 text-white shadow-2xl shadow-black/50 backdrop-blur ${
        resizing ? "" : "transition-[width]"
      } ${dragging ? "cursor-grabbing" : "cursor-grab"} ${minimized ? "w-44" : "w-56 sm:w-72"}`}
    >
      {!minimized && (
        <button
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
          onKeyDown={onResizeKey}
          onDoubleClick={toggleSize}
          aria-label="Resize call (arrow keys, double-click to toggle size)"
          title="Drag to resize · double-click to toggle size"
          className={`absolute left-0 top-0 z-10 flex size-7 cursor-nwse-resize items-start justify-start rounded-br-xl p-1.5 text-white/80 transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-brand-400 group-hover/call:opacity-100 ${
            resizing ? "bg-black/40 opacity-100" : "bg-black/30 opacity-0"
          }`}
          style={{ touchAction: "none" }}
        >
          <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden="true">
            <path d="M1 9V1h8M1 5.5 5.5 1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
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
                    <StreamVideo stream={p.stream} volume={callVolume} className="h-full w-full object-cover" />
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
      <ConnectionNotice poor={poorConnection} cameraOn={hasLocalVideo && camOn} onTurnCameraOff={turnCameraOff} />
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <CallButton onClick={toggleMic} active={micOn} disabled={!hasLocalAudio} label={micOn ? "Mute" : "Unmute"}>
            {micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
          </CallButton>
          <CallButton onClick={toggleCam} active={camOn} disabled={!hasLocalVideo} label={camOn ? "Camera off" : "Camera on"}>
            {camOn ? <Video className="size-3.5" /> : <VideoOff className="size-3.5" />}
          </CallButton>
          <CallVolumeControl buttonClassName="flex size-7 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20" />
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

/** As wide as fits: inside the player with a margin, and short enough to fit its height. */
function maxWidthFor(container: DOMRect, el: DOMRect): number {
  const chrome = el.height - el.width * HEIGHT_PER_WIDTH;
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, container.width - 16, (container.height - 16 - chrome) / HEIGHT_PER_WIDTH));
}
