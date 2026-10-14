"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playChime } from "@/lib/chime";
import { activateSession, finishSession, rememberRoom } from "@/lib/last-room";
import { clientId, formerTabId, tabId, getSocket, sendGoodbye, type AppSocket } from "@/lib/socket";
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
  /** Another tab of this browser opened the same room and took our place. */
  const [takenOver, setTakenOver] = useState(false);
  const socketRef = useRef<AppSocket | null>(null);
  /**
   * Whether the server has us in the room right now. Socket.IO sends anything emitted while
   * disconnected before our rejoin, and the server drops events from a socket that has not joined,
   * so what the user does in that gap is held here and sent once we are back in.
   */
  const joinedRef = useRef(false);
  const heldChat = useRef<string[]>([]);
  const heldStatus = useRef<{ value: MemberStatus } | null>(null);
  const heldSource = useRef<{ value: Source | null } | null>(null);
  const reclaimRef = useRef<() => void>(() => {});
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
    let handedOff = false;
    // One seat per person: the newest tab in a room takes over, so nobody is in the call twice.
    // Two tabs under different names are two people (testing on one computer), so they both stay.
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(`tandem:room:${roomId}`);
    const who = name.trim().toLowerCase();
    const claim = () => channel?.postMessage({ type: "claim", clientId, who });
    if (channel) {
      channel.onmessage = (e: MessageEvent<{ type?: string; clientId?: string; who?: string }>) => {
        if (e.data?.type !== "claim" || e.data.clientId === clientId || e.data.who !== who || handedOff) return;
        handedOff = true;
        setTakenOver(true);
        // Leaving for real frees the seat at once, and an empty list ends our calls.
        socket.io.reconnection(false);
        socket.disconnect();
        setMembers([]);
      };
    }
    reclaimRef.current = () => {
      if (!handedOff) return;
      handedOff = false;
      setTakenOver(false);
      socket.io.reconnection(true);
      socket.connect();
    };

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
      claim();
      socket.emit("room:join", { roomId, name, clientId, tabId, formerTabId }, (ack) => {
        if (!active || handedOff) return;
        activateSession(roomId, name);
        if (dropped) playChime("reconnect");
        dropped = false;
        offsetRef.current = ack.serverNow - Date.now();
        joinedRef.current = true;
        // Now that we are in, send what was held while away: chat in order, and the latest status.
        for (const text of heldChat.current.splice(0)) socket.emit("chat:send", { text });
        if (heldStatus.current) socket.emit("member:status", heldStatus.current.value);
        if (heldSource.current) socket.emit("source:set", heldSource.current.value);
        heldStatus.current = null;
        heldSource.current = null;
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
      joinedRef.current = false;
      if (handedOff) {
        setStatus("disconnected");
        return;
      }
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
    // The browser knows about a lost network long before any heartbeat does. Going offline, drop the
    // connection now so the page says so. Coming back, a connection that still looks open is almost
    // certainly dead after a network change, so start a fresh one rather than wait to find out.
    const onOffline = () => {
      if (!handedOff && socket.connected) socket.io.engine?.close();
    };
    const onOnline = () => {
      if (handedOff) return;
      if (socket.connected) socket.io.engine?.close();
      else socket.connect();
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
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    if (socket.connected) join();
    else socket.connect();

    return () => {
      active = false;
      joinedRef.current = false;
      heldChat.current = [];
      heldStatus.current = null;
      heldSource.current = null;
      channel?.close();
      reclaimRef.current = () => {};
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
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

  // Play, pause and seek while away are dropped: on rejoin the room's state is applied to our player,
  // and replaying a stale pause after that would put us out of step with everyone.
  const emitSync = useCallback((playing: boolean, time: number, reason: SyncReason) => {
    if (joinedRef.current) socketRef.current?.emit("sync:update", { playing, time, reason });
  }, []);

  const changeSource = useCallback((s: Source | null) => {
    if (joinedRef.current) socketRef.current?.emit("source:set", s);
    else heldSource.current = { value: s };
  }, []);

  const sendMessage = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
    socketRef.current?.emit("chat:send", { text: clean });
  }, []);

  // A reaction is only worth anything right now, so one sent while away is dropped.
  const sendReaction = useCallback((emoji: Reaction) => {
    if (joinedRef.current) socketRef.current?.emit("reaction:send", { emoji });
  }, []);

  const setMemberStatus = useCallback((s: MemberStatus) => {
    if (joinedRef.current) socketRef.current?.emit("member:status", s);
    else heldStatus.current = { value: s };
  }, []);

  /** Take the room back from the other tab. */
  const useHere = useCallback(() => reclaimRef.current(), []);

  return {
    status,
    takenOver,
    useHere,
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
