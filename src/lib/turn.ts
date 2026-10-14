/**
 * Short-lived TURN credentials, minted on the server (see /api/turn). A password baked into the page
 * can be copied and used to drain the relay quota for as long as it lives; these expire on their own.
 * Supports Metered (METERED_DOMAIN + METERED_SECRET_KEY) and Cloudflare (CLOUDFLARE_TURN_KEY_ID +
 * CLOUDFLARE_TURN_API_TOKEN). Server-only: the secrets never reach the browser.
 */

type Env = Record<string, string | undefined>;

export interface MintedIce {
  iceServers: RTCIceServer[];
  /** ms since epoch. */
  expiresAt: number;
}

/** Long enough for a long watch night: a relay allocation cannot be refreshed once its password expires. */
export const TURN_TTL_S = 12 * 60 * 60;

/** Relay addresses are not secret: TURN_URLS, or the public setting the page already uses. */
function relayUrls(env: Env) {
  return (env.TURN_URLS ?? env.NEXT_PUBLIC_TURN_URL ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter((u) => /^turns?:\S+$/i.test(u));
}

export async function mintIceServers(env: Env = process.env, fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<MintedIce | null> {
  const expiresAt = now + TURN_TTL_S * 1000;

  if (env.METERED_DOMAIN && env.METERED_SECRET_KEY) {
    const urls = relayUrls(env);
    if (!urls.length) return null;
    const res = await fetchImpl(
      `https://${env.METERED_DOMAIN}/api/v1/turn/credential?secretKey=${encodeURIComponent(env.METERED_SECRET_KEY)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expiryInSeconds: TURN_TTL_S, label: "tandem" }) },
    );
    if (!res.ok) throw new Error(`Metered answered ${res.status}`);
    const body = (await res.json()) as { username?: string; password?: string };
    if (!body.username || !body.password) throw new Error("Metered sent no credential");
    return { iceServers: [{ urls, username: body.username, credential: body.password }], expiresAt };
  }

  if (env.CLOUDFLARE_TURN_KEY_ID && env.CLOUDFLARE_TURN_API_TOKEN) {
    const res = await fetchImpl(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.CLOUDFLARE_TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_TURN_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: TURN_TTL_S }),
    });
    if (!res.ok) throw new Error(`Cloudflare answered ${res.status}`);
    const body = (await res.json()) as { iceServers?: RTCIceServer | RTCIceServer[] };
    const list = Array.isArray(body.iceServers) ? body.iceServers : body.iceServers ? [body.iceServers] : [];
    // Only the relay entries: the page has its own STUN servers.
    const iceServers = list
      .map((s) => ({ ...s, urls: ([] as string[]).concat(s.urls).filter((u) => /^turns?:/i.test(u)) }))
      .filter((s) => s.urls.length);
    if (!iceServers.length) throw new Error("Cloudflare sent no relay");
    return { iceServers, expiresAt };
  }

  return null;
}
