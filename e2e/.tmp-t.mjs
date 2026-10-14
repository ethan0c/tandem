import { chromium } from "playwright";
const b = await chromium.launch({ channel: "chrome", args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const spy = () => {
  window.__t = {}; const mark = (k) => { if (!(k in window.__t)) window.__t[k] = performance.timeOrigin + performance.now(); };
  window.__mark = mark;
  const PC = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends PC {
    constructor(...a) { super(...a); mark("pc created");
      this.addEventListener("icegatheringstatechange", () => mark("gathering " + this.iceGatheringState));
      this.addEventListener("connectionstatechange", () => mark("pc " + this.connectionState));
      this.addEventListener("track", () => mark("track"));
      const sld = this.setLocalDescription.bind(this); this.setLocalDescription = async (d) => { const r = await sld(d); mark("local " + (d?.type ?? this.localDescription?.type)); return r; };
      const srd = this.setRemoteDescription.bind(this); this.setRemoteDescription = async (d) => { mark("remote " + d.type); return srd(d); };
    }
  };
  const iv = setInterval(() => { for (const v of document.querySelectorAll("video.object-cover")) if (!v.muted && v.videoWidth > 0) { mark("remote frame"); clearInterval(iv); } }, 20);
};
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
for (let run = 0; run < 3; run++) {
  const a = await open("Alice"); await a.getByRole("button", { name: "Join room", exact: true }).click();
  await a.locator('button[aria-label="View participants"]').waitFor(); await a.waitForTimeout(1000);
  const bp = await open("Bob"); const t0 = Date.now();
  await bp.getByRole("button", { name: "Join room", exact: true }).click();
  await Promise.all([a, bp].map((p) => p.waitForFunction(() => "remote frame" in window.__t, null, { timeout: 30000 })));
  for (const [n, p] of [["Alice", a], ["Bob", bp]]) {
    const t = await p.evaluate(() => window.__t);
    console.log(run, n, Object.entries(t).filter(([, v]) => v >= 0).sort((x, y) => x[1] - y[1]).map(([k, v]) => `${k}@${Math.round(v - t0)}`).join("  "));
  }
  await a.context().close(); await bp.context().close();
}
await b.close();
