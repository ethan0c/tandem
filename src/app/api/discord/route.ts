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

/** Opened in a browser: say what this is, rather than a bare "405 Method Not Allowed". */
export function GET() {
  const ready = !!process.env.DISCORD_PUBLIC_KEY;
  return new Response(
    `This is Tandem's Discord endpoint. Discord sends /watch here; there is nothing to see in a browser.\n` +
      (ready ? "Status: ready for Discord." : "Status: DISCORD_PUBLIC_KEY is not set, so Discord requests are refused."),
    { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
  );
}
