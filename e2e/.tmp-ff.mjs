import { chromium } from "playwright";
const rows = [];
for (let run = 0; run < 3; run++) {
  const b = await chromium.launch({ channel: "chrome", args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const room = "ff-" + Date.now().toString(36);
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
  rows.push(`run ${run + 1}: ${ta} ms / ${tb} ms`);
  await b.close();
}
console.log(process.argv[2] + "\n" + rows.join("\n"));
