// End-to-end: two browsers join a room, the call connects, one shares a tab, a late joiner sees it.
// Drives the installed Google Chrome with fake camera/mic and an auto-picked capture source.
//
//   BASE_URL=http://localhost:3000 node e2e/room.mjs
//
// Exits non-zero on the first failed step and prints what each browser saw.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const HEADLESS = process.env.HEADED !== "1";
const STEP_MS = Number(process.env.STEP_TIMEOUT ?? 25_000);
const roomId = `e2e-${Date.now().toString(36)}`;
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
  page.evaluate(() =>
    window.__pcs.map((pc) => ({
      conn: pc.connectionState,
      ice: pc.iceConnectionState,
      sig: pc.signalingState,
      senders: pc.getSenders().filter((s) => s.track).length,
      receivers: pc.getReceivers().filter((r) => r.track?.readyState === "live").length,
    })),
  );
const liveVideos = (page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll("video")).map((v) => ({
      muted: v.muted,
      w: v.videoWidth,
      h: v.videoHeight,
      paused: v.paused,
      tracks: v.srcObject?.getTracks().map((t) => `${t.kind}:${t.readyState}`) ?? [],
    })),
  );

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

// The sharer asks for a capture as large as their display (× DPR), so the display size decides
// the ceiling. Default to a 4K display.
const SCREEN_W = Number(process.env.SCREEN_W ?? 3840);
const SCREEN_H = Number(process.env.SCREEN_H ?? 2160);

