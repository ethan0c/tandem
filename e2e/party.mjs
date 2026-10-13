// End-to-end: a four-person watch party. Three people join and connect to each other, one shares a
// tab, everyone sees it and the others' cameras; then they chat, unread counts show up, and a late
// joiner can read what was said before they arrived.
//
//   BASE_URL=http://localhost:3000 node e2e/party.mjs
//
// Drives the installed Google Chrome with fake camera/mic and an auto-picked capture source.
// Exits non-zero on the first failed step and prints what each browser saw.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const HEADLESS = process.env.HEADED !== "1";
const STEP_MS = Number(process.env.STEP_TIMEOUT ?? 30_000);
const roomId = `party-${Date.now().toString(36)}`;
const SHARE_TITLE = `tandem-share-${roomId}`;

const log = (who, msg) => console.log(`${new Date().toISOString().slice(11, 23)} [${who}] ${msg}`);
let failed = false;
async function step(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    log("ok", `${name} (${Date.now() - t0}ms)`);
  } catch (e) {
    failed = true;
    log("FAIL", `${name}: ${e?.message ?? e}`);
    throw e;
  }
}

// Records every RTCPeerConnection so the test can inspect connection states.
const pcSpy = `
  window.__pcs = [];
  const Orig = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends Orig {
    constructor(...a) { super(...a); window.__pcs.push(this); }
  };
`;
const pcStates = (page) =>
  page.evaluate(() => window.__pcs.map((pc) => ({ conn: pc.connectionState, ice: pc.iceConnectionState })));
/** Camera tiles use object-cover; the shared stage is the only object-contain video. */
const liveCameras = (page) =>
  page.evaluate(
    () => Array.from(document.querySelectorAll("video.object-cover")).filter((v) => !v.muted && v.videoWidth > 0 && !v.paused).length,
  );
const chatTexts = (page) =>
  page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="chat-message"] p')).map((p) => p.textContent));
const waitChat = (page, texts) =>
  page.waitForFunction(
    (want) => JSON.stringify(Array.from(document.querySelectorAll('[data-testid="chat-message"] p')).map((p) => p.textContent)) === JSON.stringify(want),
    texts,
    { timeout: STEP_MS },
  );
const unread = (page) => page.getByTestId("chat-unread").textContent().catch(() => null);
/** The top bar hides while the mouse is idle during playback; a nudge brings it back. */
async function wake(page) {
  await page.mouse.move(600, 400);
  await page.mouse.move(620, 410);
}
async function openChat(page) {
  await wake(page);
  await page.getByRole("button", { name: "Open chat" }).click();
  await page.getByRole("heading", { name: "Chat" }).waitFor({ timeout: 5_000 });
}

const browser = await chromium.launch({
  channel: "chrome",
  headless: HEADLESS,
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    `--auto-select-tab-capture-source-by-title=${SHARE_TITLE}`,
    `--auto-select-desktop-capture-source=${SHARE_TITLE}`,
    "--autoplay-policy=no-user-gesture-required",
  ],
});

