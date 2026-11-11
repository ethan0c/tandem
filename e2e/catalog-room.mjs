// Verifies that an episode opened from the anime viewer reaches both room participants.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true, args: [
  "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream",
] });
const roomId = `catalog-${Date.now().toString(36)}`;
const episode = "av-mkissa-sub-1";
const watched = new Map();

async function participant(name, withEpisode) {
  const context = await browser.newContext({ permissions: ["camera", "microphone"] });
  await context.route("**/api/content?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("unit") !== episode) return route.continue();
    watched.set(name, url.searchParams);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      source: "MKissa", sourceId: "16498", credit: "Test video", sourceUrl: "https://mkissa.to/",
      unit: { id: episode, number: 1, label: "Episode 1", title: "", language: "ja", group: "Sub" },
      streams: [{ url: "https://video.example/episode.mp4", type: "video/mp4", label: "MP4" }],
    }) });
  });
  const page = await context.newPage();
  const query = withEpisode ? "?media=7442&kind=anime&title=Attack%20on%20Titan&unit=av-mkissa-sub-1&sourceId=16498" : "";
  await page.goto(`${base}/room/${roomId}${query}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Join room" }).click();
  await page.waitForFunction(() => document.querySelector("video.object-contain")?.getAttribute("src") === "https://video.example/episode.mp4", null, { timeout: 30000 });
  return { page, context };
}

let host, guest;
try {
  host = await participant("Host", true);
  guest = await participant("Guest", false);
  for (const name of ["Host", "Guest"]) {
    const query = watched.get(name);
    assert.equal(query?.get("id"), "7442");
    assert.equal(query?.get("unit"), episode);
    assert.equal(query?.get("sourceId"), "16498");
  }
  console.log("PASS: selected catalog episode reaches host and guest through validated room state.");
} finally {
  await guest?.context.close();
  await host?.context.close();
  await browser.close();
}
