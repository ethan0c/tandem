"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, LogOut, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { CallVolumeControl } from "@/components/CallVolumeControl";
import { ConnectionNotice } from "@/components/ConnectionNotice";
import { ChimeToggle } from "@/components/ChimeToggle";
import { LogoMark } from "@/components/Logo";
import { StreamVideo } from "@/components/room/StreamVideo";
import { useReleaseStream } from "@/hooks/useReleaseStream";
import { useRoom } from "@/hooks/useRoom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useCallOutputVolume } from "@/lib/call-volume";
import type { SyncReason } from "@/lib/types";

interface Props {
  roomId: string;
  name: string;
  localStream: MediaStream | null;
  embedded: boolean;
}

/** Posts to the extension content script that embeds this page. */
function post(msg: Record<string, unknown>) {
  if (window.parent !== window) window.parent.postMessage(msg, "*");
}

export function OverlaySession({ roomId, name, localStream, embedded }: Props) {
  const room = useRoom(roomId, name);
  const rtc = useWebRTC({ socketRef: room.socketRef, selfId: room.selfId, members: room.members, localStream });
  const [hasVideo, setHasVideo] = useState<boolean | null>(null);
  const [drift, setDrift] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useReleaseStream(localStream);

  // Remote playback changes go to the page's <video>, re-stamped onto the local clock.
  const { remote, selfId, serverNow } = room;
  useEffect(() => {
    const r = remote;
    if (!r || r.from === selfId) return;
    const offset = serverNow() - Date.now();
    post({
      type: "tandem:apply",
      state: { playing: r.playback.playing, time: r.playback.time, localUpdatedAt: r.playback.updatedAt - offset },
    });
  }, [remote, selfId, serverNow]);

  // Local user actions arrive from the page.
  const emitSync = room.emitSync;
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent) return;
      const m = e.data as { type?: string; playing?: boolean; time?: number; reason?: string; hasVideo?: boolean; drift?: number };
      if (!m || typeof m !== "object") return;
      if (m.type === "tandem:event") {
        const reason: SyncReason = m.reason === "seek" ? "seek" : m.playing ? "play" : "pause";
        emitSync(!!m.playing, Number(m.time) || 0, reason);
      } else if (m.type === "tandem:status") {
        setHasVideo(!!m.hasVideo);
      } else if (m.type === "tandem:drift") {
        setDrift(typeof m.drift === "number" ? m.drift : null);
      }
    };
    window.addEventListener("message", onMessage);
    post({ type: "tandem:ready" });
    return () => window.removeEventListener("message", onMessage);
  }, [emitSync]);

  const copyInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }, [roomId]);

  const peer = rtc.peers[0] ?? null;
  const callVolume = useCallOutputVolume();
  const peerName = peer ? (room.members.find((m) => m.id === peer.id)?.name ?? "Guest") : null;
  const hasLocalVideo = !!localStream?.getVideoTracks().length;
  const hasLocalAudio = !!localStream?.getAudioTracks().length;

  const sync =
    room.status !== "joined"
      ? { text: room.status === "connecting" ? "Connecting…" : "Reconnecting…", tone: "text-amber-300" }
      : hasVideo === false
        ? { text: "No video found on this page", tone: "text-amber-300" }
        : drift === null
          ? { text: hasVideo ? "Ready to watch" : embedded ? "Finding your video…" : "Open Tandem from your browser toolbar", tone: "text-zinc-400" }
          : Math.abs(drift) < 0.3
            ? { text: "Watching together", tone: "text-emerald-300" }
            : { text: "Catching up…", tone: "text-amber-300" };

  return (
    <div className="flex flex-col bg-ink text-white">
      <div className="relative aspect-[4/3] bg-ink-800">
        {peer ? (
          <>
            <StreamVideo stream={peer.stream} volume={callVolume} className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium">{peerName}</span>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            {hasLocalVideo && rtc.camOn ? (
              <StreamVideo stream={localStream} muted mirror className="absolute inset-0 h-full w-full object-cover opacity-60" />
            ) : null}
            <div className="relative">
              <p className="text-sm font-medium">Waiting for your partner…</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">Send them the invite link from the Tandem popup.</p>
              <button onClick={copyInvite} className="btn3d btn3d-brand btn3d-sm mt-3 !h-8">
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy room link"}
              </button>
            </div>
          </div>
        )}
        {peer && (
          <div className="absolute bottom-2 right-2 h-14 w-[4.7rem] overflow-hidden rounded-lg border border-white/20 bg-ink-800 shadow">
            {hasLocalVideo && rtc.camOn ? (
              <StreamVideo stream={localStream} muted mirror className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-zinc-400">You</div>
            )}
          </div>
        )}
      </div>

      <ConnectionNotice poor={rtc.poorConnection} cameraOn={hasLocalVideo && rtc.camOn} onTurnCameraOff={rtc.turnCameraOff} />
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <Toggle on={rtc.micOn} onClick={rtc.toggleMic} disabled={!hasLocalAudio} label={rtc.micOn ? "Mute" : "Unmute"}>
          {rtc.micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
        </Toggle>
        <Toggle on={rtc.camOn} onClick={rtc.toggleCam} disabled={!hasLocalVideo} label={rtc.camOn ? "Camera off" : "Camera on"}>
          {rtc.camOn ? <Video className="size-3.5" /> : <VideoOff className="size-3.5" />}
        </Toggle>
        <CallVolumeControl buttonClassName="flex size-7 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20" />
        <ChimeToggle className="flex size-7 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 [&_svg]:size-3.5" />
        <div className="ml-auto flex -space-x-1.5">
          {room.members.map((m) => (
            <span
              key={m.id}
              title={m.name}
              className={`flex size-6 items-center justify-center rounded-full border-2 border-ink text-[10px] font-semibold ${
                m.id === room.selfId ? "bg-brand-600" : "bg-brand-900"
              }`}
            >
              {m.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
        <button
          onClick={() => post({ type: "tandem:close" })}
          className="ml-1 flex h-7 items-center gap-1 rounded-full border border-white/10 px-2 text-[11px] text-zinc-300 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-white"
          title="Leave room"
        >
          <LogOut className="size-3" /> Leave
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-3 py-1.5 text-[11px]">
        <span className="flex items-center gap-1.5 text-zinc-400">
          <LogoMark size={14} /> <span className="font-sans">{roomId}</span>
        </span>
        <span className={sync.tone}>{sync.text}</span>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  disabled,
  label,
  children,
}: {
  on: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex size-7 items-center justify-center rounded-full transition disabled:opacity-40 ${
        on ? "bg-white/10 hover:bg-white/20" : "bg-red-500/90 hover:bg-red-500"
      }`}
    >
      {children}
    </button>
  );
}
