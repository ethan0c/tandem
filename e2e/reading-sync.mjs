// Exercises the real custom server: two readers, host permissions, reconnect, and room isolation.
import assert from "node:assert/strict";
import { io } from "socket.io-client";
import { randomUUID } from "node:crypto";
const base = process.env.BASE_URL || "http://localhost:3000";
const sockets = [];
const once = (socket, event) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Timed out: ${event}`)), 5000); socket.once(event, (...args) => { clearTimeout(timer); resolve(args[0]); }); });
async function join(roomId, name, clientId = randomUUID()) {
  const socket = io(base, { transports: ["websocket"], autoConnect: false }); sockets.push(socket);
  const connected = once(socket, "connect"); socket.connect(); await connected;
  const ack = await socket.timeout(5000).emitWithAck("room:join", { roomId, name, clientId });
  return { socket, ack, clientId };
}
try {
  const room = `read-${randomUUID().slice(0, 8)}`;
  const a = await join(room, "Reader A"); const b = await join(room, "Reader B");
  let next = once(b.socket, "reading:state"); a.socket.emit("reading:update", { chapter: 4, page: 2 }); assert.deepEqual(await next, { chapter: 4, page: 2, hostOnly: false });
  next = once(b.socket, "reading:state"); a.socket.emit("reading:update", { hostOnly: true }); assert.equal((await next).hostOnly, true);
  let invalidBroadcast = false; a.socket.on("reading:state", () => { invalidBroadcast = true; });
  b.socket.emit("reading:update", { page: 8 }); b.socket.emit("story:update", { id: "38", kind: "manga", title: "Forged" });
  await b.socket.timeout(5000).emitWithAck("time:ping"); assert.equal(invalidBroadcast, false);
  next = once(b.socket, "story:state"); a.socket.emit("story:update", { id: "38", kind: "manga", title: "One Piece" }); assert.equal((await next).title, "One Piece");
  const late = await join(room, "Late reader"); assert.equal(late.ack.state.reading.page, 2); assert.equal(late.ack.state.story.title, "One Piece");
  const isolated = await join(`other-${randomUUID().slice(0, 8)}`, "Other reader"); assert.equal(isolated.ack.state.reading, undefined); assert.equal(isolated.ack.state.story, undefined);
  b.socket.io.engine.close(); const reconnected = once(b.socket, "connect"); await reconnected;
  const restored = await b.socket.timeout(5000).emitWithAck("room:join", { roomId: room, name: "Reader B", clientId: b.clientId }); assert.equal(restored.state.reading.chapter, 4);
  console.log("PASS: shared pages, host controls, late join, room isolation, and reconnect.");
} finally { sockets.forEach(socket => socket.disconnect()); }
