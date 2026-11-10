// Real source data and media: solo reading, shared pages, native video, and synced watch rooms.
import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const a = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  permissions: ["camera", "microphone"],
});
const b = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  permissions: ["camera", "microphone"],
});
const p = await a.newPage(),
  q = await b.newPage();
const errors = [];
for (const page of [p, q])
  page.on("pageerror", (error) => errors.push(error.message));
async function imageReady(page) {
  await page
    .locator(".reader-page img:visible")
    .first()
    .waitFor({ timeout: 30000 });
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll(".reader-page img")].find(
        (e) => e.getBoundingClientRect().height > 0,
      )?.naturalWidth > 0,
  );
}
async function joinReader(page, name) {
  await page.getByRole("textbox", { name: "Your name" }).fill(name);
  await page.getByRole("button", { name: "Join reading room" }).click();
  await imageReady(page);
}
async function joinWatch(page, name) {
  await page.getByRole("textbox", { name: "Your name" }).fill(name);
  await page.getByRole("button", { name: "Join room", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector("video.object-contain")?.readyState >= 1,
    null,
    { timeout: 60000 },
  );
}
try {
  await p.goto(`${base}/play/manga/24249?unit=ubunchu-12`);
  await imageReady(p);
  await p.getByRole("button", { name: "Next page", exact: true }).click();
  assert.equal(
    await p.getByRole("spinbutton", { name: "Page number" }).inputValue(),
    "2",
  );
  await p.waitForFunction(() =>
    JSON.parse(localStorage.getItem("tandem:library:v1") || "[]").some(
      (e) => e.media.id === "24249" && e.readingPosition?.page === 1,
    ),
  );
  await p.reload();
  await imageReady(p);
  assert.equal(
    await p.getByRole("spinbutton", { name: "Page number" }).inputValue(),
    "2",
  );
  console.log(
    "PASS: real manga pages, next page, saved reading position, and reload resume on mobile.",
  );
  await p.getByRole("button", { name: "Read together", exact: true }).click();
  await joinReader(p, "Reader A");
  await q.goto(p.url().split("?")[0]);
  await joinReader(q, "Reader B");
  await p.getByRole("button", { name: "Next page", exact: true }).click();
  await q.waitForFunction(
    () =>
      document.querySelector('input[aria-label="Page number"]')?.value === "2",
  );
  await p.getByRole("button", { name: "Anyone turns pages" }).click();
  await q.waitForFunction(
    () => document.querySelector('button[aria-label="Next page"]')?.disabled,
  );
  await q.getByRole("button", { name: "Reading in sync" }).click();
  await q.getByRole("button", { name: "Next page", exact: true }).click();
  assert.equal(
    await q.getByRole("spinbutton", { name: "Page number" }).inputValue(),
    "3",
  );
  assert.equal(
    await p.getByRole("spinbutton", { name: "Page number" }).inputValue(),
    "2",
  );
  console.log(
    "PASS: late join loads the same provider chapter; shared pages, host lock, and independent reading.",
  );
  await p.goto(`${base}/play/anime/4650`);
  await p.waitForFunction(
    () => document.querySelector("video")?.readyState >= 1,
    null,
    { timeout: 60000 },
  );
  assert.equal(await p.locator("video").evaluate((v) => v.playsInline), true);
  await p.locator("video").evaluate((v) => v.play());
  await p.waitForFunction(
    () => document.querySelector("video")?.currentTime > 1,
  );
  console.log(
    "PASS: real native video playback with playsInline at phone width.",
  );
  await p.getByRole("button", { name: "Watch together", exact: true }).click();
  await joinWatch(p, "Watcher A");
  await q.goto(p.url().split("?")[0]);
  await joinWatch(q, "Watcher B");
  await p.getByRole("button", { name: "Play", exact: true }).click();
  await q.waitForFunction(
    () => {
      const v = document.querySelector("video.object-contain");
      return v && !v.paused && v.currentTime > 0.5;
    },
    null,
    { timeout: 15000 },
  );
  await p.getByRole("button", { name: "Pause", exact: true }).click();
  await q.waitForFunction(
    () => document.querySelector("video.object-contain")?.paused,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: direct stream reaches a late-joining watch room and play/pause synchronize between mobile and desktop.",
  );
} finally {
  await browser.close();
}
