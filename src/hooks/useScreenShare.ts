"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { AppSocket } from "@/lib/socket";
import type { Member, ScreenSignal, Source } from "@/lib/types";
import { iceServers } from "./useWebRTC";

/** Enough for 1080p film with motion; the browser still scales down on weak links. */
const MAX_BITRATE = 6_000_000;

interface Options {
  socketRef: RefObject<AppSocket | null>;
  selfId: string | null;
  members: Member[];
  source: Source | null;
  changeSource: (s: Source | null) => void;
}

/**
 * One-way screen streaming, separate from the call mesh so starting or stopping a share
 * never renegotiates anyone's camera.
 * Rule: each viewer sends `request` to the sharer when it is ready, and the sharer offers back.
 */
export function useScreenShare({ socketRef, selfId, members, source, changeSource }: Options) {
  const [localScreen, setLocalScreen] = useState<MediaStream | null>(null);
  // Tagged with the sharer it came from, so a stale stream is never shown after the share moves on.
  const [remote, setRemote] = useState<{ from: string; stream: MediaStream } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const localRef = useRef<MediaStream | null>(null);
  const sendPcs = useRef<Map<string, RTCPeerConnection>>(new Map());
  const recvPc = useRef<RTCPeerConnection | null>(null);
  const pendingIce = useRef<Map<RTCPeerConnection, RTCIceCandidateInit[]>>(new Map());
  const sharerId = source?.kind === "screen" ? source.sharerId : null;
  const sharerRef = useRef(sharerId);
  useEffect(() => {
    sharerRef.current = sharerId;
  }, [sharerId]);

  const send = useCallback(
    (to: string, data: ScreenSignal) => socketRef.current?.emit("screen:signal", { to, data }),
    [socketRef],
  );

  const newPc = useCallback(
    (peerId: string) => {
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      pc.onicecandidate = (e) => {
        if (e.candidate) send(peerId, { type: "candidate", candidate: e.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") pc.restartIce();
      };
      return pc;
    },
    [send],
  );

  const closePc = useCallback((pc: RTCPeerConnection | null | undefined) => {
    if (!pc) return;
    pc.close();
    pendingIce.current.delete(pc);
  }, []);

  const flushIce = useCallback(async (pc: RTCPeerConnection) => {
    const queued = pendingIce.current.get(pc) ?? [];
    pendingIce.current.delete(pc);
    for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
  }, []);

  const closeViewer = useCallback(() => {
    closePc(recvPc.current);
    recvPc.current = null;
  }, [closePc]);

  /** Tear down our own share locally (does not touch the room source). */
  const endLocal = useCallback(() => {
    for (const pc of sendPcs.current.values()) closePc(pc);
    sendPcs.current.clear();
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
  }, [closePc]);

  /** Sharer: stream to one viewer. */
  const offerTo = useCallback(
    async (peerId: string) => {
      const stream = localRef.current;
      if (!stream) return;
      closePc(sendPcs.current.get(peerId));
      const pc = newPc(peerId);
      sendPcs.current.set(peerId, pc);
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind !== "video") continue;
        const params = sender.getParameters();
        if (!params.encodings?.length) continue;
        params.encodings[0].maxBitrate = MAX_BITRATE;
        params.degradationPreference = "maintain-framerate";
        await sender.setParameters(params).catch(() => {});
      }
      send(peerId, { type: "offer", sdp: offer });
    },
    [closePc, newPc, send],
  );

  // Signalling.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selfId) return;
    const onSignal = async ({ from, data }: { from: string; data: ScreenSignal }) => {
      if (data.type === "request") {
        await offerTo(from).catch(() => closePc(sendPcs.current.get(from)));
      } else if (data.type === "offer") {
        if (from !== sharerRef.current) return;
        closePc(recvPc.current);
        const pc = newPc(from);
        recvPc.current = pc;
        pc.ontrack = (e) => setRemote({ from, stream: e.streams[0] ?? new MediaStream([e.track]) });
        await pc.setRemoteDescription(data.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send(from, { type: "answer", sdp: answer });
        await flushIce(pc);
      } else if (data.type === "answer") {
        const pc = sendPcs.current.get(from);
        if (!pc) return;
        await pc.setRemoteDescription(data.sdp);
        await flushIce(pc);
      } else if (data.type === "candidate") {
        const pc = from === sharerRef.current && from !== selfId ? recvPc.current : sendPcs.current.get(from);
        if (!pc) return;
        if (pc.remoteDescription) {
          await pc.addIceCandidate(data.candidate).catch(() => {});
        } else {
          const q = pendingIce.current.get(pc) ?? [];
          q.push(data.candidate);
          pendingIce.current.set(pc, q);
        }
      }
    };
    const handler = (payload: { from: string; data: ScreenSignal }) => {
      onSignal(payload).catch(() => {});
    };
    socket.on("screen:signal", handler);
    return () => {
      socket.off("screen:signal", handler);
    };
  }, [socketRef, selfId, offerTo, newPc, closePc, flushIce, send]);

  // React to the room source: stop our share if it was replaced, and (re)join someone else's.
  useEffect(() => {
    if (!selfId) return;
    if (localRef.current && sharerId !== selfId) endLocal();
    closeViewer();
    if (sharerId && sharerId !== selfId) send(sharerId, { type: "request" });
  }, [sharerId, selfId, endLocal, closeViewer, send]);

  // Viewers who left: drop their connection.
  useEffect(() => {
    for (const [id, pc] of sendPcs.current) {
      if (!members.some((m) => m.id === id)) {
        closePc(pc);
        sendPcs.current.delete(id);
      }
    }
  }, [members, closePc]);

  // Leaving the room ends everything.
  useEffect(() => {
    return () => {
      endLocal();
      closeViewer();
    };
  }, [endLocal, closeViewer]);

  /** Must be called from a click: browsers only open the picker on a user gesture. */
  const start = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        // Chrome-only hints: offer tabs first, hide the Tandem tab (no hall of mirrors), allow tab audio.
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        systemAudio: "include",
      } as DisplayMediaStreamOptions);
    } catch (e) {
      if ((e as DOMException)?.name !== "NotAllowedError") setError("Screen sharing is not available in this browser.");
      return false;
    }
    const video = stream.getVideoTracks()[0];
    if (video) {
      video.contentHint = "motion";
      video.addEventListener("ended", () => {
        // The browser's own "Stop sharing" button.
        if (localRef.current === stream) changeSource(null);
      });
    }
    // Already sharing and picked something new: viewers keep the same sharer, so re-offer to them.
    const viewers = Array.from(sendPcs.current.keys());
    endLocal();
    localRef.current = stream;
    setLocalScreen(stream);
    for (const id of viewers) offerTo(id).catch(() => {});
    if (!stream.getAudioTracks().length) {
      setError("No audio is being shared. To include sound, pick a browser tab and tick “Share tab audio”.");
    }
    // The server stamps our real id as sharerId.
    const surface = (video?.getSettings() as { displaySurface?: string } | undefined)?.displaySurface;
    const label = surface === "browser" ? "a browser tab" : surface === "window" ? "a window" : "their screen";
    changeSource({ kind: "screen", sharerId: selfId ?? "", label });
    return true;
  }, [changeSource, endLocal, offerTo, selfId]);

  const stop = useCallback(() => {
    endLocal();
    changeSource(null);
  }, [endLocal, changeSource]);

  const isSharer = !!sharerId && sharerId === selfId;
  return {
    localScreen: isSharer ? localScreen : null,
    remoteScreen: remote && remote.from === sharerId && !isSharer ? remote.stream : null,
    isSharer, start, stop, error, clearError: () => setError(null) };
}
