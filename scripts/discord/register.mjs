// Registers Tandem's slash commands with Discord. Run once, and again whenever COMMANDS changes:
//
//   npm run discord:register
//
// Reads DISCORD_BOT_TOKEN and the app ID (DISCORD_APPLICATION_ID, or NEXT_PUBLIC_DISCORD_APP_ID) from
// the environment or from .env. Both are in the Discord Developer Portal (General Information, and
// Bot → Reset Token). The token is only needed here: never add it to Vercel.
import { existsSync } from "node:fs";
import { COMMANDS } from "../../src/lib/discord.ts";

// Values already in the environment win; .env fills in the rest.
if (existsSync(".env")) process.loadEnvFile(".env");

const app = process.env.DISCORD_APPLICATION_ID || process.env.NEXT_PUBLIC_DISCORD_APP_ID;
const token = process.env.DISCORD_BOT_TOKEN;
if (!app || !token) {
  console.error("Set DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID (in .env or on the command line).");
  process.exit(1);
}
const res = await fetch(`https://discord.com/api/v10/applications/${app}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(COMMANDS),
});
const body = await res.json().catch(() => null);
if (!res.ok) {
  console.error(`Discord said ${res.status}:`, JSON.stringify(body, null, 2));
  process.exit(1);
}
console.log(`Registered: ${body.map((c) => `/${c.name}`).join(", ")}`);
console.log(`Add it: https://discord.com/oauth2/authorize?client_id=${app}`);
