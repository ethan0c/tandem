import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import next from "next";
import { Server } from "socket.io";
import {
  CHAT_HISTORY,
  CHAT_MAX_LENGTH,
  REACTIONS,
  type ClientToServerEvents,
  type PlaybackState,
  type RoomState,
  type ServerToClientEvents,
} from "./src/lib/types";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

/** Rooms live in memory only. An empty room is kept briefly so a refresh does not lose state. */
const rooms = new Map<string, RoomState>();
const cleanupTimers = new Map<string, NodeJS.Timeout>();
const expiresAt = new Map<string, number>();
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;

/**
 * A member whose socket dropped keeps their seat (and their share) this long while the browser
 * reconnects. Socket.IO needs up to 45 s to notice a dead connection, plus the reconnect backoff.
 */
const RECONNECT_GRACE_MS = 60 * 1000;
/**
 * A page that said goodbye while unloading may be reloading (and back in a moment), or may have been
 * closed. Either way it is not a network problem, so it gets a much shorter hold before its seat goes.
 */
const UNLOAD_GRACE_MS = 15 * 1000;

/** The live socket for each member, so signals follow a member across reconnects. */
const socketOf = new Map<string, string>();
/** A reload gets a new WebRTC identity but replaces the same tab's old seat. */
const seatByTab = new Map<string, { roomId: string; clientId: string }>();
const tabOfMember = new Map<string, string>();
/** Members whose socket dropped and who are not yet removed from their room. */
const pendingLeave = new Map<string, { roomId: string; timer: NodeJS.Timeout }>();

interface SocketData {
  roomId?: string;
  clientId?: string;
  /** Send times of this socket's recent chat messages, for the flood check. */
  chatTimes?: number[];
  /** Send times of this socket's recent reactions. */
  reactionTimes?: number[];
}

/** No more than this many chat messages per socket in any `CHAT_BURST_MS` window. */
const CHAT_BURST = 8;
const CHAT_BURST_MS = 5_000;
/** Reactions are tapped in bursts, so they get a looser limit than chat. */
const REACTION_BURST = 12;
const REACTION_BURST_MS = 3_000;

function freshPlayback(): PlaybackState {
  return { playing: false, time: 0, updatedAt: Date.now() };
}

function getRoom(id: string): RoomState {
  let room = rooms.get(id);
  if (!room) {
    room = { id, hostId: null, members: [], source: null, playback: freshPlayback(), chat: [] };
    rooms.set(id, room);
  }
  const timer = cleanupTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    cleanupTimers.delete(id);
    expiresAt.delete(id);
  }
  return room;
}

