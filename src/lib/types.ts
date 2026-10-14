/** Shared contracts between the Socket.IO server and the browser client. */

export type Source =
  | { kind: "file"; name: string }
  /** Live screen/tab capture streamed over WebRTC from `sharerId`; the server fills in `sharerId`. */
  | { kind: "screen"; sharerId: string; label: string };

export type SyncReason = "play" | "pause" | "seek" | "ended" | "resync";

export interface PlaybackState {
  playing: boolean;
  /** Media time (seconds) at the moment `updatedAt` was stamped. */
  time: number;
  /** Server clock (ms since epoch) when this state was recorded. */
  updatedAt: number;
}

/** The reactions anyone can send. Anything else is dropped by the server. */
export const REACTIONS = ["❤️", "😂", "😮", "😭", "🔥"] as const;
export type Reaction = (typeof REACTIONS)[number];

/** Why a member is not watching right now: stepped away, or sitting through an ad on their site. */
export type MemberStatus = "away" | "ad" | null;

export interface Member {
  /**
   * The client id the browser chose for this page load (not the socket id). It survives a dropped and
   * re-established socket, so a reconnect is the same member and nothing has to be renegotiated.
   */
  id: string;
  name: string;
  status?: MemberStatus;
}

/** One line of room chat. The server stamps everything but the text, so a name cannot be forged. */
export interface ChatMessage {
  id: string;
  /** Member id of the sender. */
  from: string;
  /** The sender's display name at the time, kept so the line still reads after they leave. */
  name: string;
  text: string;
  /** Server clock (ms since epoch). */
  at: number;
}

/** The longest message the server accepts, in characters. */
export const CHAT_MAX_LENGTH = 500;
/** How many recent messages a room keeps for people who join or reconnect. */
export const CHAT_HISTORY = 100;

export interface RoomState {
  id: string;
  hostId: string | null;
  members: Member[];
  source: Source | null;
  playback: PlaybackState;
  /** Recent chat, oldest first. Lives only as long as the room does. */
  chat: ChatMessage[];
}

export interface JoinAck {
  state: RoomState;
  /** Our member id: the `clientId` we sent. */
  selfId: string;
  serverNow: number;
}

export type SignalData =
  | { type: "offer" | "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "candidate"; candidate: RTCIceCandidateInit };

/**
 * Screen-share signalling: a viewer sends `request` to the sharer, who answers with an offer.
 * `nonce` ties an answer to the offer it answers, so a late answer never lands on a newer connection.
 */
export type ScreenSignal =
  | { type: "request" }
  | { type: "offer" | "answer"; sdp: RTCSessionDescriptionInit; nonce: number }
  | { type: "candidate"; candidate: RTCIceCandidateInit };

export interface ServerToClientEvents {
  "member:joined": (member: Member) => void;
  "member:left": (payload: { id: string; hostId: string | null }) => void;
  "member:replaced": (payload: { id: string; member: Member; hostId: string | null }) => void;
  "sync:state": (payload: {
    playback: PlaybackState;
    from: string;
    reason: SyncReason;
  }) => void;
  "source:changed": (payload: {
    source: Source | null;
    playback: PlaybackState;
    from: string;
  }) => void;
  "rtc:signal": (payload: { from: string; data: SignalData }) => void;
  "screen:signal": (payload: { from: string; data: ScreenSignal }) => void;
  "chat:message": (message: ChatMessage) => void;
  "member:status": (payload: { id: string; status: MemberStatus }) => void;
  "reaction": (payload: { id: string; from: string; emoji: Reaction }) => void;
}

export interface ClientToServerEvents {
  "room:join": (
    payload: { roomId: string; name: string; clientId: string; tabId?: string; formerTabId?: string },
    ack: (res: JoinAck) => void,
  ) => void;
  "time:ping": (ack: (serverNow: number) => void) => void;
  "sync:update": (payload: {
    playing: boolean;
    time: number;
    reason: SyncReason;
  }) => void;
  "source:set": (source: Source | null) => void;
  "rtc:signal": (payload: { to: string; data: SignalData }) => void;
  "screen:signal": (payload: { to: string; data: ScreenSignal }) => void;
  "chat:send": (payload: { text: string }) => void;
  "member:status": (status: MemberStatus) => void;
  "reaction:send": (payload: { emoji: string }) => void;
}

/** Where the media should be right now, given a playback state and the server clock. */
export function expectedTime(playback: PlaybackState, serverNow: number) {
  if (!playback.playing) return playback.time;
  return playback.time + Math.max(0, serverNow - playback.updatedAt) / 1000;
}
