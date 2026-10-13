"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { AppSocket } from "@/lib/socket";
import type { Member, SignalData } from "@/lib/types";

export interface Peer {
  id: string;
  stream: MediaStream;
}

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turn = process.env.NEXT_PUBLIC_TURN_URL;
  if (turn) {
    servers.push({
      urls: turn,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

interface Options {
  socketRef: RefObject<AppSocket | null>;
  selfId: string | null;
  members: Member[];
  localStream: MediaStream | null;
}

/**
 * Mesh WebRTC between everyone in the room.
 * Rule: the newcomer sends the offer to each existing member, so there are never glare collisions.
 */
export function useWebRTC({ socketRef, selfId, members, localStream }: Options) {
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const pcs = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIce = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const offeredTo = useRef<Set<string>>(new Set());
  const localRef = useRef(localStream);
  useEffect(() => {
    localRef.current = localStream;
  }, [localStream]);

  const [micOn, setMicOn] = useState(() => localStream?.getAudioTracks()[0]?.enabled ?? true);
  const [camOn, setCamOn] = useState(() => localStream?.getVideoTracks()[0]?.enabled ?? true);

  const send = useCallback(
    (to: string, data: SignalData) => socketRef.current?.emit("rtc:signal", { to, data }),
    [socketRef],
  );

  const closePeer = useCallback((id: string) => {
    pcs.current.get(id)?.close();
    pcs.current.delete(id);
    pendingIce.current.delete(id);
    offeredTo.current.delete(id);
    setPeers((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const createPc = useCallback(
    (id: string) => {
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      pcs.current.set(id, pc);

      pc.onicecandidate = (e) => {
        if (e.candidate) send(id, { type: "candidate", candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        setPeers((prev) => ({ ...prev, [id]: { id, stream } }));
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          pc.restartIce();
        }
      };
      return pc;
    },
    [send],
  );

  /** Attach local tracks, or a receive-only transceiver when we have no track of that kind. */
  const attachLocal = useCallback((pc: RTCPeerConnection) => {
    const stream = localRef.current;
    for (const kind of ["audio", "video"] as const) {
      const track = stream?.getTracks().find((t) => t.kind === kind);
      if (track && stream) pc.addTrack(track, stream);
      else pc.addTransceiver(kind, { direction: "recvonly" });
    }
  }, []);

  const flushIce = useCallback(async (id: string, pc: RTCPeerConnection) => {
    const queued = pendingIce.current.get(id) ?? [];
    pendingIce.current.delete(id);
    for (const c of queued) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* stale candidate */
      }
    }
  }, []);

  // Offer to members that were already in the room when we joined.
  useEffect(() => {
    if (!selfId) return;
    for (const m of members) {
      if (m.id === selfId || pcs.current.has(m.id) || offeredTo.current.has(m.id)) continue;
      offeredTo.current.add(m.id);
      const pc = createPc(m.id);
      attachLocal(pc);
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send(m.id, { type: "offer", sdp: offer });
      })().catch(() => closePeer(m.id));
    }
    // Members who left: tear down.
    for (const id of Array.from(pcs.current.keys())) {
      if (!members.some((m) => m.id === id)) closePeer(id);
    }
    // Only react to membership changes; `members` identity changes whenever the roster does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, selfId]);

  // Once someone joins after us they will offer to us; we answer here.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const onSignal = async ({ from, data }: { from: string; data: SignalData }) => {
      let pc = pcs.current.get(from);
      if (data.type === "offer") {
        // Ignore stale offers from the same peer by rebuilding the connection.
        if (pc) closePeer(from);
        pc = createPc(from);
        await pc.setRemoteDescription(data.sdp);
        attachLocal(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send(from, { type: "answer", sdp: answer });
        await flushIce(from, pc);
      } else if (data.type === "answer") {
        if (!pc) return;
        await pc.setRemoteDescription(data.sdp);
        await flushIce(from, pc);
      } else if (data.type === "candidate") {
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(data.candidate);
          } catch {
            /* ignore */
          }
        } else {
          const q = pendingIce.current.get(from) ?? [];
          q.push(data.candidate);
          pendingIce.current.set(from, q);
        }
      }
    };
    socket.on("rtc:signal", onSignal);
    return () => {
      socket.off("rtc:signal", onSignal);
    };
    // The socket is created in useRoom; re-subscribe once we know we are joined.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfId]);

  // Tear everything down on unmount.
  useEffect(() => {
    const map = pcs.current;
    return () => {
      for (const pc of map.values()) pc.close();
      map.clear();
    };
  }, []);

  const toggleMic = useCallback(() => {
    const tracks = localRef.current?.getAudioTracks() ?? [];
    const next = !micOn;
    tracks.forEach((t) => (t.enabled = next));
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const tracks = localRef.current?.getVideoTracks() ?? [];
    const next = !camOn;
    tracks.forEach((t) => (t.enabled = next));
    setCamOn(next);
  }, [camOn]);

  return { peers: Object.values(peers), micOn, camOn, toggleMic, toggleCam };
}