function scheduleCleanup(id: string) {
  const previous = cleanupTimers.get(id);
  if (previous) clearTimeout(previous);
  expiresAt.set(id, Date.now() + EMPTY_ROOM_TTL_MS);
  cleanupTimers.set(
    id,
    setTimeout(() => {
      rooms.delete(id);
      cleanupTimers.delete(id);
      expiresAt.delete(id);
    }, EMPTY_ROOM_TTL_MS),
  );
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    if (req.url?.startsWith("/room-status/") && req.method === "GET") {
      const id = req.url.slice("/room-status/".length);
      const origin = req.headers.origin;
      const allowed = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? [];
      if (origin && (!process.env.CORS_ORIGIN || allowed.includes(origin))) res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json");
      const room = rooms.get(id);
      res.end(JSON.stringify({ exists: !!room, expiresAt: expiresAt.get(id) ?? null }));
      return;
    }
    if (req.url === "/leave" && (req.method === "POST" || req.method === "OPTIONS")) {
      handleLeave(req, res);
      return;
    }
    handle(req, res);
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    path: "/socket.io",
    // Only needed when the site is served from another origin (see NEXT_PUBLIC_SOCKET_URL).
    cors: process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(",").map((o) => o.trim()) } : undefined,
  });

  /** Take a member out of a room for good: seat, host role and any share they were running. */
  const leave = (roomId: string, clientId: string) => {
    const room = rooms.get(roomId);
    if (!room || !room.members.some((m) => m.id === clientId)) return;
    room.members = room.members.filter((m) => m.id !== clientId);
    const tab = tabOfMember.get(clientId);
    if (tab && seatByTab.get(tab)?.clientId === clientId) seatByTab.delete(tab);
    tabOfMember.delete(clientId);
    if (room.hostId === clientId) room.hostId = room.members[0]?.id ?? null;
    io.to(roomId).emit("member:left", { id: clientId, hostId: room.hostId });
    // A screen share cannot outlive the person sharing it.
    if (room.source?.kind === "screen" && room.source.sharerId === clientId) {
      room.source = null;
      room.playback = freshPlayback();
      io.to(roomId).emit("source:changed", { source: null, playback: room.playback, from: clientId });
    }
    if (room.members.length === 0) scheduleCleanup(roomId);
  };

  const holdSeat = (roomId: string, clientId: string, ms = RECONNECT_GRACE_MS) => {
    const previous = pendingLeave.get(clientId);
    if (previous) clearTimeout(previous.timer);
    pendingLeave.set(clientId, {
      roomId,
      timer: setTimeout(() => {
        pendingLeave.delete(clientId);
        leave(roomId, clientId);
      }, ms),
    });
  };

  /**
   * A page that is closing says goodbye with a beacon (see `sendGoodbye` in src/lib/socket.ts), because
   * a socket frame sent during unload may never arrive. Frees the member's seat at once.
   */
  const handleLeave = (req: IncomingMessage, res: ServerResponse) => {
    const origin = req.headers.origin;
    const allowed = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? [];
    if (origin && (!process.env.CORS_ORIGIN || allowed.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    let body = "";
    req.on("data", (chunk: Buffer) => {
      if (body.length < 1024) body += chunk.toString("utf8", 0, 1024 - body.length);
    });
    req.on("end", () => {
      let clientId: unknown;
      let reconnecting = false;
      try {
        const payload = JSON.parse(body) as { clientId?: unknown; reconnecting?: unknown };
        clientId = payload.clientId;
        reconnecting = payload.reconnecting === true;
      } catch {
        /* not ours */
      }
      if (typeof clientId !== "string" || !clientId) {
        res.writeHead(400).end();
        return;
      }
      const pending = pendingLeave.get(clientId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingLeave.delete(clientId);
      }
      const sid = socketOf.get(clientId);
      const roomId = pending?.roomId ?? (sid ? io.sockets.sockets.get(sid)?.data.roomId : undefined);
      socketOf.delete(clientId);
      if (roomId) {
        if (reconnecting) holdSeat(roomId, clientId, UNLOAD_GRACE_MS);
        else leave(roomId, clientId);
      }
      res.writeHead(204).end();
    });
  };

  io.on("connection", (socket) => {
    socket.on("room:join", ({ roomId: id, name, clientId: requested, tabId, formerTabId }, ack) => {
      // Older clients send no id; their socket id then plays the part, as it used to.
      const clientId = typeof requested === "string" && requested ? requested.slice(0, 64) : socket.id;
      const tab = typeof tabId === "string" && tabId ? tabId.slice(0, 64) : undefined;
      let previous = tab ? seatByTab.get(tab) : undefined;
      // Back in the same tab after going somewhere else: take over our old seat, but only if its page is
      // gone. A duplicated tab carries the same former id while the original is still connected.
      const former = typeof formerTabId === "string" && formerTabId ? formerTabId.slice(0, 64) : undefined;
      if (!previous && former) {
        const seat = seatByTab.get(former);
        if (seat && pendingLeave.has(seat.clientId)) {
          previous = seat;
          seatByTab.delete(former);
        }
      }
      let replaced = false;
      if (previous && previous.clientId !== clientId) {
        const pending = pendingLeave.get(previous.clientId);
        if (pending) clearTimeout(pending.timer);
        pendingLeave.delete(previous.clientId);
        const oldSocketId = socketOf.get(previous.clientId);
        socketOf.delete(previous.clientId);
        // Remove routing first, so a late disconnect or goodbye cannot affect the new seat.
        if (oldSocketId) io.sockets.sockets.get(oldSocketId)?.disconnect(true);
        const room = rooms.get(previous.roomId);
        const member = room?.members.find((m) => m.id === previous.clientId);
        if (room && member && previous.roomId === id) {
          // Rebuild media connections without announcing a departure or discarding chat.
          member.id = clientId;
          member.name = name.trim().slice(0, 32) || "Guest";
          if (room.hostId === previous.clientId) room.hostId = clientId;
          tabOfMember.delete(previous.clientId);
          socket.to(id).emit("member:replaced", { id: previous.clientId, member, hostId: room.hostId });
          if (room.source?.kind === "screen" && room.source.sharerId === previous.clientId) {
            room.source = null;
            room.playback = freshPlayback();
            io.to(id).emit("source:changed", { source: null, playback: room.playback, from: clientId });
          }
          replaced = true;
        } else leave(previous.roomId, previous.clientId);
      }
      if (socket.data.roomId && socket.data.roomId !== id) {
        socket.leave(socket.data.roomId);
        leave(socket.data.roomId, clientId);
      }
      socket.data.roomId = id;
      socket.data.clientId = clientId;
      socket.join(id);

      const pending = pendingLeave.get(clientId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingLeave.delete(clientId);
        if (pending.roomId !== id) leave(pending.roomId, clientId);
      }
      socketOf.set(clientId, socket.id);
      if (tab) {
        seatByTab.set(tab, { roomId: id, clientId });
        tabOfMember.set(clientId, tab);
      }

      const room = getRoom(id);
      const trimmed = name.trim().slice(0, 32) || "Guest";
      const existing = room.members.find((m) => m.id === clientId);
      if (existing) {
        // Same member on a new socket: nothing changed for anyone else.
        existing.name = trimmed;
      } else if (!replaced) {
        const member = { id: clientId, name: trimmed };
        room.members.push(member);
        socket.to(id).emit("member:joined", member);
      }
      if (!room.hostId) room.hostId = clientId;
      ack({ state: room, selfId: clientId, serverNow: Date.now() });
    });

    socket.on("time:ping", (ack) => ack(Date.now()));

    socket.on("sync:update", ({ playing, time, reason }) => {
      const { roomId, clientId } = socket.data;
      if (!roomId || !clientId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      room.playback = { playing, time, updatedAt: Date.now() };
      socket.to(roomId).emit("sync:state", { playback: room.playback, from: clientId, reason });
    });

    socket.on("source:set", (source) => {
      const { roomId, clientId } = socket.data;
      if (!roomId || !clientId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      // Only the sender can be the sharer of their own screen.
      room.source = source?.kind === "screen" ? { ...source, sharerId: clientId } : source;
      room.playback = freshPlayback();
      io.to(roomId).emit("source:changed", { source: room.source, playback: room.playback, from: clientId });
    });

    socket.on("chat:send", (payload) => {
      const { roomId, clientId } = socket.data;
      if (!roomId || !clientId) return;
      const room = rooms.get(roomId);
      const member = room?.members.find((m) => m.id === clientId);
      if (!room || !member) return;
      const text = typeof payload?.text === "string" ? payload.text.trim().slice(0, CHAT_MAX_LENGTH) : "";
      if (!text) return;
      const now = Date.now();
      const recent = (socket.data.chatTimes ?? []).filter((t) => now - t < CHAT_BURST_MS);
      if (recent.length >= CHAT_BURST) return;
      recent.push(now);
      socket.data.chatTimes = recent;
      // The name comes from the seat, never from the payload.
      const message = { id: randomUUID(), from: clientId, name: member.name, text, at: now };
      room.chat.push(message);
      if (room.chat.length > CHAT_HISTORY) room.chat.splice(0, room.chat.length - CHAT_HISTORY);
      io.to(roomId).emit("chat:message", message);
    });

    socket.on("member:status", (status) => {
      const { roomId, clientId } = socket.data;
      const member = roomId ? rooms.get(roomId)?.members.find((m) => m.id === clientId) : undefined;
      if (!roomId || !clientId || !member) return;
      const next = status === "away" || status === "ad" ? status : null;
      if ((member.status ?? null) === next) return;
      member.status = next;
      io.to(roomId).emit("member:status", { id: clientId, status: next });
    });

    socket.on("reaction:send", (payload) => {
      const { roomId, clientId } = socket.data;
      if (!roomId || !clientId || !rooms.get(roomId)?.members.some((m) => m.id === clientId)) return;
      const emoji = REACTIONS.find((r) => r === payload?.emoji);
      if (!emoji) return;
      const now = Date.now();
      const recent = (socket.data.reactionTimes ?? []).filter((t) => now - t < REACTION_BURST_MS);
      if (recent.length >= REACTION_BURST) return;
      recent.push(now);
      socket.data.reactionTimes = recent;
      io.to(roomId).emit("reaction", { id: randomUUID(), from: clientId, emoji });
    });

    socket.on("rtc:signal", ({ to, data }) => {
      const from = socket.data.clientId;
      const target = socketOf.get(to);
      if (from && target && socketOf.get(from) === socket.id && io.sockets.sockets.get(target)?.data.roomId === socket.data.roomId) io.to(target).emit("rtc:signal", { from, data });
    });

    socket.on("screen:signal", ({ to, data }) => {
      const from = socket.data.clientId;
      const target = socketOf.get(to);
      if (from && target && socketOf.get(from) === socket.id && io.sockets.sockets.get(target)?.data.roomId === socket.data.roomId) io.to(target).emit("screen:signal", { from, data });
    });

    socket.on("disconnect", (reason) => {
      const { roomId, clientId } = socket.data;
      if (!roomId || !clientId) return;
      // A newer socket already took over this member: this one is just the old connection dying.
      if (socketOf.get(clientId) !== socket.id) return;
      socketOf.delete(clientId);
      // The browser said goodbye on purpose (tab closed, left the room): go now.
      if (reason === "client namespace disconnect" || reason === "server namespace disconnect") {
        leave(roomId, clientId);
        return;
      }
      // Anything else may be a blip; hold the seat while the browser reconnects.
      holdSeat(roomId, clientId);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Tandem ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
  });
});
