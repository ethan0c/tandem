import { chromium } from "playwright";
const spy = () => {
  window.__pcs = [];
  const PC = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends PC { constructor(...a) { super(...a); window.__pcs.push(this); } };
};
const results = [];
for (let run = 0; run < 3; run++) {
  const b = await chromium.launch({ channel: "chrome", args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const room = "t-" + Date.now().toString(36);
  async function open(name) {
    const ctx = await b.newContext({ permissions: ["camera", "microphone"] });
    await ctx.addInitScript(spy);
    const p = await ctx.newPage();
    await p.goto("http://localhost:3000/room/" + room);
    await p.waitForFunction(() => { const x = document.querySelector('button[aria-label*="microphone"]'); return x && !x.disabled; });
    await p.getByLabel("Your name").fill(name);
    return p;
  }
  const a = await open("Alice"); await a.getByRole("button", { name: "Join room", exact: true }).click(); await a.waitForTimeout(800);
  const bp = await open("Bob"); const t0 = Date.now();
  await bp.getByRole("button", { name: "Join room", exact: true }).click();
  await Promise.all([a, bp].map((p) => p.waitForFunction(() => [...document.querySelectorAll("video.object-cover")].some((v) => !v.muted && v.videoWidth > 0), null, { timeout: 30000, polling: 20 })));
  const ms = Date.now() - t0;
  const codec = await bp.evaluate(async () => { const pc = window.__pcs.find((p) => p.connectionState === "connected"); for (const r of (await pc.getStats()).values()) if (r.type === "codec" && r.mimeType.startsWith("video")) return r.mimeType; });
  results.push(`${codec} first frame both sides in ${ms}ms`);
  await b.close();
}
console.log(results.join("\n"));
