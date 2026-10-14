import { chromium } from "playwright";
const relayOnly = process.argv[2] === "relay";
const b = await chromium.launch({ channel: "chrome", args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const room = "rl-" + Date.now().toString(36);
const logs = [];
async function open(name) {
  const ctx = await b.newContext({ permissions: ["camera", "microphone"] });
  await ctx.addInitScript((relayOnly) => {
    window.__pcs = [];
    const PC = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends PC { constructor(c = {}) { super(relayOnly ? { ...c, iceTransportPolicy: "relay" } : c); window.__pcs.push(this); } };
  }, relayOnly);
  const p = await ctx.newPage();
  p.on("console", (m) => m.text().startsWith("[tandem]") && logs.push(`${name}: ${m.text()}`));
  await p.goto("http://localhost:3000/room/" + room);
  await p.waitForFunction(() => { const x = document.querySelector('button[aria-label*="microphone"]'); return x && !x.disabled; });
  await p.getByLabel("Your name").fill(name); await p.getByRole("button", { name: "Join room", exact: true }).click();
  return p;
}
const a = await open("Alice"); const bp = await open("Bob");
await a.waitForFunction(() => [...document.querySelectorAll("video.object-cover")].some((v) => !v.muted && v.videoWidth > 0), null, { timeout: 30000 });
await a.waitForTimeout(6000);
const cap = await a.evaluate(() => { const pc = window.__pcs.find((p) => p.connectionState === "connected"); const s = pc.getSenders().find((x) => x.track?.kind === "video"); const e = s.getParameters().encodings[0]; return `maxBitrate=${e.maxBitrate} scaleDown=${e.scaleResolutionDownBy}`; });
console.log(relayOnly ? "RELAY:" : "DIRECT:", logs.join(" | "), "| Alice camera", cap);
await b.close();
