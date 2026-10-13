"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useClientValue } from "@/hooks/useClientValue";
import { useReleaseStream } from "@/hooks/useReleaseStream";
import { useRoom } from "@/hooks/useRoom";
import { useScreenShare } from "@/hooks/useScreenShare";
import { useWebRTC } from "@/hooks/useWebRTC";
import { FloatingCall } from "./FloatingCall";
import { Player } from "./Player";
import { ScreenStage } from "./ScreenStage";
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
  const screen = useScreenShare({
    socketRef: room.socketRef,
    selfId: room.selfId,
    members: room.members,
    source: room.source,
    changeSource: room.changeSource,
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
  useReleaseStream(localStream);

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

  // A live share always counts as playing, so the chrome auto-hides.
  const screenSharerId = room.source?.kind === "screen" ? room.source.sharerId : null;
  const isScreen = !!screenSharerId;
  const chromeVisible = active || (!playing && !isScreen) || sourceOpen;
  const pickerName =
    room.remote && room.remote.from !== room.selfId
      ? (room.members.find((m) => m.id === room.remote?.from)?.name ?? null)
      : null;

  return (
    <div
      ref={containerRef}
      onMouseMove={bump}
      onTouchStart={bump}
      className="relative flex h-dvh flex-col overflow-hidden bg-ink text-white"
    >
      <TopBar
        roomId={roomId}
        roomUrl={roomUrl}
        members={room.members}
        selfId={room.selfId}
        status={room.status}
        drift={isScreen ? null : drift}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        visible={chromeVisible}
      />

      {room.source?.kind === "screen" ? (
        <ScreenStage
          isSharer={screen.isSharer}
          label={room.source.label}
          sharerName={room.members.find((m) => m.id === screenSharerId)?.name ?? null}
          localScreen={screen.localScreen}
          remoteScreen={screen.remoteScreen}
          error={screen.error}
          onDismissError={screen.clearError}
          onStop={screen.stop}
          onOpenSource={() => setSourceOpen(true)}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          chromeVisible={chromeVisible}
        />
      ) : (
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
      )}

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
        onFile={(file) => {
          setLocalFile(file);
          room.changeSource({ kind: "file", name: file.name });
        }}
        onScreen={screen.start}
        screenError={isScreen ? null : screen.error}
      />

      {room.status === "disconnected" && (
        <div className="absolute inset-x-0 top-16 md:top-[72px] z-30 flex justify-center px-4">
          <div className="rounded-full border border-amber-400/30 bg-amber-950/80 px-4 py-1.5 text-xs text-amber-200 backdrop-blur">
            Connection lost. Trying to reconnect…
          </div>
        </div>
      )}
    </div>
  );
}
