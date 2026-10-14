"use client";

import { IconButton as ControlButton } from "@/components/Button";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Coffee, Copy, LogOut, Mic, MicOff, Smartphone, Video, VideoOff } from "lucide-react";
import { CallVolumeControl } from "@/components/CallVolumeControl";
import { ConnectionNotice } from "@/components/ConnectionNotice";
import { ChimeToggle } from "@/components/ChimeToggle";
import { Participants } from "@/components/Participants";
import { FloatingReactions, ReactionBar, partnerNotice, useFloatingReactions } from "@/components/Reactions";
import { TakenOver } from "@/components/TakenOver";
import { LogoMark } from "@/components/Logo";
import { StreamVideo } from "@/components/room/StreamVideo";
import { Connecting, PeerVideo } from "@/components/Connecting";
import { useReleaseStream } from "@/hooks/useReleaseStream";
import { useRoom } from "@/hooks/useRoom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useCallOutputVolume } from "@/lib/call-volume";
import type { SyncReason } from "@/lib/types";

interface Props {
  roomId: string;
  name: string;
  localStream: MediaStream | null;
  embedded: boolean;
  /** "panel" is the extension's floating window; "phone" fills a phone screen for a call-only guest. */
  layout?: "panel" | "phone";
}

/** Where the extension asked us to pick up from (`?t=` seconds), when resuming a show. */
function readResume(): number | null {
  if (typeof window === "undefined") return null;
  const t = Number(new URLSearchParams(window.location.search).get("t"));
  return Number.isFinite(t) && t > 0 ? t : null;
}

/** Posts to the extension content script that embeds this page. */
function post(msg: Record<string, unknown>) {
  if (window.parent !== window) window.parent.postMessage(msg, "*");
}

