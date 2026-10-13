"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket, type AppSocket } from "@/lib/socket";
import type { Member, PlaybackState, Source, SyncReason } from "@/lib/types";

export type RoomStatus = "connecting" | "joined" | "disconnected";

/** Playback state plus who last changed it, so the player can ignore its own echoes. */
export interface RemotePlayback {
  playback: PlaybackState;
  from: string;
  reason: SyncReason;
  /** Monotonic counter so identical states still trigger an effect. */
  seq: number;
}

export function useRoom(roomId: string, name: string | null) {
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [selfId, setSelfId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [source, setSource] = useState<Source | null>(null);
  const [remote, setRemote] = useState<RemotePlayback | null>(null);
  const socketRef = useRef<AppSocket | null>(null);
  const offsetRef = useRef(0);
  const seqRef = useRef(0);

  /** Server clock estimate: local clock + measured offset. */
  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  useEffect(() => {
    if (!name) return;
    const socket = getSocket();
    socketRef.current = socket;

    const push = (playback: PlaybackState, from: string, reason: SyncReason) =>
      setRemote({ playback, from, reason, seq: ++seqRef.current });

    const measureClock = () =>
      new Promise<void>((resolve) => {
        let best = Infinity;
        let bestOffset = offsetRef.current;
        let n = 0;
        const ping = () => {
          const t0 = Date.now();
          socket.timeout(2000).emit("time:ping", (err, serverTime) => {
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

    const join = () => {
      setStatus("connecting");
      socket.emit("room:join", { roomId, name }, (ack) => {
        offsetRef.current = ack.serverNow - Date.now();
        setSelfId(ack.selfId);
        setHostId(ack.state.hostId);
        setMembers(ack.state.members);
        setSource(ack.state.source);
        push(ack.state.playback, "server", "resync");
        setStatus("joined");
        void measureClock();
      });
    };

    const onJoined = (m: Member) => setMembers((prev) => [...prev.filter((p) => p.id !== m.id), m]);
    const onLeft = ({ id, hostId: h }: { id: string; hostId: string | null }) => {
      setMembers((prev) => prev.filter((p) => p.id !== id));
      setHostId(h);
    };
    const onSync = ({ playback, from, reason }: { playback: PlaybackState; from: string; reason: SyncReason }) =>
      push(playback, from, reason);
    const onSource = ({ source: s, playback, from }: { source: Source | null; playback: PlaybackState; from: string }) => {
      setSource(s);
      push(playback, from, "resync");
    };
    const onDisconnect = () => setStatus("disconnected");

    socket.on("member:joined", onJoined);
    socket.on("member:left", onLeft);
    socket.on("sync:state", onSync);
    socket.on("source:changed", onSource);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", join);
    if (socket.connected) join();
    else socket.connect();

    return () => {
      socket.off("member:joined", onJoined);
      socket.off("member:left", onLeft);
      socket.off("sync:state", onSync);
      socket.off("source:changed", onSource);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", join);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, name]);

  const emitSync = useCallback((playing: boolean, time: number, reason: SyncReason) => {
    socketRef.current?.emit("sync:update", { playing, time, reason });
  }, []);

  const changeSource = useCallback((s: Source | null) => {
    socketRef.current?.emit("source:set", s);
  }, []);

  return {
    status,
    selfId,
    hostId,
    members,
    source,
    remote,
    serverNow,
    emitSync,
    changeSource,
    socketRef,
  };
}
