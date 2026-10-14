import { mintIceServers } from "@/lib/turn";

/** Per address, per minute. Each page asks once per room; this only slows someone farming passwords. */
const LIMIT = 20;
const hits = new Map<string, number[]>();

function allowed(ip: string, now = Date.now()) {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= LIMIT) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear();
  return true;
}

/** A fresh, expiring relay password for the page that is about to join a call. */
export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(ip)) return Response.json({ error: "Too many requests" }, { status: 429 });
  try {
    const minted = await mintIceServers();
    // No provider set up: the page falls back to its built-in setting.
    return Response.json(minted ?? { iceServers: [], expiresAt: 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[turn]", error);
    return Response.json({ iceServers: [], expiresAt: 0 }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
