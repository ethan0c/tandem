// Regression: a preserved homepage must let users create another room.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});

try {
  const page = await browser.newPage();
  await page.goto(process.env.BASE_URL ?? "http://localhost:3000");
  const create = page.getByRole("button", { name: "Create a room", exact: true }).first();
  async function createRoom() {
    await create.waitFor();
    assert.equal(await create.isEnabled(), true);
    await create.click();
    await page.waitForURL("**/room/*");
    await page.getByRole("button", { name: "Join room", exact: true }).waitFor();
    return page.url();
  }

  const firstRoom = await createRoom();
  await page.getByRole("button", { name: "Join room", exact: true }).click();
  await page.getByRole("link", { name: "Leave room", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/");
  assert.notEqual(await createRoom(), firstRoom);

  // Browser Back also restores the cached homepage.
  await page.goBack();
  await page.waitForURL((url) => url.pathname === "/");
  await createRoom();
  console.log("PASS: create → leave → create again, and browser Back → create again");
} finally {
  await browser.close();
}
