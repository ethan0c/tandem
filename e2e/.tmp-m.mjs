import { chromium } from "playwright";
const pick = Number(process.argv[2]);
const TITLE = "share-" + Date.now().toString(36);
const b = await chromium.launch({ channel: "chrome", args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--auto-select-tab-capture-source-by-title=${TITLE}`, "--autoplay-policy=no-user-gesture-required"] });
const tab = await (await b.newContext()).newPage();
await tab.setContent(`<title>${TITLE}</title><body style="background:#123"><div id=b style="width:200px;height:200px;background:#f0f"></div><script>let i=0;setInterval(()=>{b.style.transform='translateX('+((i+=7)%600)+'px)'},33)</script>`);
const room = "m-" + Date.now().toString(36);
async function open(name) {
  const ctx = await b.newContext({ permissions: ["camera", "microphone"] });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000/room/" + room);
  await p.waitForFunction(() => { const x = document.querySelector('button[aria-label*="microphone"]'); return x && !x.disabled; });
  await p.getByLabel("Your name").fill(name);
  return p;
}
const a = await open("Alice"); await a.getByRole("button", { name: "Join room", exact: true }).click(); await a.waitForTimeout(800);
const bp = await open("Bob"); const t0 = Date.now();
await bp.getByRole("button", { name: "Join room", exact: true }).click();
const seen = (p) => p.waitForFunction(() => [...document.querySelectorAll("video.object-cover")].some((v) => !v.muted && v.videoWidth > 0), null, { timeout: 40000, polling: 20 }).then(() => Date.now() - t0);
const [ta, tb] = await Promise.all([seen(a), seen(bp)]);
// Frames of Alice's camera that Bob shows, per second.
const frames = () => bp.evaluate(() => [...document.querySelectorAll("video.object-cover")].find((v) => !v.muted && v.videoWidth > 0)?.getVideoPlaybackQuality().totalVideoFrames ?? 0);
await bp.waitForTimeout(2000);
let f0 = await frames(); await bp.waitForTimeout(2000); const before = (await frames() - f0) / 2;
await a.getByRole("button", { name: "Choose a video" }).click();
const opened = Date.now();
f0 = await frames();
await a.waitForTimeout(pick);
const during = (await frames() - f0) / (pick / 1000);
const t1 = Date.now();
await a.getByRole("button", { name: "Choose a tab to share" }).click();
await bp.waitForFunction(() => { const v = document.querySelector("video.object-contain"); return v && v.videoWidth > 0; }, null, { timeout: 30000, polling: 20 });
console.log(`call video: ${ta}/${tb} ms | Alice's camera at Bob: ${before.toFixed(0)} fps before, ${during.toFixed(0)} fps while warming | tab picked ${pick / 1000}s after opening: share at viewer in ${Date.now() - t1} ms`);
await b.close();
