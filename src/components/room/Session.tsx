"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useClientValue } from "@/hooks/useClientValue";
import { useRoom } from "@/hooks/useRoom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { FloatingCall } from "./FloatingCall";
import { Player } from "./Player";
import { SourceDialog } from "./SourceDialog";
import { TopBar } from "./TopBar";

interface Props {
  roomId: string;
  name: string;
  localStream: MediaStream | null;
}

export function Session({ roomId, name, localStream }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const room = useRoom(roomId, name);
  const rtc = useWebRTC({
    socketRef: room.socketRef,
    selfId: room.selfId,
    members: room.members,
    localStream,
  });

  const [localFile, setLocalFile] = useState<File | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drift, setDrift] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useClientValue(() => window.location.origin, "");
  const roomUrl = origin ? `${origin}/room/${roomId}` : "";

  // Stop local media when leaving the room.
  useEffect(() => {
    return () => localStream?.getTracks().forEach((t) => t.stop());
  }, [localStream]);

  // Chrome (top bar + controls) hides after a few idle seconds while playing.
  const bump = useCallback(() => {
    setActive(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setActive(false), 2800);
  }, []);
  useEffect(() => {
    idleTimer.current = setTimeout(() => setActive(false), 2800);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  // Fullscreen handling on the whole room, so the floating camera stays visible.
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
  }, []);

  // A local file only counts while the shared source is that same file.
  const effectiveFile =
    room.source?.kind === "file" && localFile && localFile.name === room.source.name ? localFile : null;

  const onPlayingChange = useCallback((p: boolean) => setPlaying(p), []);
  const onDrift = useCallback((d: number | null) => setDrift(d), []);

  const chromeVisible = active || !playing || sourceOpen;
  const pickerName =
    room.remote && room.remote.from !== room.selfId
      ? (room.members.find((m) => m.id === room.remote?.from)?.name ?? null)
      : null;

  return (
    <div
      ref={containerRef}
      onMouseMove={bump}
      onTouchStart={bump}
      className="relative flex h-dvh flex-col overflow-hidden bg-zinc-950 text-white"
    >
      <TopBar
        roomId={roomId}
        roomUrl={roomUrl}
        members={room.members}
        selfId={room.selfId}
        status={room.status}
        drift={drift}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        visible={chromeVisible}
      />

      <Player
        source={room.source}
        localFile={effectiveFile}
        remote={room.remote}
        selfId={room.selfId}
        serverNow={room.serverNow}
        emitSync={room.emitSync}
        onOpenSource={() => setSourceOpen(true)}
        onPickFile={setLocalFile}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        onDrift={onDrift}
        onPlayingChange={onPlayingChange}
        chromeVisible={chromeVisible}
        pickerName={pickerName}
      />

      <FloatingCall
        containerRef={containerRef}
        localStream={localStream}
        peers={rtc.peers}
        members={room.members}
        micOn={rtc.micOn}
        camOn={rtc.camOn}
        toggleMic={rtc.toggleMic}
        toggleCam={rtc.toggleCam}
        roomUrl={roomUrl}
      />

      <SourceDialog
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onUrl={(url) => room.changeSource({ kind: "url", url })}
        onFile={(file) => {
          setLocalFile(file);
          room.changeSource({ kind: "file", name: file.name });
        }}
      />

      {room.status === "disconnected" && (
        <div className="absolute inset-x-0 top-14 z-30 flex justify-center px-4">
          <div className="rounded-full border border-amber-400/30 bg-amber-950/80 px-4 py-1.5 text-xs text-amber-200 backdrop-blur">
            Connection lost. Trying to reconnect…
          </div>
        </div>
      )}
    </div>
  );
}
