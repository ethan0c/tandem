import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  PlaybackState,
  RoomState,
  ServerToClientEvents,
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
}

function freshPlayback(): PlaybackState {
  return { playing: false, time: 0, updatedAt: Date.now() };
}

function getRoom(id: string): RoomState {
  let room = rooms.get(id);
  if (!room) {
    room = { id, hostId: null, members: [], source: null, playback: freshPlayback() };
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
