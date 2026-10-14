"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playChime } from "@/lib/chime";
import { activateSession, finishSession, rememberRoom } from "@/lib/last-room";
import { clientId, tabId, getSocket, sendGoodbye, type AppSocket } from "@/lib/socket";
import {
  CHAT_HISTORY,
  type ChatMessage,
  type Member,
  type MemberStatus,
  type PlaybackState,
  type Reaction,
  type Source,
  type SyncReason,
} from "@/lib/types";

export type RoomStatus = "connecting" | "joined" | "disconnected";

/** Playback state plus who last changed it, so the player can ignore its own echoes. */
export interface RemotePlayback {
  playback: PlaybackState;
  from: string;
  reason: SyncReason;
  /** Monotonic counter so identical states still trigger an effect. */
  seq: number;
}

interface Options {
  /** Called for every chat message that arrives, including our own echo. */
  onMessage?: (message: ChatMessage) => void;
  /** Called for every reaction, including our own echo. */
  onReaction?: (reaction: { id: string; from: string; emoji: Reaction }) => void;
}

export function useRoom(roomId: string, name: string | null, options?: Options) {
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [selfId, setSelfId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [source, setSource] = useState<Source | null>(null);
  const [remote, setRemote] = useState<RemotePlayback | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<AppSocket | null>(null);
  const offsetRef = useRef(0);
  const seqRef = useRef(0);
  // The latest callback, so the socket listener never has to be re-registered.
  const onMessageRef = useRef(options?.onMessage);
  const onReactionRef = useRef(options?.onReaction);
  useEffect(() => {
    onMessageRef.current = options?.onMessage;
    onReactionRef.current = options?.onReaction;
  });

  /** Server clock estimate: local clock + measured offset. */
  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  useEffect(() => {
    if (!name) return;
    const socket = getSocket();
    socketRef.current = socket;
    let active = true;
    let pageHiding = false;

    const push = (playback: PlaybackState, from: string, reason: SyncReason) =>
      setRemote({ playback, from, reason, seq: ++seqRef.current });

    const measureClock = () =>
      new Promise<void>((resolve) => {
        let best = Infinity;
        let bestOffset = offsetRef.current;
        let n = 0;
        const ping = () => {
          if (!active) { resolve(); return; }
          const t0 = Date.now();
          socket.timeout(2000).emit("time:ping", (err, serverTime) => {
            if (!active) { resolve(); return; }
            if (!err) {
              const t1 = Date.now();
              const rtt = t1 - t0;
              if (rtt < best) {
                best = rtt;
                bestOffset = serverTime + rtt / 2 - t1;
              }
            }
            if (++n < 4) ping();
            else {
              offsetRef.current = bestOffset;
              resolve();
            }
          });
        };
        ping();
      });

    // Set once a connection drops, so the next successful join plays the "back" chime.
    let dropped = false;
    // Mirror of `source` for deciding which chime a change deserves.
    let currentSource: Source | null = null;
    const join = () => {
      setStatus("connecting");
      // The same clientId every time, so a reconnect lands us back in our own seat.
      socket.emit("room:join", { roomId, name, clientId, tabId }, (ack) => {
        if (!active) return;
        activateSession(roomId, name);
        if (dropped) playChime("reconnect");
        dropped = false;
        offsetRef.current = ack.serverNow - Date.now();
        setSelfId(ack.selfId);
        setHostId(ack.state.hostId);
        setMembers(ack.state.members);
        // The room's recent chat: everything we missed while away, or the history for a late joiner.
        setMessages(ack.state.chat ?? []);
        currentSource = ack.state.source;
        setSource(ack.state.source);
        push(ack.state.playback, "server", "resync");
        setStatus("joined");
        void measureClock();
      });
    };

    const onJoined = (m: Member) => {
      playChime("join");
      setMembers((prev) => [...prev.filter((p) => p.id !== m.id), m]);
    };
    const onLeft = ({ id, hostId: h }: { id: string; hostId: string | null }) => {
      playChime("leave");
      setMembers((prev) => prev.filter((p) => p.id !== id));
      setHostId(h);
    };
    const onReplaced = ({ id, member, hostId: h }: { id: string; member: Member; hostId: string | null }) => {
      setMembers((prev) => [...prev.filter((m) => m.id !== id && m.id !== member.id), member]);
      setHostId(h);
    };
    const onSync = ({ playback, from, reason }: { playback: PlaybackState; from: string; reason: SyncReason }) =>
      push(playback, from, reason);
    const onSource = ({ source: s, playback, from }: { source: Source | null; playback: PlaybackState; from: string }) => {
      if (s?.kind === "screen" && currentSource?.kind !== "screen") playChime("shareStart");
      else if (!s && currentSource?.kind === "screen") playChime("shareStop");
      currentSource = s;
      setSource(s);
      push(playback, from, "resync");
    };
    const onMessage = (m: ChatMessage) => {
      if (m.from !== clientId) playChime("message");
      setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m].slice(-CHAT_HISTORY)));
      onMessageRef.current?.(m);
    };
    const onStatus = ({ id, status: s }: { id: string; status: MemberStatus }) =>
      setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status: s } : m)));
    const onReaction = (r: { id: string; from: string; emoji: Reaction }) => onReactionRef.current?.(r);
    const onDisconnect = () => {
      dropped = true;
      playChime("disconnect");
      setStatus("disconnected");
    };
    // Leaving the page: say goodbye so the server frees our seat at once instead of holding it
    // for a reconnect that is not coming. If the page comes back from the back/forward cache, rejoin.
    const onPageHide = () => {
      pageHiding = true;
      rememberRoom(roomId);
      sendGoodbye(true);
      socket.io.reconnection(false);
      socket.io.engine?.close();
    };
    const onPageShow = () => {
      pageHiding = false;
      socket.io.reconnection(true);
      socket.connect();
    };

    socket.on("member:joined", onJoined);
    socket.on("member:left", onLeft);
    socket.on("member:replaced", onReplaced);
    socket.on("sync:state", onSync);
    socket.on("source:changed", onSource);
    socket.on("chat:message", onMessage);
    socket.on("member:status", onStatus);
    socket.on("reaction", onReaction);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", join);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    if (socket.connected) join();
    else socket.connect();

    return () => {
      active = false;
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      socket.off("member:joined", onJoined);
      socket.off("member:left", onLeft);
      socket.off("member:replaced", onReplaced);
      socket.off("sync:state", onSync);
      socket.off("source:changed", onSource);
      socket.off("chat:message", onMessage);
      socket.off("member:status", onStatus);
      socket.off("reaction", onReaction);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", join);
      socket.disconnect();
      socket.io.reconnection(true);
      if (!pageHiding) finishSession(roomId);
      socketRef.current = null;
    };
  }, [roomId, name]);

  const emitSync = useCallback((playing: boolean, time: number, reason: SyncReason) => {
    socketRef.current?.emit("sync:update", { playing, time, reason });
  }, []);

  const changeSource = useCallback((s: Source | null) => {
    socketRef.current?.emit("source:set", s);
  }, []);

  const sendMessage = useCallback((text: string) => {
    const clean = text.trim();
    if (clean) socketRef.current?.emit("chat:send", { text: clean });
  }, []);

  const sendReaction = useCallback((emoji: Reaction) => {
    socketRef.current?.emit("reaction:send", { emoji });
  }, []);

  const setMemberStatus = useCallback((s: MemberStatus) => {
    socketRef.current?.emit("member:status", s);
  }, []);

  return {
    status,
    selfId,
    hostId,
    members,
    source,
    remote,
    messages,
    sendMessage,
    sendReaction,
    setMemberStatus,
    serverNow,
    emitSync,
    changeSource,
    socketRef,
  };
}
