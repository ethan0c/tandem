// Registers Tandem's slash commands with Discord. Run once, and again whenever COMMANDS changes:
//
//   DISCORD_APPLICATION_ID=… DISCORD_BOT_TOKEN=… npm run discord:register
//
// Both values are in the Discord Developer Portal (General Information, and Bot → Reset Token).
// The token is only needed here; the site itself only needs DISCORD_PUBLIC_KEY.
import { COMMANDS } from "../../src/lib/discord.ts";

const app = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_BOT_TOKEN;
if (!app || !token) {
  console.error("Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN.");
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
