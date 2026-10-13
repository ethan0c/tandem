"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { AppSocket } from "@/lib/socket";
import type { Member, ScreenSignal, Source } from "@/lib/types";
import { iceServers, preferCodecs } from "./useWebRTC";

/**
 * Ceiling, not a target: the encoder uses what the link can carry. 20 Mbps covers 4K at 30 fps in
 * VP9; Chrome's own default is ~4 Mbps, which turns anything above 1080p to mush.
 */
const MAX_BITRATE = 20_000_000;
/** A viewer with no picture asks the sharer again this often, in case a request or offer was lost. */
const REQUEST_RETRY_MS = 5_000;

interface Options {
  socketRef: RefObject<AppSocket | null>;
  selfId: string | null;
  members: Member[];
  source: Source | null;
  changeSource: (s: Source | null) => void;
}

/** Sharer side: the connection to one viewer and the nonce its offer carried. */
interface Outbound {
  pc: RTCPeerConnection;
  nonce: number;
}

/**
 * One-way screen streaming, separate from the call mesh so starting or stopping a share
 * never renegotiates anyone's camera.
 * Rule: each viewer sends `request` to the sharer when it is ready, and the sharer offers back.
 * The viewer keeps asking until a picture arrives and asks again if its connection fails, so a
 * lost message or a broken link only ever costs a few seconds.
 */
