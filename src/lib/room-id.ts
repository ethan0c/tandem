import { customAlphabet } from "nanoid";

const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
const gen = customAlphabet(alphabet, 8);

export function newRoomId() {
  const raw = gen();
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Accept a bare code, a "xxxx-xxxx" code, or a full room, invite or call URL. */
export function parseRoomCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fromUrl = trimmed.match(/\/(?:room|join|call)\/([a-z0-9-]+)/i);
  const code = (fromUrl ? fromUrl[1] : trimmed).toLowerCase();
  if (!/^[a-z0-9-]{4,24}$/.test(code)) return null;
  return code;
}
