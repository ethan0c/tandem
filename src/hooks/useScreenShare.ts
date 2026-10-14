"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { AppSocket } from "@/lib/socket";
import type { Member, ScreenSignal, Source } from "@/lib/types";
import { ShareAdaptation, setShareQuality } from "@/lib/connection-quality";
import { iceServers, preferCodecs, REJOIN_SETTLE_MS, STALL_MS } from "./useWebRTC";

/** A viewer with no picture asks the sharer again this often, in case a request or offer was lost. */
const REQUEST_RETRY_MS = 5_000;

interface Options {
  socketRef: RefObject<AppSocket | null>;
  selfId: string | null;
  members: Member[];
  source: Source | null;
  changeSource: (s: Source | null) => void;
}

/** Sharer side: the connection to one viewer, the nonce its offer carried, and its quality step. */
interface Outbound {
  pc: RTCPeerConnection;
  nonce: number;
  adaptation: ShareAdaptation;
  tier: number;
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
      // Chrome takes about 30 s to call a lost connection "failed", which would leave a frozen picture
      // that long. A share is one-way and quick to rebuild, so a few seconds of "disconnected" will do.
      let stalled: ReturnType<typeof setTimeout> | undefined;
      pc.onconnectionstatechange = () => {
        clearTimeout(stalled);
        if (pc.connectionState === "failed") onFailed();
        else if (pc.connectionState === "disconnected") {
          stalled = setTimeout(() => {
            if (pc.connectionState === "disconnected") onFailed();
          }, STALL_MS);
        }
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
      sendPcs.current.set(peerId, { pc, nonce, adaptation: new ShareAdaptation(), tier: 0 });
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
      preferCodecs(pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      // Start at the top step; the adaptation loop steps down if the link or the CPU can't keep up.
      await setShareQuality(pc, 0);
      send(peerId, { type: "offer", sdp: offer, nonce });
    },
    [dropViewer, newPc, send],
  );

  // Each viewer's connection adapts on its own: one partner on weak Wi-Fi doesn't blur the others.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      for (const out of Array.from(sendPcs.current.values())) {
        if (cancelled) return;
        if (out.pc.connectionState !== "connected") continue;
        try {
          const tier = out.adaptation.sample(await out.pc.getStats());
          if (cancelled) return;
          if (tier !== out.tier) {
            out.tier = tier;
            await setShareQuality(out.pc, tier);
          }
        } catch {
          // A connection closing mid-poll is dropped elsewhere.
        }
      }
      if (!cancelled) timer = setTimeout(poll, 2000);
    }
    timer = setTimeout(poll, 2000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

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
    // Back on the signalling server: a picture that is not connected may have lost its signals while
    // we were away, so ask the sharer for a fresh one. After a network change ask anyway, since a
    // picture that still looks fine is usually dead. Signals only go through once we have rejoined.
    let networkChanged = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onConnect = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const sharer = sharerRef.current;
        if (sharer && sharer !== selfId && (networkChanged || recvPc.current?.connectionState !== "connected")) {
          send(sharer, { type: "request" });
        }
        networkChanged = false;
      }, REJOIN_SETTLE_MS);
    };
    const onOnline = () => {
      networkChanged = true;
    };
    socket.on("connect", onConnect);
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(timer);
      socket.off("screen:signal", handler);
      socket.off("connect", onConnect);
      window.removeEventListener("online", onOnline);
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
      if ((e as DOMException)?.name !== "NotAllowedError") setError("Could not share your screen. Try Chrome or Edge on a computer.");
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
      setError("Your partner cannot hear the show. Share a browser tab and turn on “Share tab audio” to include sound.");
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