export function useScreenShare({ socketRef, selfId, members, source, changeSource }: Options) {
  const [localScreen, setLocalScreen] = useState<MediaStream | null>(null);
  // Tagged with the sharer it came from, so a stale stream is never shown after the share moves on.
  const [remote, setRemote] = useState<{ from: string; stream: MediaStream } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const localRef = useRef<MediaStream | null>(null);
  const labelRef = useRef("their screen");
  const sendPcs = useRef<Map<string, Outbound>>(new Map());
  const recvPc = useRef<RTCPeerConnection | null>(null);
  /** True while a picture from the current sharer is on screen; read by the request loop. */
  const haveRemote = useRef(false);
  const nonceRef = useRef(0);
  const pendingIce = useRef<Map<RTCPeerConnection, RTCIceCandidateInit[]>>(new Map());
  const sharerId = source?.kind === "screen" ? source.sharerId : null;
  const hasSource = source !== null;
  const sharerRef = useRef(sharerId);
  useEffect(() => {
    sharerRef.current = sharerId;
  }, [sharerId]);

  const send = useCallback(
    (to: string, data: ScreenSignal) => socketRef.current?.emit("screen:signal", { to, data }),
    [socketRef],
  );

  const newPc = useCallback(
    (peerId: string, onFailed: () => void) => {
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      pc.onicecandidate = (e) => {
        if (e.candidate) send(peerId, { type: "candidate", candidate: e.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") onFailed();
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
    haveRemote.current = false;
  }, [closePc]);

  const dropViewer = useCallback(
    (peerId: string) => {
      closePc(sendPcs.current.get(peerId)?.pc);
      sendPcs.current.delete(peerId);
    },
    [closePc],
  );

  /** Tear down our own share locally (does not touch the room source). */
  const endLocal = useCallback(() => {
    for (const { pc } of sendPcs.current.values()) closePc(pc);
    sendPcs.current.clear();
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
  }, [closePc]);

  /** Sharer: stream to one viewer. */
  const offerTo = useCallback(
    async (peerId: string) => {
      const stream = localRef.current;
      if (!stream) return;
      dropViewer(peerId);
      const pc = newPc(peerId, () => {
        // The viewer asks for a new connection when theirs fails; this one is only ours to clean up.
        if (sendPcs.current.get(peerId)?.pc === pc) dropViewer(peerId);
      });
      const nonce = ++nonceRef.current;
      sendPcs.current.set(peerId, { pc, nonce });
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
      preferCodecs(pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind !== "video") continue;
        const params = sender.getParameters();
        if (!params.encodings?.length) continue;
        params.encodings[0].maxBitrate = MAX_BITRATE;
        params.encodings[0].scaleResolutionDownBy = 1;
        // Stay sharp on a tight link: shed frames rather than resolution.
        params.degradationPreference = "maintain-resolution";
        await sender.setParameters(params).catch(() => {});
      }
      send(peerId, { type: "offer", sdp: offer, nonce });
    },
    [dropViewer, newPc, send],
  );

  // Signalling.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selfId) return;
    const onSignal = async ({ from, data }: { from: string; data: ScreenSignal }) => {
      if (data.type === "request") {
        await offerTo(from).catch(() => dropViewer(from));
      } else if (data.type === "offer") {
        if (from !== sharerRef.current) return;
        closeViewer();
        const pc = newPc(from, () => {
          // The link to the sharer is gone: drop the picture and ask for a fresh connection.
          if (recvPc.current !== pc) return;
          closeViewer();
          setRemote((r) => (r?.from === from ? null : r));
          if (sharerRef.current === from) send(from, { type: "request" });
        });
        recvPc.current = pc;
        pc.ontrack = (e) => {
          haveRemote.current = true;
          setRemote({ from, stream: e.streams[0] ?? new MediaStream([e.track]) });
        };
        await pc.setRemoteDescription(data.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send(from, { type: "answer", sdp: answer, nonce: data.nonce });
        await flushIce(pc);
      } else if (data.type === "answer") {
        const out = sendPcs.current.get(from);
        // An answer to an offer we have since replaced must not be applied to the new connection.
        if (!out || out.nonce !== data.nonce) return;
        await out.pc.setRemoteDescription(data.sdp);
        await flushIce(out.pc);
      } else if (data.type === "candidate") {
        const pc = from === sharerRef.current && from !== selfId ? recvPc.current : sendPcs.current.get(from)?.pc;
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
  }, [socketRef, selfId, offerTo, newPc, closeViewer, dropViewer, flushIce, send]);

  // React to the room source. A share of ours that was replaced ends. A share we still hold but the
  // room has forgotten (the server restarted, or we were away longer than its grace) is announced
  // again, so nobody has to pick it a second time. Someone else's share is watched: drop whatever
  // we had and ask the sharer for a picture until one arrives.
  useEffect(() => {
    if (!selfId) return;
    const local = localRef.current;
    if (local && sharerId !== selfId) {
      const live = local.getVideoTracks().some((t) => t.readyState === "live");
      if (live && !hasSource) changeSource({ kind: "screen", sharerId: selfId, label: labelRef.current });
      else endLocal();
    }
    closeViewer();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the old picture must go with its connection
    setRemote(null);
    if (!sharerId || sharerId === selfId) return;
    const ask = () => {
      if (!haveRemote.current) send(sharerId, { type: "request" });
    };
    ask();
    const retry = setInterval(ask, REQUEST_RETRY_MS);
    return () => clearInterval(retry);
  }, [sharerId, hasSource, selfId, endLocal, closeViewer, changeSource, send]);

  // Viewers who left: drop their connection.
  useEffect(() => {
    for (const id of Array.from(sendPcs.current.keys())) {
      if (!members.some((m) => m.id === id)) dropViewer(id);
    }
  }, [members, dropViewer]);

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
    // Chrome captures a shared tab at exactly the requested size (its tab capture uses a fixed
    // resolution; the default is 1080p), and `min` constraints are not allowed. So ask for the
    // largest a tab on this display can be, up to 4K: a maximised tab is captured 1:1 and nothing
    // is ever downscaled. Windows and whole screens are captured at native size up to this.
    const dpr = window.devicePixelRatio || 1;
    const capW = Math.min(Math.round(window.screen.width * dpr), 3840);
    const capH = Math.min(Math.round(window.screen.height * dpr), 2160);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 }, width: { ideal: capW }, height: { ideal: capH } },
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
      // "detail" keeps the encoder from downscaling under load; "motion" would trade sharpness for fps.
      video.contentHint = "detail";
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
    labelRef.current = label;
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
