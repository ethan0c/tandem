import { chromium } from "playwright";
const out = process.argv[2];
const b = await chromium.launch({ channel: "chrome" });
for (const [n, w, h] of [["desk", 1440, 900], ["mob", 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/${n}.png` });
}
await b.close();
