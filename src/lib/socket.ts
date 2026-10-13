import { nanoid } from "nanoid";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Who this tab is in a room. Chosen once per page load: a socket that drops and comes back is still
 * the same member, so a blip never ends a share or a call. A reload is a new member, which is right,
 * because its peer connections are gone and the others have to build new ones.
 */
export const clientId = nanoid(12);

/** Reuse a tab's seat only on reload; new tabs may inherit a copy of sessionStorage. */
function reloadTabId() {
  const fresh = nanoid(24);
  if (typeof window === "undefined") return fresh;
  try {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const saved = sessionStorage.getItem("tandem:tab-id");
    const id = navigation?.type === "reload" && saved ? saved : fresh;
    sessionStorage.setItem("tandem:tab-id", id);
    return id;
  } catch {
    return fresh;
  }
}

export const tabId = reloadTabId();

let socket: AppSocket | null = null;

/**
 * Tell the server this page is gone, in a way that survives unload. A frame written to the socket
 * while the page is closing may never leave the browser; a beacon is queued by the browser itself
 * and delivered after the page has gone. The server frees our seat at once instead of holding it
 * for a reconnect that is not coming.
 */
export function sendGoodbye(reconnecting = false) {
  const base = (process.env.NEXT_PUBLIC_SOCKET_URL ?? "").replace(/\/$/, "");
  try {
    // text/plain keeps this a "simple" request: no CORS preflight, so it is sent cross-origin too.
    navigator.sendBeacon(`${base}/leave`, new Blob([JSON.stringify({ clientId, reconnecting })], { type: "text/plain" }));
  } catch {
    /* no beacon support: the socket's own disconnect is the fallback */
  }
}

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
