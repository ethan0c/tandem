import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/**
 * One socket per tab, created lazily on first use.
 * Talks to the page's own origin unless NEXT_PUBLIC_SOCKET_URL points at a separately hosted
 * `server.ts` (needed when the site itself is on a static/serverless host such as Vercel).
 */
export function getSocket(): AppSocket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    const opts = { path: "/socket.io", transports: ["websocket", "polling"] };
    socket = url ? io(url, opts) : io(opts);
  }
  return socket;
}
