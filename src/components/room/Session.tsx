"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useClientValue } from "@/hooks/useClientValue";
import { useReleaseStream } from "@/hooks/useReleaseStream";
import { useRoom } from "@/hooks/useRoom";
import { useScreenShare } from "@/hooks/useScreenShare";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { FloatingReactions, partnerNotice, useFloatingReactions } from "@/components/Reactions";
import { TakenOver } from "@/components/TakenOver";
import { ChatPanel } from "./ChatPanel";
import { FloatingCall } from "./FloatingCall";
import { Player } from "./Player";
import { ScreenStage } from "./ScreenStage";
import { SourceDialog } from "./SourceDialog";
import { TopBar } from "./TopBar";

/** The chat panel's width on wide screens (Tailwind's w-80, in ChatPanel). */
const CHAT_WIDTH = 320;

interface Props {
  roomId: string;
  name: string;
  localStream: MediaStream | null;
}

export function Session({ roomId, name, localStream }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chrome (top bar + controls) hides after a few idle seconds while playing.
  const bump = useCallback(() => {
    setActive(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setActive(false), 2800);
  }, []);

  // A chat message brings the chrome back briefly, so the unread badge is seen while something plays.
  const floating = useFloatingReactions();
  // Reactions arrive with a member id; this turns it into "You" or their name (members as of now).
  const nameRef = useRef<(id: string) => string>(() => "");
  const room = useRoom(roomId, name, { onMessage: bump, onReaction: (r) => floating.add(r.id, r.emoji, nameRef.current(r.from)) });
  useEffect(() => {
    nameRef.current = (id) => (id === room.selfId ? "You" : (room.members.find((m) => m.id === id)?.name ?? "Guest"));
  });
  const notice = partnerNotice(room.members, room.selfId);
  // On a wide screen the chat sits beside the show; on a phone it covers it, like a sheet.
  const wide = useMediaQuery("(min-width: 640px)");
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
  const [chatOpen, setChatOpen] = useState(false);
  // How many messages had arrived when the chat was last open or closed; anything after is unread.
  const [seenCount, setSeenCount] = useState(0);
  const origin = useClientValue(() => window.location.origin, "");
  const roomUrl = origin ? `${origin}/room/${roomId}` : "";

  // Stop local media when leaving the room.
  useReleaseStream(localStream);

  useEffect(() => {
    idleTimer.current = setTimeout(() => setActive(false), 2800);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  const messageCount = room.messages.length;
  const unread = chatOpen ? 0 : Math.max(0, messageCount - seenCount);
  // Opening or closing marks everything so far as seen, so the badge only counts what arrives while closed.
  const setChat = useCallback(
    (open: boolean) => {
      setSeenCount(messageCount);
      setChatOpen(open);
    },
    [messageCount],
  );
  const toggleChat = useCallback(() => setChat(!chatOpen), [setChat, chatOpen]);
  const chatBeside = chatOpen && wide;

  // "c" opens and closes the chat, unless you are typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Otherwise the "c" lands in the message box that gets focus as the chat opens.
        e.preventDefault();
        toggleChat();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleChat]);

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
  const chromeVisible = active || (!playing && !isScreen) || sourceOpen || chatOpen;
  const pickerName =
    room.remote && room.remote.from !== room.selfId
      ? (room.members.find((m) => m.id === room.remote?.from)?.name ?? null)
      : null;

  return (
    <div
      ref={containerRef}
      onMouseMove={bump}
      onTouchStart={bump}
      className="relative flex h-dvh flex-col overflow-hidden bg-black text-white"
    >
      {/* The show and its controls make room for the chat on wide screens instead of hiding under it. */}
      <div className={`relative flex min-h-0 flex-1 flex-col transition-[margin] duration-200 ${chatBeside ? "mr-80" : ""}`}>
        <TopBar
          roomId={roomId}
          roomUrl={roomUrl}
          members={room.members}
          selfId={room.selfId}
          hostId={room.hostId}
          status={room.status}
          drift={isScreen ? null : drift}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          visible={chromeVisible}
          chat={{ open: chatOpen, unread, onToggle: toggleChat }}
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

      </div>

      <FloatingCall
        containerRef={containerRef}
        localStream={localStream}
        peers={rtc.peers}
        members={room.members}
        micOn={rtc.micOn}
        camOn={rtc.camOn}
        toggleMic={rtc.toggleMic}
        toggleCam={rtc.toggleCam}
        poorConnection={rtc.poorConnection}
        turnCameraOff={rtc.turnCameraOff}
        roomUrl={roomUrl}
        onReact={room.sendReaction}
        selfId={room.selfId}
        reserveRight={chatBeside ? CHAT_WIDTH : 0}
      />

      <FloatingReactions items={floating.items} onDone={floating.remove} />

      <ChatPanel
        open={chatOpen}
        onClose={() => setChat(false)}
        messages={room.messages}
        selfId={room.selfId}
        onSend={room.sendMessage}
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

      {notice && room.status !== "disconnected" && (
        <div role="status" className="absolute inset-x-0 top-16 md:top-[72px] z-30 flex justify-center px-4">
          <div className="rounded-full border border-amber-400/30 bg-amber-950/80 px-4 py-1.5 text-xs text-amber-200 backdrop-blur">
            {notice}
          </div>
        </div>
      )}

      {room.takenOver && <TakenOver onUseHere={room.useHere} />}

      {/* Only when the call is down too: while the partner's video still plays, the top bar's
          "Reconnecting…" is enough and the room should not look broken. */}
      {room.status === "disconnected" && !room.takenOver && rtc.peers.length === 0 && (
        <div className="absolute inset-x-0 top-16 md:top-[72px] z-30 flex justify-center px-4">
          <div className="rounded-full border border-amber-400/30 bg-amber-950/80 px-4 py-1.5 text-xs text-amber-200 backdrop-blur">
            Connection lost. Trying to reconnect…
          </div>
        </div>
      )}
    </div>
  );
}
