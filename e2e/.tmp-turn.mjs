import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const env = Object.fromEntries(readFileSync(".env", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const urls = env.NEXT_PUBLIC_TURN_URL.split(",").map((u) => u.trim()).filter((u) => /^turns?:/.test(u));
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage();
await p.goto("about:blank");
for (const url of urls) {
  const result = await p.evaluate(async ({ url, username, credential }) => {
    const ice = [{ urls: url, username, credential }];
    const a = new RTCPeerConnection({ iceServers: ice, iceTransportPolicy: "relay" });
    const c = new RTCPeerConnection({ iceServers: ice, iceTransportPolicy: "relay" });
    a.onicecandidate = (e) => e.candidate && c.addIceCandidate(e.candidate).catch(() => {});
    c.onicecandidate = (e) => e.candidate && a.addIceCandidate(e.candidate).catch(() => {});
    const errors = [];
    a.onicecandidateerror = (e) => errors.push(`${e.errorCode} ${e.errorText}`);
    const ch = a.createDataChannel("x");
    const t0 = performance.now();
    await a.setLocalDescription(await a.createOffer()); await c.setRemoteDescription(a.localDescription);
    await c.setLocalDescription(await c.createAnswer()); await a.setRemoteDescription(c.localDescription);
    const ok = await new Promise((r) => { ch.onopen = () => r(true); setTimeout(() => r(false), 12000); });
    const ms = Math.round(performance.now() - t0);
    a.close(); c.close();
    return { ok, ms, errors: [...new Set(errors)].slice(0, 2) };
  }, { url, username: env.NEXT_PUBLIC_TURN_USERNAME, credential: env.NEXT_PUBLIC_TURN_CREDENTIAL });
  console.log(`${url.replace(/^(turns?:[^:]+).*?(\?.*)?$/, (m) => m)}  ->  ${result.ok ? `relay works (${result.ms} ms)` : "FAILED"} ${result.errors.length ? JSON.stringify(result.errors) : ""}`);
}
await b.close();
