import { createPublicKey, verify } from "node:crypto";
import { SITE_URL } from "./links";
import { newRoomId } from "./room-id";

/**
 * Tandem's Discord app, answered over HTTP (Discord calls /api/discord): no bot process to keep running.
 * `/watch` posts a room link in the channel or DM where it was typed, so every server and chat that
 * uses it shows Tandem to the people in it.
 */

const PING = 1;
const APPLICATION_COMMAND = 2;
const PONG = 1;
const CHANNEL_MESSAGE = 4;
/** Only the sender sees it. */
const EPHEMERAL = 1 << 6;
/** Discord refuses requests older than this anyway; checking stops a captured request being replayed. */
const MAX_AGE_S = 5 * 60;

interface Interaction {
  type: number;
  data?: { name?: string; options?: { name: string; value?: unknown }[] };
  member?: { user?: DiscordUser; nick?: string | null };
  user?: DiscordUser;
}
interface DiscordUser {
  username?: string;
  global_name?: string | null;
}

/** Discord signs every request with the app's Ed25519 key; anything else is not from Discord. */
export function verifyDiscordRequest(body: string, signature: string | null, timestamp: string | null, publicKeyHex: string, now = Date.now()) {
  if (!signature || !timestamp || !/^[0-9a-f]+$/i.test(signature) || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > MAX_AGE_S) return false;
  try {
    const key = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(publicKeyHex, "hex").toString("base64url") }, format: "jwk" });
    return verify(null, Buffer.from(timestamp + body), key, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

function option(interaction: Interaction, name: string) {
  const value = interaction.data?.options?.find((o) => o.name === name)?.value;
  return typeof value === "string" ? value.trim() : "";
}

/** No @everyone, role or user pings can ride along in what someone typed. */
const NO_MENTIONS = { parse: [] as string[] };

/**
 * What someone typed, shown as typed: formatting characters are escaped so a show title cannot restyle
 * the message, and square brackets are dropped so it cannot hide a link ("[free](https://…)").
 */
function plain(text: string) {
  return text.replace(/[[\]]/g, "").replace(/[\\*_~`|>]/g, (c) => `\\${c}`);
}

/** The reply to a verified interaction. */
export function respond(interaction: Interaction, roomId = newRoomId()) {
  if (interaction.type === PING) return { type: PONG };
  if (interaction.type !== APPLICATION_COMMAND || interaction.data?.name !== "watch") {
    return { type: CHANNEL_MESSAGE, data: { content: "Tandem only knows `/watch` for now.", flags: EPHEMERAL } };
  }
  const user = interaction.member?.user ?? interaction.user;
  const from = (interaction.member?.nick || user?.global_name || user?.username || "Someone").slice(0, 32);
  const what = option(interaction, "what").slice(0, 100);
  const link = option(interaction, "link");
  if (link && !/^https?:\/\/\S+$/i.test(link)) {
    return { type: CHANNEL_MESSAGE, data: { content: "That link needs to start with https:// — try `/watch` again.", flags: EPHEMERAL } };
  }
  const params = new URLSearchParams({ from });
  if (what) params.set("what", what);
  if (link) params.set("to", link.slice(0, 500));
  // Shows up in analytics as visits from Discord.
  params.set("utm_source", "discord");
  const url = `${SITE_URL}/join/${roomId}?${params}`;
  return {
    type: CHANNEL_MESSAGE,
    data: {
      content: `**${plain(from)}** started a watch room${what ? ` for **${plain(what)}**` : ""} 🍿\nJoin to watch together, with a video call beside the show.`,
      allowed_mentions: NO_MENTIONS,
      components: [{ type: 1, components: [{ type: 2, style: 5, label: "Join the room", url }] }],
    },
  };
}

/** The commands registered with Discord (scripts/discord/register.mjs reads this shape). */
export const COMMANDS = [
  {
    name: "watch",
    description: "Start a Tandem room: watch together with a video call beside the show",
    type: 1,
    // Usable in servers and, once added to your account, in DMs and group chats too.
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      { type: 3, name: "what", description: "What you're watching (optional)", required: false, max_length: 100 },
      { type: 3, name: "link", description: "Link to the episode, so everyone lands on it (optional)", required: false, max_length: 500 },
    ],
  },
];
