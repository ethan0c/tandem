import { respond, verifyDiscordRequest } from "@/lib/discord";

/** Discord's Interactions Endpoint URL: set it to https://<site>/api/discord in the Developer Portal. */
export async function POST(request: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return new Response("Discord is not set up here", { status: 503 });
  const body = await request.text();
  const ok = verifyDiscordRequest(body, request.headers.get("x-signature-ed25519"), request.headers.get("x-signature-timestamp"), publicKey);
  if (!ok) return new Response("Bad signature", { status: 401 });
  let interaction;
  try {
    interaction = JSON.parse(body);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  return Response.json(respond(interaction));
}
