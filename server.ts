import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import next from "next";
import { Server } from "socket.io";
import {
  CHAT_HISTORY,
  CHAT_MAX_LENGTH,
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
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;

/**
 * A member whose socket dropped keeps their seat (and their share) this long while the browser
 * reconnects. Socket.IO needs up to 45 s to notice a dead connection, plus the reconnect backoff.
 */
const RECONNECT_GRACE_MS = 60 * 1000;

/** The live socket for each member, so signals follow a member across reconnects. */
const socketOf = new Map<string, string>();
/** Members whose socket dropped and who are not yet removed from their room. */
const pendingLeave = new Map<string, { roomId: string; timer: NodeJS.Timeout }>();

interface SocketData {
  roomId?: string;
  clientId?: string;
  /** Send times of this socket's recent chat messages, for the flood check. */
  chatTimes?: number[];
}

/** No more than this many chat messages per socket in any `CHAT_BURST_MS` window. */
const CHAT_BURST = 8;
const CHAT_BURST_MS = 5_000;

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
  }
  return room;
}

function scheduleCleanup(id: string) {
  cleanupTimers.set(
    id,
    setTimeout(() => {
      rooms.delete(id);
      cleanupTimers.delete(id);
    }, EMPTY_ROOM_TTL_MS),
  );
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
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
      try {
        clientId = (JSON.parse(body) as { clientId?: unknown }).clientId;
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
      if (roomId) leave(roomId, clientId);
      res.writeHead(204).end();
    });
  };

  io.on("connection", (socket) => {
    socket.on("room:join", ({ roomId: id, name, clientId: requested }, ack) => {
      // Older clients send no id; their socket id then plays the part, as it used to.
      const clientId = typeof requested === "string" && requested ? requested.slice(0, 64) : socket.id;
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

      const room = getRoom(id);
      const trimmed = name.trim().slice(0, 32) || "Guest";
      const existing = room.members.find((m) => m.id === clientId);
      if (existing) {
        // Same member on a new socket: nothing changed for anyone else.
        existing.name = trimmed;
      } else {
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

    socket.on("rtc:signal", ({ to, data }) => {
      const from = socket.data.clientId;
      const target = socketOf.get(to);
      if (from && target) io.to(target).emit("rtc:signal", { from, data });
    });

    socket.on("screen:signal", ({ to, data }) => {
      const from = socket.data.clientId;
      const target = socketOf.get(to);
      if (from && target) io.to(target).emit("screen:signal", { from, data });
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
      pendingLeave.set(clientId, {
        roomId,
        timer: setTimeout(() => {
          pendingLeave.delete(clientId);
          leave(roomId, clientId);
        }, RECONNECT_GRACE_MS),
      });
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Tandem ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
  });
});