export function OverlaySession({ roomId, name, localStream, embedded, layout = "panel" }: Props) {
  const floating = useFloatingReactions();
  // Reactions arrive with a member id; this turns it into "You" or their name (members as of now).
  const nameRef = useRef<(id: string) => string>(() => "");
  const reactionFrom = (id: string) => nameRef.current(id);
  const room = useRoom(roomId, name, {
    onReaction: (r) => {
      const from = reactionFrom(r.from);
      // The extension floats reactions over the video itself; elsewhere they float over the call.
      if (embedded) post({ type: "tandem:reaction", emoji: r.emoji, from });
      else floating.add(r.id, r.emoji, from);
    },
  });
  const rtc = useWebRTC({ socketRef: room.socketRef, selfId: room.selfId, members: room.members, localStream });
  const [hasVideo, setHasVideo] = useState<boolean | null>(null);
  const [drift, setDrift] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState<{ url: string; title: string } | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [resumeAt] = useState(readResume);
  const resumeChecked = useRef(false);

  useReleaseStream(localStream);

  // Remote playback changes go to the page's <video>, re-stamped onto the local clock.
  const { remote, selfId, serverNow, emitSync, setMemberStatus } = room;
  useEffect(() => {
    const r = remote;
    if (!r || r.from === selfId) return;
    // Resuming a show into an empty room: start the room where we left off instead of at 0.
    const first = !resumeChecked.current;
    resumeChecked.current = true;
    if (first && resumeAt && r.from === "server" && !r.playback.playing && r.playback.time === 0) {
      emitSync(false, resumeAt, "seek");
      post({ type: "tandem:apply", state: { playing: false, time: resumeAt, localUpdatedAt: Date.now() } });
      return;
    }
    const offset = serverNow() - Date.now();
    post({
      type: "tandem:apply",
      state: { playing: r.playback.playing, time: r.playback.time, localUpdatedAt: r.playback.updatedAt - offset },
    });
  }, [remote, selfId, serverNow, emitSync, resumeAt]);

  // Local user actions arrive from the page.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent) return;
      const m = e.data as {
        type?: string;
        playing?: boolean;
        time?: number;
        reason?: string;
        hasVideo?: boolean;
        drift?: number;
        inAd?: boolean;
        url?: string;
        title?: string;
      };
      if (!m || typeof m !== "object") return;
      if (m.type === "tandem:event") {
        const reason: SyncReason = m.reason === "seek" ? "seek" : m.playing ? "play" : "pause";
        emitSync(!!m.playing, Number(m.time) || 0, reason);
      } else if (m.type === "tandem:status") {
        setHasVideo(!!m.hasVideo);
      } else if (m.type === "tandem:drift") {
        setDrift(typeof m.drift === "number" ? m.drift : null);
      } else if (m.type === "tandem:ad") {
        // Our site is showing an ad: the others hold until it is over.
        setMemberStatus(m.inAd ? "ad" : null);
      } else if (m.type === "tandem:page" && typeof m.url === "string" && /^https?:\/\//.test(m.url)) {
        setPage({ url: m.url, title: typeof m.title === "string" ? m.title : "" });
      }
    };
    window.addEventListener("message", onMessage);
    post({ type: "tandem:ready" });
    return () => window.removeEventListener("message", onMessage);
  }, [emitSync, setMemberStatus]);

  // The invite opens a page that gets the guest set up, then sends them to this same episode.
  const copyInvite = useCallback(async () => {
    const params = new URLSearchParams({ from: name });
    if (page) params.set("to", page.url);
    if (page?.title) params.set("what", page.title);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}?${params}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }, [roomId, name, page]);

  const self = room.members.find((m) => m.id === room.selfId);
  const away = self?.status === "away";
  const toggleAway = useCallback(() => {
    if (away) {
      setMemberStatus(null);
      return;
    }
    setMemberStatus("away");
    // Stepping away pauses the show for everyone.
    post({ type: "tandem:pause" });
  }, [away, setMemberStatus]);

  // Someone else is sitting through an ad: pause here so nobody gets ahead.
  const partnerInAd = room.members.some((m) => m.id !== room.selfId && m.status === "ad");
  useEffect(() => {
    if (partnerInAd) post({ type: "tandem:pause" });
  }, [partnerInAd]);

  // The extension counts time spent watching with someone, for "our shows".
  const together = room.members.length > 1;
  useEffect(() => {
    post({ type: "tandem:partner", present: together });
  }, [together]);

  const notice = partnerNotice(room.members, room.selfId);
  const phone = layout === "phone";

  useEffect(() => {
    nameRef.current = (id) => (id === room.selfId ? "You" : (room.members.find((m) => m.id === id)?.name ?? "Guest"));
  });

  const peer = rtc.peers[0] ?? null;
  const callVolume = useCallOutputVolume();
  const peerName = peer ? (room.members.find((m) => m.id === peer.id)?.name ?? "Guest") : null;
  // Someone is here, but the call with them is still connecting.
  const arriving = peer ? null : room.members.find((m) => m.id !== room.selfId);
  const hasLocalVideo = !!localStream?.getVideoTracks().length;
  const hasLocalAudio = !!localStream?.getAudioTracks().length;

  const sync =
    room.status !== "joined"
      ? { text: room.status === "connecting" ? "Connecting…" : "Reconnecting…", tone: "text-amber-300" }
      : notice
        ? { text: notice, tone: "text-amber-300" }
        : away
          ? { text: "You stepped away", tone: "text-amber-300" }
          : phone
            ? { text: room.remote?.playback.playing ? "Playing together" : "Paused", tone: "text-zinc-400" }
            : hasVideo === false
        ? { text: "No video found on this page", tone: "text-amber-300" }
        : drift === null
          ? { text: hasVideo ? "Ready to watch" : embedded ? "Finding your video…" : "Open Tandem from your browser toolbar", tone: "text-zinc-400" }
          : Math.abs(drift) < 0.3
            ? { text: "Watching together", tone: "text-emerald-300" }
            : { text: "Catching up…", tone: "text-amber-300" };

  const host = typeof window === "undefined" ? "" : window.location.host;

  return (
    <div className={`relative flex flex-col bg-ink text-white ${phone ? "h-dvh" : ""}`}>
      {room.takenOver && <TakenOver onUseHere={room.useHere} compact={!phone} />}
      <div className={`relative bg-ink-800 ${phone ? "min-h-0 flex-1" : "aspect-[4/3]"}`}>
        {peer ? (
          <>
            <PeerVideo stream={peer.stream} name={peerName ?? "Guest"} volume={callVolume} className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium">{peerName}</span>
          </>
        ) : arriving ? (
          <Connecting name={arriving.name} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            {hasLocalVideo && rtc.camOn ? (
              <StreamVideo stream={localStream} muted mirror className="absolute inset-0 h-full w-full object-cover opacity-60" />
            ) : null}
            <div className="relative">
              <p className="text-sm font-medium">Waiting for your partner…</p>
              <p className="mt-0.5 text-[11px] text-zinc-400">Send them the invite link. It helps them get set up.</p>
              <button onClick={copyInvite} className="btn3d btn3d-brand btn3d-xs mt-3">
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy invite"}
              </button>
            </div>
          </div>
        )}
        {!embedded && <FloatingReactions items={floating.items} onDone={floating.remove} />}
        {peer && (
          <div className="absolute bottom-2 right-2 h-14 w-[4.7rem] overflow-hidden rounded-lg border border-white/20 bg-ink-800 shadow">
            {hasLocalVideo && rtc.camOn ? (
              <StreamVideo stream={localStream} muted mirror className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-zinc-400">You</div>
            )}
          </div>
        )}
      </div>

      <ConnectionNotice poor={rtc.poorConnection} cameraOn={hasLocalVideo && rtc.camOn} onTurnCameraOff={rtc.turnCameraOff} />
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-2 py-1.5">
        <ReactionBar onSend={room.sendReaction} />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {!phone && (
            <button
              onClick={toggleAway}
              aria-pressed={away}
              title={away ? "I'm back" : "Be right back: pauses the show"}
              className={`flex h-7 items-center gap-1 rounded-full px-2 text-[11px] transition ${
                away ? "bg-amber-400/90 text-ink hover:bg-amber-300" : "bg-white/10 text-zinc-200 hover:bg-white/20"
              }`}
            >
              <Coffee className="size-3" /> {away ? "I'm back" : "BRB"}
            </button>
          )}
          {!phone && (
            <button
              onClick={() => setPhoneOpen((o) => !o)}
              aria-expanded={phoneOpen}
              aria-label="Join the call from a phone"
              title="Join the call from a phone"
              className="control-button control-sm"
            >
              <Smartphone className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      {phoneOpen && (
        <p className="border-b border-white/10 px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
          On a phone, open <span className="font-medium text-white">{host}/call/{roomId}</span> to join the call there. Handy for the TV or if one of you has no laptop.
        </p>
      )}
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <Toggle on={rtc.micOn} onClick={rtc.toggleMic} disabled={!hasLocalAudio} label={rtc.micOn ? "Mute" : "Unmute"}>
          {rtc.micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
        </Toggle>
        <Toggle on={rtc.camOn} onClick={rtc.toggleCam} disabled={!hasLocalVideo} label={rtc.camOn ? "Camera off" : "Camera on"}>
          {rtc.camOn ? <Video className="size-3.5" /> : <VideoOff className="size-3.5" />}
        </Toggle>
        <CallVolumeControl buttonClassName="control-button control-sm" />
        <ChimeToggle className="control-button control-sm [&_svg]:size-3.5" />
        <div className="ml-auto"><Participants members={room.members} selfId={room.selfId} hostId={room.hostId} compact /></div>
        {phone ? (
          <Link href="/" className={LEAVE_CLASS} title="Leave room">
            <LogOut className="size-3" /> Leave
          </Link>
        ) : (
          <button onClick={() => post({ type: "tandem:close" })} className={LEAVE_CLASS} title="Leave room">
            <LogOut className="size-3" /> Leave
          </button>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-3 py-1.5 text-[11px]">
        <span className="flex items-center gap-1.5 text-zinc-400">
          <LogoMark size={14} /> <span className="font-sans">{roomId}</span>
        </span>
        <span className={sync.tone}>{sync.text}</span>
      </div>
    </div>
  );
}

const LEAVE_CLASS =
  "btn3d btn3d-ghost btn3d-xs ml-1";

function Toggle({
  on,
  onClick,
  disabled,
  label,
  children,
}: {
  on: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <ControlButton
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      size="sm"
      tone={on ? "neutral" : "danger"}
    >
      {children}
    </ControlButton>
  );
}
