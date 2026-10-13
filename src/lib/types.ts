/** Shared contracts between the Socket.IO server and the browser client. */

export type Source =
  | { kind: "url"; url: string }
  | { kind: "file"; name: string };

export type SyncReason = "play" | "pause" | "seek" | "ended" | "resync";

export interface PlaybackState {
  playing: boolean;
  /** Media time (seconds) at the moment `updatedAt` was stamped. */
  time: number;
  /** Server clock (ms since epoch) when this state was recorded. */
  updatedAt: number;
}

export interface Member {
  id: string;
  name: string;
}

export interface RoomState {
  id: string;
  hostId: string | null;
  members: Member[];
  source: Source | null;
  playback: PlaybackState;
}

export interface JoinAck {
  state: RoomState;
  selfId: string;
  serverNow: number;
}

export type SignalData =
  | { type: "offer" | "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "candidate"; candidate: RTCIceCandidateInit };

export interface ServerToClientEvents {
  "member:joined": (member: Member) => void;
  "member:left": (payload: { id: string; hostId: string | null }) => void;
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
}

export interface ClientToServerEvents {
  "room:join": (
    payload: { roomId: string; name: string },
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
}

/** Where the media should be right now, given a playback state and the server clock. */
export function expectedTime(playback: PlaybackState, serverNow: number) {
  if (!playback.playing) return playback.time;
  return playback.time + Math.max(0, serverNow - playback.updatedAt) / 1000;
}