async function open(name) {
  const ctx = await browser.newContext({ permissions: ["camera", "microphone"], viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(pcSpy);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => log(name, `pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") log(name, `console.error: ${m.text()}`);
  });
  await page.goto(`${BASE}/room/${roomId}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const b = document.querySelector('button[aria-label*="microphone"]');
    return b && !b.disabled;
  }, null, { timeout: STEP_MS });
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Join room" }).click();
  await page.getByText("Ready", { exact: true }).waitFor({ timeout: STEP_MS });
  return page;
}

const people = new Map();
try {
  // The tab that gets shared: a title the picker flag can match, with something moving in it.
  const shareCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const sharePage = await shareCtx.newPage();
  await sharePage.setContent(
    `<title>${SHARE_TITLE}</title><body style="margin:0;background:#123"><div id="b" style="width:200px;height:200px;background:#f0f"></div>
     <script>let i=0;setInterval(()=>{b.style.transform='translateX('+((i+=7)%600)+'px)'},33)</script>`,
  );

  let alice, bob, carol, dave;
  await step("Alice, Bob and Carol join the room", async () => {
    [alice, bob, carol] = await Promise.all([open("Alice"), open("Bob"), open("Carol")]);
    people.set("Alice", alice).set("Bob", bob).set("Carol", carol);
  });

  await step("Everyone sees three members", async () => {
    for (const p of [alice, bob, carol]) {
      await p.waitForFunction(() => document.querySelectorAll("header span[title]").length === 3, null, { timeout: STEP_MS });
    }
  });

  await step("The call connects as a mesh: each person has two connected peers", async () => {
    for (const p of [alice, bob, carol]) {
      await p.waitForFunction(() => window.__pcs.filter((pc) => pc.connectionState === "connected").length >= 2, null, { timeout: STEP_MS });
    }
  });

  await step("Each person sees the other two cameras in the call", async () => {
    for (const p of [alice, bob, carol]) {
      await p.waitForFunction(
        () => Array.from(document.querySelectorAll("video.object-cover")).filter((v) => !v.muted && v.videoWidth > 0 && !v.paused).length >= 2,
        null,
        { timeout: STEP_MS },
      );
    }
  });

  await step("Alice shares a tab and both others see it playing", async () => {
    await alice.getByRole("button", { name: "Choose a video" }).click();
    await alice.getByRole("button", { name: "Choose a tab to share" }).click();
    await alice.getByText("You’re sharing").waitFor({ timeout: STEP_MS });
    for (const p of [bob, carol]) {
      await p.getByText("is sharing").waitFor({ timeout: STEP_MS });
      await p.waitForFunction(
        () => Array.from(document.querySelectorAll("video.object-contain")).some((v) => !v.muted && v.videoWidth > 300 && !v.paused),
        null,
        { timeout: STEP_MS },
      );
    }
  });

  await step("Bob opens the chat with the keyboard and sends a message", async () => {
    await bob.keyboard.press("c");
    await bob.getByRole("heading", { name: "Chat" }).waitFor({ timeout: 5_000 });
    // The box is focused on open, so he can just type.
    await bob.keyboard.type("GOAL!!!");
    await bob.keyboard.press("Enter");
    await waitChat(bob, ["GOAL!!!"]);
    if ((await bob.getByLabel("Message").inputValue()) !== "") throw new Error("box not cleared after sending");
  });

  await step("Alice and Carol see an unread badge, and the message once they open the chat", async () => {
    for (const p of [alice, carol]) {
      await p.getByTestId("chat-unread").waitFor({ timeout: STEP_MS });
      if ((await unread(p)) !== "1") throw new Error(`badge shows ${await unread(p)}`);
      await openChat(p);
      await waitChat(p, ["GOAL!!!"]);
      await p.getByTestId("chat-unread").waitFor({ state: "detached", timeout: 2_000 });
    }
  });

  await step("Messages arrive for everyone in the same order", async () => {
    await carol.getByLabel("Message").fill("no way, offside?");
    await carol.getByRole("button", { name: "Send" }).click();
    await alice.getByLabel("Message").fill("VAR says it stands 🎉");
    await alice.keyboard.press("Enter");
    const want = ["GOAL!!!", "no way, offside?", "VAR says it stands 🎉"];
    for (const p of [alice, bob, carol]) await waitChat(p, want);
  });

  await step("Senders are labelled: your own lines say You, others show their name", async () => {
    const labels = await bob.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid="chat-message"]')).map((li) => li.querySelector("span")?.textContent ?? null),
    );
    if (JSON.stringify(labels) !== JSON.stringify(["You", "Carol", "Alice"])) throw new Error(`labels: ${JSON.stringify(labels)}`);
  });

  await step("Blank messages are not sent, and the text is cleaned up", async () => {
    await bob.getByLabel("Message").fill("   ");
    await bob.keyboard.press("Enter");
    await bob.getByLabel("Message").fill("  spaced out  ");
    await bob.keyboard.press("Enter");
    await waitChat(alice, ["GOAL!!!", "no way, offside?", "VAR says it stands 🎉", "spaced out"]);
  });

  await step("Typing in the chat does not trigger player shortcuts", async () => {
    const before = await bob.evaluate(() => document.fullscreenElement !== null);
    await bob.getByLabel("Message").click();
    await bob.keyboard.type("f");
    await bob.waitForTimeout(300);
    if ((await bob.evaluate(() => document.fullscreenElement !== null)) !== before) throw new Error("the f key toggled fullscreen while typing");
    await bob.getByLabel("Message").fill("");
  });

  await step("Escape closes the chat; the badge counts what arrives while it is closed", async () => {
    await bob.getByLabel("Message").press("Escape");
    await bob.getByRole("button", { name: "Open chat" }).waitFor({ timeout: 2_000 });
    await carol.getByLabel("Message").fill("replay incoming");
    await carol.keyboard.press("Enter");
    await carol.getByLabel("Message").fill("look at the keeper");
    await carol.keyboard.press("Enter");
    await bob.waitForFunction(() => document.querySelector('[data-testid="chat-unread"]')?.textContent === "2", null, { timeout: STEP_MS });
  });

  await step("Dave joins late and can read the whole conversation", async () => {
    dave = await open("Dave");
    people.set("Dave", dave);
    await dave.getByText("is sharing").waitFor({ timeout: STEP_MS });
    await openChat(dave);
    await waitChat(dave, ["GOAL!!!", "no way, offside?", "VAR says it stands 🎉", "spaced out", "replay incoming", "look at the keeper"]);
    // And his call connects to all three of them.
    await dave.waitForFunction(() => window.__pcs.filter((pc) => pc.connectionState === "connected").length >= 3, null, { timeout: STEP_MS });
    for (const p of [alice, bob, carol]) {
      await p.waitForFunction(() => document.querySelectorAll("header span[title]").length === 4, null, { timeout: STEP_MS });
    }
  });

  await step("With four people, each sees three cameras in the 2×2 grid", async () => {
    for (const [who, p] of people) {
      await p.waitForFunction(
        () => Array.from(document.querySelectorAll("video.object-cover")).filter((v) => !v.muted && v.videoWidth > 0 && !v.paused).length >= 3,
        null,
        { timeout: STEP_MS },
      );
      log(who, `cameras=${await liveCameras(p)} pcs=${JSON.stringify(await pcStates(p))}`);
    }
  });

  await step("A reconnect keeps the chat (Bob reloads and sees the history)", async () => {
    await bob.reload({ waitUntil: "domcontentloaded" });
    await bob.getByRole("link", { name: "Leave room", exact: true }).waitFor({ timeout: STEP_MS });
    await bob.getByText("Ready", { exact: true }).waitFor({ timeout: STEP_MS });
    await openChat(bob);
    await bob.waitForFunction(() => document.querySelectorAll('[data-testid="chat-message"]').length === 6, null, { timeout: STEP_MS });
    log("Bob", `after reload: ${JSON.stringify(await chatTexts(bob))}`);
  });
} catch {
  /* reported by step() */
} finally {
  for (const [who, p] of people) {
    try {
      log(who, `pcs=${JSON.stringify(await pcStates(p))} cameras=${await liveCameras(p)} chat=${JSON.stringify(await chatTexts(p))}`);
      if (failed) await p.screenshot({ path: `e2e/out-party-${who}.png` }).catch(() => {});
    } catch {}
  }
  await browser.close();
  console.log(failed ? "\nPARTY E2E FAILED" : "\nPARTY E2E PASSED");
  process.exit(failed ? 1 : 0);
}
