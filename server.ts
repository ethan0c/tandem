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

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    let roomId: string | null = null;

    socket.on("room:join", ({ roomId: id, name }, ack) => {
      roomId = id;
      socket.join(id);
      const room = getRoom(id);
      const member = { id: socket.id, name: name.trim().slice(0, 32) || "Guest" };
      room.members.push(member);
      if (!room.hostId) room.hostId = socket.id;
      socket.to(id).emit("member:joined", member);
      ack({ state: room, selfId: socket.id, serverNow: Date.now() });
    });

    socket.on("time:ping", (ack) => ack(Date.now()));

    socket.on("sync:update", ({ playing, time, reason }) => {
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      room.playback = { playing, time, updatedAt: Date.now() };
      socket.to(roomId).emit("sync:state", { playback: room.playback, from: socket.id, reason });
    });

    socket.on("source:set", (source) => {
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      // Only the sender can be the sharer of their own screen.
      room.source = source?.kind === "screen" ? { ...source, sharerId: socket.id } : source;
      room.playback = freshPlayback();
      io.to(roomId).emit("source:changed", { source: room.source, playback: room.playback, from: socket.id });
    });

    socket.on("rtc:signal", ({ to, data }) => {
      io.to(to).emit("rtc:signal", { from: socket.id, data });
    });

    socket.on("screen:signal", ({ to, data }) => {
      io.to(to).emit("screen:signal", { from: socket.id, data });
    });

    socket.on("disconnect", () => {
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      room.members = room.members.filter((m) => m.id !== socket.id);
      if (room.hostId === socket.id) room.hostId = room.members[0]?.id ?? null;
      socket.to(roomId).emit("member:left", { id: socket.id, hostId: room.hostId });
      // A screen share cannot outlive the person sharing it.
      if (room.source?.kind === "screen" && room.source.sharerId === socket.id) {
        room.source = null;
        room.playback = freshPlayback();
        socket.to(roomId).emit("source:changed", { source: null, playback: room.playback, from: socket.id });
      }
      if (room.members.length === 0) scheduleCleanup(roomId);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Tandem ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
  });
});
