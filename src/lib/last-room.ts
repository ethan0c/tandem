const SESSION_KEY = "tandem:room-session";
const LAST_KEY = "tandem:last-room";
export const REJOIN_WINDOW_MS = 10 * 60 * 1000;

export interface RoomSession {
  roomId: string;
  name: string;
  camOn: boolean;
  micOn: boolean;
  active: boolean;
}

export function readSession(): RoomSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    return value && typeof value.roomId === "string" && typeof value.name === "string" ? value : null;
  } catch { return null; }
}

export function reloadSession(roomId: string) {
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const session = readSession();
  return navigation?.type === "reload" && session?.active && session.roomId === roomId ? session : null;
}

export function saveSession(session: RoomSession) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* storage unavailable */ }
}

export function rememberMedia(camOn: boolean, micOn: boolean) {
  const session = readSession();
  if (session?.active) saveSession({ ...session, camOn, micOn });
}

export function rememberRoom(roomId: string) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify({ roomId, at: Date.now() })); } catch { /* storage unavailable */ }
}

export function finishSession(roomId: string) {
  const session = readSession();
  if (session?.roomId === roomId) saveSession({ ...session, active: false });
  rememberRoom(roomId);
}

export function readLastRoom(): { roomId: string; at: number } | null {
  try {
    const value = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
    return value && typeof value.roomId === "string" && /^[a-z0-9-]{4,24}$/.test(value.roomId) && typeof value.at === "number" && Date.now() - value.at < REJOIN_WINDOW_MS ? value : null;
  } catch { return null; }
}

export function forgetLastRoom() {
  try { localStorage.removeItem(LAST_KEY); } catch { /* storage unavailable */ }
}
