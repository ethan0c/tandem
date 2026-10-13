"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { AppSocket } from "@/lib/socket";
import type { Member, SignalData } from "@/lib/types";
import { ConnectionQuality, setCameraQuality } from "@/lib/connection-quality";

export interface Peer {
  id: string;
  stream: MediaStream;
}

export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turn = process.env.NEXT_PUBLIC_TURN_URL;
  if (turn) {
    servers.push({
      urls: turn.split(",").map((u) => u.trim()),
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

/**
 * H.264 first: it is hardware-encoded on nearly every machine (VideoToolbox, NVENC, QuickSync),
 * which is what keeps a 4K share smooth. VP9 is the best software fallback; VP8 last, it blurs
 * high-resolution content.
 */
const CODEC_ORDER = ["video/H264", "video/VP9", "video/AV1", "video/VP8"];

/** Put our preferred video codecs first in the offer so the answer picks one of them. */
export function preferCodecs(pc: RTCPeerConnection) {
  const caps = RTCRtpSender.getCapabilities?.("video");
  if (!caps) return;
  const rank = (mime: string) => {
    const i = CODEC_ORDER.indexOf(mime);
    return i === -1 ? CODEC_ORDER.length : i;
  };
  const ranked = [...caps.codecs].sort((a, b) => rank(a.mimeType) - rank(b.mimeType));
  for (const t of pc.getTransceivers()) {
    if (t.sender.track?.kind === "video") t.setCodecPreferences?.(ranked);
  }
}

interface Options {
  socketRef: RefObject<AppSocket | null>;
  selfId: string | null;
  members: Member[];
  localStream: MediaStream | null;
}

/**
 * Mesh WebRTC between everyone in the room.
 * Rule: for each pair, only the member with the greater socket id sends the offer. Both sides can
 * compute that without talking, so there is never a glare collision no matter how join events race.
 */
export function useWebRTC({ socketRef, selfId, members, localStream }: Options) {
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  // Bumped when a negotiation fails so the offer effect runs again.
  const [attempt, setAttempt] = useState(0);
  const pcs = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIce = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  /** Peers we are the offerer for. */
  const offeredTo = useRef<Set<string>>(new Set());
  const localRef = useRef(localStream);
  useEffect(() => {
    localRef.current = localStream;
  }, [localStream]);

  const [micOn, setMicOn] = useState(() => localStream?.getAudioTracks()[0]?.enabled ?? true);
  const [camOn, setCamOn] = useState(() => localStream?.getVideoTracks()[0]?.enabled ?? true);
  const [poorConnection, setPoorConnection] = useState(false);

  useEffect(() => {
    const monitors = new Map<RTCPeerConnection, { quality: ConnectionQuality; applied: boolean | null }>();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      let poor = false;
      const current = new Set(pcs.current.values());
      for (const pc of monitors.keys()) if (!current.has(pc)) monitors.delete(pc);
      for (const pc of current) {
        if (cancelled) return;
        if (pc.connectionState === "closed" || pc.connectionState === "new" || pc.connectionState === "connecting") continue;
        const monitor = monitors.get(pc) ?? { quality: new ConnectionQuality(), applied: null };
        monitors.set(pc, monitor);
        try {
          const stats = await pc.getStats();
          if (cancelled) return;
          if (!Array.from(pcs.current.values()).includes(pc)) continue;
          const struggling = monitor.quality.sample(stats, pc.connectionState);
          poor ||= struggling;
          if (monitor.applied !== monitor.quality.limited) {
            await setCameraQuality(pc, monitor.quality.limited);
            monitor.applied = monitor.quality.limited;
          }
        } catch {
          poor ||= monitor.quality.poor;
        }
      }
      if (!cancelled) {
        setPoorConnection(poor);
        timer = setTimeout(poll, 2000);
      }
    }
    timer = setTimeout(poll, 2000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const send = useCallback(
    (to: string, data: SignalData) => socketRef.current?.emit("rtc:signal", { to, data }),
    [socketRef],
  );

  const closePeer = useCallback((id: string) => {
    const pc = pcs.current.get(id);
    if (pc) {
      pc.ontrack = pc.onicecandidate = pc.onconnectionstatechange = null;
      pc.close();
    }
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

  /** Offerer side: send a (re)offer. On failure, drop the connection and let the offer effect retry. */
  const negotiate = useCallback(
    async (id: string, pc: RTCPeerConnection, iceRestart = false) => {
      try {
        if (!iceRestart) preferCodecs(pc);
        const offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
        await pc.setLocalDescription(offer);
        send(id, { type: "offer", sdp: offer });
      } catch {
        if (pcs.current.get(id) !== pc) return;
        closePeer(id);
        setAttempt((n) => n + 1);
      }
    },
    [send, closePeer],
  );

  const createPc = useCallback(
    (id: string) => {
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      pcs.current.set(id, pc);

      pc.onicecandidate = (e) => {
        if (e.candidate) send(id, { type: "candidate", candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => {
        if (pcs.current.get(id) !== pc) return;
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        setPeers((prev) => ({ ...prev, [id]: { id, stream } }));
      };
      pc.onconnectionstatechange = () => {
        // Only the offerer restarts; the other side answers the new offer like any other.
        if (pc.connectionState === "failed" && offeredTo.current.has(id)) void negotiate(id, pc, true);
      };
      return pc;
    },
    [send, negotiate],
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

  // Offer to the members we are responsible for; tear down anyone who left.
  useEffect(() => {
    if (!selfId) return;
    for (const m of members) {
      if (m.id === selfId || pcs.current.has(m.id)) continue;
      // The greater id offers, so when ours is smaller we wait for theirs.
      if (selfId < m.id) continue;
      offeredTo.current.add(m.id);
      const pc = createPc(m.id);
      attachLocal(pc);
      void negotiate(m.id, pc);
    }
    for (const id of Array.from(pcs.current.keys())) {
      if (!members.some((m) => m.id === id)) closePeer(id);
    }
    // Only react to membership changes (and failed attempts); the callbacks are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, selfId, attempt]);

  // Answerer side, plus answers and candidates for connections we initiated.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selfId) return;
    const onSignal = async ({ from, data }: { from: string; data: SignalData }) => {
      let pc = pcs.current.get(from);
      if (data.type === "offer") {
        // An offer on a settled connection is a renegotiation (ICE restart); anything else is rebuilt.
        if (pc && pc.signalingState !== "stable") {
          closePeer(from);
          pc = undefined;
        }
        if (pc) {
          await pc.setRemoteDescription(data.sdp);
        } else {
          pc = createPc(from);
          await pc.setRemoteDescription(data.sdp);
          attachLocal(pc);
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send(from, { type: "answer", sdp: answer });
        await flushIce(from, pc);
      } else if (data.type === "answer") {
        if (!pc || pc.signalingState !== "have-local-offer") return;
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
    const handler = (payload: { from: string; data: SignalData }) => {
      onSignal(payload).catch(() => {
        // A broken negotiation is dropped; if we are the offerer the offer effect retries.
        closePeer(payload.from);
        setAttempt((n) => n + 1);
      });
    };
    socket.on("rtc:signal", handler);
    return () => {
      socket.off("rtc:signal", handler);
    };
  }, [socketRef, selfId, createPc, attachLocal, flushIce, send, closePeer]);

  // Tear everything down on unmount.
  useEffect(() => {
    const map = pcs.current;
    const ice = pendingIce.current;
    const offered = offeredTo.current;
    return () => {
      for (const pc of map.values()) {
        pc.ontrack = pc.onicecandidate = pc.onconnectionstatechange = null;
        pc.close();
      }
      map.clear();
      ice.clear();
      offered.clear();
      setPeers({});
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

  const turnCameraOff = useCallback(() => {
    localRef.current?.getVideoTracks().forEach((track) => { track.enabled = false; });
    setCamOn(false);
  }, []);

  return { peers: Object.values(peers), micOn, camOn, toggleMic, toggleCam, poorConnection, turnCameraOff };
}
