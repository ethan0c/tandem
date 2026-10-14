import { chromium } from "playwright";
const TITLE = "share-" + Date.now().toString(36);
const b = await chromium.launch({ channel: "chrome", args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--auto-select-tab-capture-source-by-title=${TITLE}`, "--autoplay-policy=no-user-gesture-required"] });
const tab = await (await b.newContext()).newPage();
await tab.setContent(`<title>${TITLE}</title><body style="background:#123"><div id=b style="width:200px;height:200px;background:#f0f"></div><script>let i=0;setInterval(()=>{b.style.transform='translateX('+((i+=7)%600)+'px)'},33)</script>`);
const room = "s-" + Date.now().toString(36);
async function open(name) {
  const ctx = await b.newContext({ permissions: ["camera", "microphone"] });
  const p = await ctx.newPage();
  await p.goto("http://localhost:3000/room/" + room);
  await p.waitForFunction(() => { const x = document.querySelector('button[aria-label*="microphone"]'); return x && !x.disabled; });
  await p.getByLabel("Your name").fill(name); await p.getByRole("button", { name: "Join room", exact: true }).click();
  return p;
}
const a = await open("Alice"); const bp = await open("Bob");
await bp.waitForFunction(() => [...document.querySelectorAll("video.object-cover")].some((v) => !v.muted && v.videoWidth > 0));
await a.getByRole("button", { name: "Choose a video" }).click();
const t0 = Date.now();
await a.getByRole("button", { name: "Choose a tab to share" }).click();
await bp.waitForFunction(() => { const v = document.querySelector("video.object-contain"); return v && v.videoWidth > 0; }, null, { timeout: 30000, polling: 20 });
console.log(`share first frame at viewer: ${Date.now() - t0}ms`);
await b.close();