async function open(name) {
  const ctx = await browser.newContext({
    permissions: ["camera", "microphone"],
    viewport: { width: 1280, height: 720 },
    screen: { width: SCREEN_W, height: SCREEN_H },
  });
  await ctx.addInitScript(pcSpy);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => log(name, `pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") log(name, `console.error: ${m.text()}`);
  });
  await page.goto(`${BASE}/room/${roomId}`, { waitUntil: "domcontentloaded" });
  await join(page, name);
  return page;
}

/** Fill the name once React has hydrated (the mic button enables after getUserMedia resolves). */
async function join(page, name) {
  await page.waitForFunction(() => {
    const b = document.querySelector('button[aria-label*="microphone"]');
    return b && !b.disabled;
  }, null, { timeout: STEP_MS });
  await page.getByPlaceholder("What should we call you?").fill(name);
  await page.getByRole("button", { name: "Join room" }).click();
}

const sessions = [];
try {
  // The tab that gets shared: a title the picker flag can match, with something moving in it.
  // 4K by default, to prove the share is not downscaled on the way to viewers. Chrome captures a
  // tab at exactly the requested size, so the expected size is min(tab, sharer's display).
  const SHARE_W = Number(process.env.SHARE_W ?? 3840);
  const SHARE_H = Number(process.env.SHARE_H ?? 2160);
  const EXPECT_W = Math.min(SHARE_W, SCREEN_W);
  const EXPECT_H = Math.min(SHARE_H, SCREEN_H);
  const shareCtx = await browser.newContext({ viewport: { width: SHARE_W, height: SHARE_H } });
  const sharePage = await shareCtx.newPage();
  await sharePage.setContent(
    `<title>${SHARE_TITLE}</title><body style="margin:0;background:#123"><div id="b" style="width:200px;height:200px;background:#f0f"></div>
     <script>let i=0;setInterval(()=>{b.style.transform='translateX('+((i+=7)%600)+'px)'},33)</script>`,
  );

  let alice, bob;
  await step("Alice and Bob join the room", async () => {
    [alice, bob] = await Promise.all([open("Alice"), open("Bob")]);
    sessions.push(alice, bob);
    for (const p of [alice, bob]) await p.getByText("Ready", { exact: true }).waitFor({ timeout: STEP_MS });
  });

  await step("Both see two members", async () => {
    for (const p of [alice, bob]) {
      await p.waitForFunction(() => document.querySelectorAll("header span[title]").length === 2, null, { timeout: STEP_MS });
    }
  });

  await step("Call connects (RTCPeerConnection connected on both sides)", async () => {
    for (const p of [alice, bob]) {
      await p.waitForFunction(() => window.__pcs.some((pc) => pc.connectionState === "connected"), null, { timeout: STEP_MS });
    }
  });

  await step("Both see the partner's camera (a live unmuted <video> with pixels)", async () => {
    for (const p of [alice, bob]) {
      await p.waitForFunction(
        () => Array.from(document.querySelectorAll("video")).some((v) => !v.muted && v.videoWidth > 0 && !v.paused),
        null,
        { timeout: STEP_MS },
      );
      await p.getByText("Waiting for your partner…").waitFor({ state: "detached", timeout: 2_000 });
    }
  });

  await step("Alice shares a tab", async () => {
    await alice.getByRole("button", { name: "Choose a video" }).click();
    await alice.getByRole("button", { name: "Choose a tab to share" }).click();
    await alice.getByText("You’re sharing").waitFor({ timeout: STEP_MS });
  });

  await step("Bob sees Alice's share playing", async () => {
    await bob.getByText("is sharing").waitFor({ timeout: STEP_MS });
    await bob.waitForFunction(
      () => Array.from(document.querySelectorAll("video")).some((v) => !v.muted && v.videoWidth > 300 && !v.paused),
      null,
      { timeout: STEP_MS },
    );
    await bob.getByText("Connecting to").waitFor({ state: "detached", timeout: 2_000 });
  });

  await step(`Bob receives the share at ${EXPECT_W}×${EXPECT_H} (tab ${SHARE_W}×${SHARE_H}, display ${SCREEN_W}×${SCREEN_H})`, async () => {
    // The stage <video> is the only one with object-contain; camera tiles use object-cover.
    const dims = () =>
      bob.evaluate(() => {
        const v = document.querySelector("video.object-contain");
        return v ? [v.videoWidth, v.videoHeight] : [0, 0];
      });
    const minW = Math.floor(EXPECT_W * 0.9);
    const t0 = Date.now();
    let w = 0;
    let h = 0;
    while (Date.now() - t0 < STEP_MS) {
      [w, h] = await dims();
      log("Bob", `share at ${w}×${h} after ${Date.now() - t0}ms`);
      if (w >= minW) break;
      await bob.waitForTimeout(3000);
    }
    const stats = await bob.evaluate(async () => {
      // The connection that carries the stage video's track (not the camera call).
      const track = document.querySelector("video.object-contain")?.srcObject?.getVideoTracks()[0];
      const pc = window.__pcs.find((p) => p.getReceivers().some((r) => r.track === track));
      if (!pc) return null;
      const out = [];
      for (const s of (await pc.getStats()).values()) {
        if (s.type === "inbound-rtp" && s.kind === "video") out.push({ w: s.frameWidth, h: s.frameHeight, fps: s.framesPerSecond, bytes: s.bytesReceived, codec: s.codecId });
        if (s.type === "codec") out.push({ id: s.id, mime: s.mimeType });
      }
      return out;
    });
    log("Bob", `inbound stats: ${JSON.stringify(stats)}`);
    const sdp = await alice.evaluate(() =>
      window.__pcs
        .filter((p) => p.connectionState === "connected")
        .map((p) => ({
          offer: p.localDescription?.sdp.split("\n").find((l) => l.startsWith("m=video")),
          answer: p.remoteDescription?.sdp.split("\n").find((l) => l.startsWith("m=video")),
          pts: Object.fromEntries(
            (p.localDescription?.sdp.match(/a=rtpmap:\d+ \S+/g) ?? []).map((l) => l.slice(9).split(" ")),
          ),
        })),
    );
    log("Alice", `video m-lines: ${JSON.stringify(sdp)}`);
    if (w < minW) throw new Error(`received ${w}×${h}, wanted ≥ ${minW} wide`);
    if (w > EXPECT_W || h > EXPECT_H) throw new Error(`received ${w}×${h}: larger than the ${EXPECT_W}×${EXPECT_H} ceiling`);
    log("Bob", `share arrives at ${w}×${h}`);
  });

  await step("Carol joins late and sees the share too", async () => {
    const carol = await open("Carol");
    sessions.push(carol);
    await carol.getByText("Ready", { exact: true }).waitFor({ timeout: STEP_MS });
    await carol.getByText("is sharing").waitFor({ timeout: STEP_MS });
    await carol.waitForFunction(
      () => Array.from(document.querySelectorAll("video")).some((v) => !v.muted && v.videoWidth > 300 && !v.paused),
      null,
      { timeout: STEP_MS },
    );
    // Her call to Alice and Bob must connect as well (two pcs).
    await carol.waitForFunction(() => window.__pcs.filter((pc) => pc.connectionState === "connected").length >= 2, null, {
      timeout: STEP_MS,
    });
  });

  await step("Alice stops sharing; viewers return to the empty state", async () => {
    await alice.getByRole("button", { name: "Stop sharing" }).click();
    for (const p of sessions) await p.getByText("Nothing playing yet").waitFor({ timeout: STEP_MS });
  });

  await step("Bob reloads and reconnects; Alice still sees him", async () => {
    await bob.reload({ waitUntil: "domcontentloaded" });
    await join(bob, "Bob");
    await bob.getByText("Ready", { exact: true }).waitFor({ timeout: STEP_MS });
    for (const p of [alice, bob]) {
      await p.waitForFunction(
        () => Array.from(document.querySelectorAll("video")).some((v) => !v.muted && v.videoWidth > 0 && !v.paused),
        null,
        { timeout: STEP_MS },
      );
    }
  });
} catch {
  /* reported by step() */
} finally {
  for (const [i, p] of sessions.entries()) {
    const who = ["Alice", "Bob", "Carol"][i];
    try {
      log(who, `pcs=${JSON.stringify(await pcStates(p))}`);
      log(who, `videos=${JSON.stringify(await liveVideos(p))}`);
      log(who, `status text: ${JSON.stringify(await p.locator("header").innerText().catch(() => "?"))}`);
      if (failed) await p.screenshot({ path: `e2e/out-${who}.png` }).catch(() => {});
    } catch {}
  }
  await browser.close();
  console.log(failed ? "\nE2E FAILED" : "\nE2E PASSED");
  process.exit(failed ? 1 : 0);
}
