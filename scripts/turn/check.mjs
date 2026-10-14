// Checks that a relay works end to end: mints a password exactly as /api/turn does, then connects
// two browser peers through each relay address with direct connections forbidden.
//
//   npm run turn:check                       (reads TURN_SECRET + TURN_URLS, or Metered/Cloudflare, from .env)
//   TURN_SECRET=… TURN_URLS=… npm run turn:check
//   TURN_CHECK_RESOLVE=turn.example.com=1.2.3.4 npm run turn:check   (skip local DNS, e.g. a router still
//                                                                   caching an old answer after a DNS change)
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { mintIceServers } from "../../src/lib/turn.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const minted = await mintIceServers();
if (!minted) {
  console.error("No relay set up: set TURN_SECRET and TURN_URLS (own relay), or METERED_DOMAIN + METERED_SECRET_KEY.");
  process.exit(1);
}
const { username, credential } = minted.iceServers[0];
const urls = minted.iceServers.flatMap((s) => [].concat(s.urls));
console.log(`Password minted, valid until ${new Date(minted.expiresAt).toLocaleString()}. Testing ${urls.length} addresses:`);

const resolve = process.env.TURN_CHECK_RESOLVE?.match(/^([\w.-]+)=([\d.]+)$/);
const browser = await chromium.launch({
  channel: "chrome",
  args: resolve ? [`--host-resolver-rules=MAP ${resolve[1]} ${resolve[2]}`] : [],
});
const page = await browser.newPage();
let failed = 0;
for (const url of urls) {
  const result = await page.evaluate(async ({ url, username, credential }) => {
    const ice = [{ urls: url, username, credential }];
    const a = new RTCPeerConnection({ iceServers: ice, iceTransportPolicy: "relay" });
    const b = new RTCPeerConnection({ iceServers: ice, iceTransportPolicy: "relay" });
    const errors = new Set();
    a.onicecandidateerror = (e) => errors.add(`${e.errorCode} ${e.errorText}`);
    a.onicecandidate = (e) => e.candidate && b.addIceCandidate(e.candidate).catch(() => {});
    b.onicecandidate = (e) => e.candidate && a.addIceCandidate(e.candidate).catch(() => {});
    const channel = a.createDataChannel("check");
    const t0 = performance.now();
    await a.setLocalDescription(await a.createOffer());
    await b.setRemoteDescription(a.localDescription);
    await b.setLocalDescription(await b.createAnswer());
    await a.setRemoteDescription(b.localDescription);
    const ok = await new Promise((r) => { channel.onopen = () => r(true); setTimeout(() => r(false), 12_000); });
    a.close();
    b.close();
    return { ok, ms: Math.round(performance.now() - t0), errors: [...errors].slice(0, 2) };
  }, { url, username, credential });
  if (!result.ok) failed++;
  console.log(`  ${result.ok ? "ok  " : "FAIL"} ${url}${result.ok ? ` (${result.ms} ms)` : `  ${result.errors.join("; ") || "no relay connection"}`}`);
}
await browser.close();
console.log(failed ? `\n${failed} of ${urls.length} addresses failed.` : "\nEvery address relays.");
process.exit(failed ? 1 : 0);
