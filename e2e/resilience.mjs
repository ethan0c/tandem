// Resilience matrix: every way a connection or page can break × every room mode × who it happens to.
// Each case is its own room with fresh browsers. After the disruption, the same promises must hold:
// exactly the right people in the room (no ghosts), the call reconnected with live cameras, the share,
// file sync, chat and away status where they should be, and reactions still getting through.
//
//   BASE_URL=http://localhost:3000 node e2e/resilience.mjs
//   ONLY='share · reload' CONCURRENCY=2 HEADED=1 node e2e/resilience.mjs
//
// Network loss is simulated on the signalling socket (Playwright proxies it, so a test can cut or block
// it); WebRTC media itself is not cut, as Playwright cannot interrupt UDP.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 3);
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
const WAIT = Number(process.env.STEP_TIMEOUT ?? 30_000);
/** How long the server holds the seat of a page that vanished without a goodbye (RECONNECT_GRACE_MS + slack). */
const GHOST_WAIT = 80_000;
const RUN = Date.now().toString(36);
const SHARE_TITLE = `tandem-resilience-${RUN}`;
const VIDEO = pathJoin(tmpdir(), "tandem-e2e-120s.webm");
const OUT = pathJoin(tmpdir(), `tandem-resilience-${RUN}`);
mkdirSync(OUT, { recursive: true });

const log = (msg) => console.log(`${new Date().toISOString().slice(11, 23)} ${msg}`);

// A two-minute test video for the file mode, so no case runs off its end.
let haveVideo = existsSync(VIDEO);
if (!haveVideo) {
  try {
    execFileSync("ffmpeg", ["-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=15", "-t", "120", "-c:v", "libvpx", "-b:v", "150k", VIDEO]);
    haveVideo = true;
  } catch {
    log("ffmpeg not available: skipping the file cases");
  }
}

/** Runs in every page: counts peer connections and signalling sockets. */
const instrument = () => {
  window.__pcs = [];
  const PC = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends PC {
    constructor(...a) {
      super(...a);
      window.__pcs.push(this);
    }
  };
  window.__sockets = 0;
  const WS = window.WebSocket;
  window.WebSocket = class extends WS {
    constructor(url, ...rest) {
      super(url, ...rest);
      if (String(url).includes("/socket.io/")) window.__sockets++;
    }
  };
};

/** Make this page's goodbye go missing when it unloads, as on a crash or a dead connection. */
const loseGoodbye = (page) =>
  page.evaluate(() => {
    navigator.sendBeacon = () => false;
    addEventListener("pagehide", () => { window.WebSocket.prototype.send = () => {}; }, { capture: true });
  });

const browser = await chromium.launch({
  channel: "chrome",
  headless: process.env.HEADED !== "1",
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    `--auto-select-tab-capture-source-by-title=${SHARE_TITLE}`,
    `--auto-select-desktop-capture-source=${SHARE_TITLE}`,
    "--autoplay-policy=no-user-gesture-required",
  ],
});

// The tab everyone shares in share mode: a title the picker flag matches, with something moving.
const shareTab = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await shareTab.setContent(
  `<title>${SHARE_TITLE}</title><body style="margin:0;background:#123"><div id="b" style="width:200px;height:200px;background:#f0f"></div>
   <script>let i=0;setInterval(()=>{b.style.transform='translateX('+((i+=7)%600)+'px)'},33)</script>`,
);

/* ------------------------------------------------------------------ */
/* Participants                                                        */
/* ------------------------------------------------------------------ */

async function participant(name, path, roomId) {
  const ctx = await browser.newContext({ permissions: ["camera", "microphone"], viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(instrument);
  const p = { name, ctx, path, roomId, page: null, blocked: false, sockets: new Set(), errors: [] };
  // Every signalling socket goes through here, so the test can cut it or refuse new ones.
  await ctx.routeWebSocket(/\/socket\.io\//, (ws) => {
    if (p.blocked) {
      ws.close({ code: 1001, reason: "e2e: offline" }).catch(() => {});
      return;
    }
    // Forwarded by hand, so a socket can also go silent without closing: what a dropped Wi-Fi
    // connection looks like, where neither end finds out until the heartbeat says so.
    const entry = { ws, server: ws.connectToServer(), dead: false };
    ws.onMessage((m) => { if (!entry.dead) entry.server.send(m); });
    entry.server.onMessage((m) => { if (!entry.dead) ws.send(m); });
    p.sockets.add(entry);
  });
  await ctx.route(/\/socket\.io\/.*transport=polling/, (route) => (p.blocked ? route.abort("internetdisconnected") : route.continue()));
  /** Every current socket stops carrying anything, but stays open. */
  p.silence = () => {
    for (const entry of p.sockets) entry.dead = true;
    p.sockets.clear();
  };
  p.drop = async () => {
    const all = [...p.sockets];
    p.sockets.clear();
    for (const { ws, server } of all) {
      await ws.close({ code: 1001, reason: "e2e: network drop" }).catch(() => {});
      await server.close({ code: 1001, reason: "e2e: network drop" }).catch(() => {});
    }
  };
  p.newPage = async () => {
    p.page = await ctx.newPage();
    p.page.on("pageerror", (e) => p.errors.push(e.message));
    await p.page.goto(`${BASE}${path}${roomId}`, { waitUntil: "domcontentloaded" });
  };
  await p.newPage();
  await join(p);
  return p;
}

async function join(p) {
  const { page } = p;
  await page.waitForFunction(() => {
    const b = document.querySelector('button[aria-label*="microphone"]');
    return b && !b.disabled;
  }, null, { timeout: WAIT });
  await page.getByLabel("Your name").fill(p.name);
  await page.getByRole("button", { name: "Join room", exact: true }).click();
  await inRoom(p);
}

/** In the room: the participant list only exists once joined. A reload must get here on its own. */
const inRoom = (p) => p.page.locator('button[aria-label="View participants"]').first().waitFor({ timeout: WAIT });

const socketCount = (p) => p.page.evaluate(() => window.__sockets);
/** A new signalling socket, and the room joined on it (no connecting or reconnecting notice left). */
const reconnected = (p, before) =>
  p.page.waitForFunction(
    (n) => window.__sockets > n && !/Connection lost|Reconnecting…|Connecting…/.test(document.body.innerText),
    before,
    { timeout: WAIT },
  );

/** Exactly `n` people, a connected call to each of the others, and their cameras live on screen. */
async function healthy(p, n = 2, timeout = WAIT) {
  await p.page.waitForFunction(
    (n) => {
      const members = document.querySelectorAll('button[aria-label="View participants"] span[title]').length;
      const cameras = [...document.querySelectorAll("video.object-cover")].filter(
        (v) => !v.muted && v.videoWidth > 0 && !v.paused && v.srcObject?.getVideoTracks()[0]?.readyState === "live",
      ).length;
      const calls = window.__pcs.filter((pc) => pc.connectionState === "connected").length;
      return members === n && cameras >= n - 1 && calls >= n - 1;
    },
    n,
    { timeout },
  );
}

async function sendReaction(page) {
  const direct = page.getByRole("button", { name: "React with ❤️" });
  if (!(await direct.count())) await page.getByRole("button", { name: "Reactions", exact: true }).click();
  await direct.click();
}

/** A reaction from `from` floats on `to`'s screen. */
async function reactionArrives(from, to) {
  const seen = to.page.waitForFunction(() => document.querySelector(".reaction-float"), null, { timeout: 10_000 });
  await sendReaction(from.page);
  await seen;
}

async function diagnose(p) {
  try {
    return await p.page.evaluate(() => ({
      url: location.pathname,
      members: [...document.querySelectorAll('button[aria-label="View participants"] span[title]')].map((s) => s.title),
      pcs: window.__pcs.map((pc) => pc.connectionState),
      videos: [...document.querySelectorAll("video")].map((v) => `${v.className.split(" ")[0] || "-"}:${v.muted ? "m" : "u"}:${v.videoWidth}:${v.paused ? "p" : "r"}`),
      text: document.body.innerText.replace(/\s+/g, " ").slice(0, 300),
    }));
  } catch (e) {
    return `unavailable: ${e.message}`;
  }
}

/* ------------------------------------------------------------------ */
/* Disruptions                                                         */
/* ------------------------------------------------------------------ */

/** Pretend the tab went to the background (Playwright keeps real pages visible). */
const setHidden = (page, hidden) =>
  page.evaluate((hidden) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);

/** The same person opens the room again in a second tab of the same browser. */
async function duplicate(p) {
  const old = p.page;
  await p.newPage();
  await join(p);
  await old.getByText("Open in another tab").waitFor({ timeout: WAIT });
  return old;
}

/**
 * `lostPage`: the page is gone afterwards (local state such as a picked file must be redone).
 * `newSeat`: they come back as a new member rather than replacing their seat.
 * `endsShare`: a share they were running stops (defaults to `lostPage`).
 */
const DISRUPTIONS = {
  drop: {
    async run(p) {
      const n = await socketCount(p);
      await p.drop();
      await reconnected(p, n);
    },
  },
  dropTwice: {
    // The second drop lands while the first reconnect is still in its handshake.
    async run(p) {
      const n = await socketCount(p);
      await p.drop();
      await reconnected(p, n);
      await p.drop();
      await reconnected(p, n + 1);
    },
  },
  deadSocket: {
    // The connection dies silently. Only the heartbeat can tell; it must not take long.
    async run(p) {
      const n = await socketCount(p);
      const t0 = Date.now();
      p.silence();
      await reconnected(p, n);
      p.recoveredIn = Date.now() - t0;
      if (p.recoveredIn > 20_000) throw new Error(`took ${p.recoveredIn} ms to notice a dead connection`);
    },
  },
  networkChange: {
    // Switching networks: the old connection is dead, and the browser says offline, then online.
    // That is enough to know; no waiting for the heartbeat.
    async run(p) {
      const n = await socketCount(p);
      p.silence();
      await p.ctx.setOffline(true);
      await p.page.waitForTimeout(2_000);
      const t0 = Date.now();
      await p.ctx.setOffline(false);
      await reconnected(p, n);
      p.recoveredIn = Date.now() - t0;
      if (p.recoveredIn > 8_000) throw new Error(`took ${p.recoveredIn} ms to reconnect after the network came back`);
    },
  },
  outage5s: { run: (p) => outage(p, 5_000) },
  chatWhileAway: {
    // Typed while the connection is down: it must still arrive once back, not vanish.
    async run(p, c) {
      const n = await socketCount(p);
      p.blocked = true;
      await p.drop();
      const text = `while-away-${p.name}-${c.id}`;
      await p.page.getByRole("button", { name: /^Open chat/ }).click();
      await p.page.getByRole("textbox", { name: "Message", exact: true }).fill(text);
      await p.page.getByRole("button", { name: "Send", exact: true }).click();
      await closeChat(p.page);
      await p.page.waitForTimeout(3_000);
      p.blocked = false;
      await reconnected(p, n);
      for (const other of c.ps.filter((o) => o !== p)) {
        await other.page.getByRole("button", { name: /^Open chat/ }).click();
        await other.page.getByTestId("chat-message").filter({ hasText: text }).waitFor({ timeout: WAIT });
        await closeChat(other.page);
      }
    },
  },
  outage20s: { run: (p) => outage(p, 20_000) },
  offline: {
    async run(p) {
      const n = await socketCount(p);
      await p.ctx.setOffline(true);
      p.blocked = true;
      await p.drop();
      await p.page.waitForTimeout(6_000);
      p.blocked = false;
      await p.ctx.setOffline(false);
      await reconnected(p, n);
    },
  },
  reload: {
    lostPage: true,
    async run(p) {
      await p.page.reload({ waitUntil: "domcontentloaded" });
      await inRoom(p);
    },
  },
  reloadTwice: {
    lostPage: true,
    async run(p) {
      await p.page.reload({ waitUntil: "commit" });
      await p.page.reload({ waitUntil: "domcontentloaded" });
      await inRoom(p);
    },
  },
  reloadLostGoodbye: {
    lostPage: true,
    async run(p) {
      await loseGoodbye(p.page);
      await p.page.reload({ waitUntil: "domcontentloaded" });
      await inRoom(p);
    },
  },
  backForward: {
    lostPage: true,
    newSeat: true,
    async run(p) {
      await p.page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await p.page.waitForTimeout(500);
      await p.page.goBack({ waitUntil: "domcontentloaded" });
      await join(p);
    },
  },
  closeReopen: {
    lostPage: true,
    newSeat: true,
    async run(p) {
      await p.page.close();
      await p.newPage();
      await join(p);
    },
  },
  leaveRejoin: {
    lostPage: true,
    newSeat: true,
    async run(p) {
      await p.page.locator('[aria-label="Leave room"], [title="Leave room"]').first().click();
      await p.page.waitForURL(`${BASE}/`, { timeout: WAIT });
      await p.page.goto(`${BASE}${p.path}${p.roomId}`, { waitUntil: "domcontentloaded" });
      await join(p);
    },
  },
  hidden20s: {
    // Switched to another tab while the other person keeps reacting. Coming back must not burst.
    async run(p, c) {
      await setHidden(p.page, true);
      for (const other of c.ps.filter((o) => o !== p && !c.hits(o))) {
        for (let i = 0; i < 3; i++) await sendReaction(other.page).catch(() => {});
      }
      await p.page.waitForTimeout(20_000);
      await setHidden(p.page, false);
      // Anything older than a few seconds is gone by now, rather than all floating out at once.
      const piled = await p.page.evaluate(() => document.querySelectorAll(".reaction-float").length);
      if (piled) throw new Error(`${piled} reactions burst out on return`);
    },
  },
  frozen50s: {
    // Chrome's strongest background treatment: no timers, past the server's ping timeout. Whether the
    // socket survives or has to reconnect, coming back must be the same seat, not a new person.
    async run(p) {
      const n = await socketCount(p);
      const cdp = await p.ctx.newCDPSession(p.page);
      await cdp.send("Page.setWebLifecycleState", { state: "frozen" });
      await new Promise((r) => setTimeout(r, 50_000));
      await cdp.send("Page.setWebLifecycleState", { state: "active" });
      await p.page.waitForTimeout(2_000);
      if ((await socketCount(p)) > n) await reconnected(p, n);
    },
  },
  duplicateTab: {
    lostPage: true,
    newSeat: true,
    async run(p) {
      const old = await duplicate(p);
      await old.close();
    },
  },
  duplicateUseHere: {
    // Back to the first tab: it takes the call back and the newer one steps aside. It kept its own
    // state (a picked file, a running tab capture, which it shares again), but its seat is new.
    newSeat: true,
    endsShare: false,
    async run(p) {
      const old = await duplicate(p);
      const newer = p.page;
      p.page = old;
      await old.getByRole("button", { name: "Use here" }).click();
      await newer.getByText("Open in another tab").waitFor({ timeout: WAIT });
      await old.getByText("Open in another tab").waitFor({ state: "detached", timeout: WAIT });
      await newer.close();
    },
  },
  closeLostGoodbye: {
    // The old seat is a ghost until the server's reconnect grace runs out.
    lostPage: true,
    newSeat: true,
    slow: true,
    async run(p) {
      await loseGoodbye(p.page);
      await p.page.close();
      await p.newPage();
      await join(p);
    },
  },
};

async function outage(p, ms) {
  const n = await socketCount(p);
  p.blocked = true;
  await p.drop();
  await p.page.waitForTimeout(ms);
  p.blocked = false;
  await reconnected(p, n);
}

/* ------------------------------------------------------------------ */
/* Modes                                                               */
/* ------------------------------------------------------------------ */

/** The file player is the video playing a local file, as opposed to a live camera or share stream. */
const findPlayer = () => [...document.querySelectorAll("video")].find((v) => !v.srcObject && v.currentSrc.startsWith("blob:"));
const playback = (p) =>
  p.page.evaluate(`(() => {
    const v = (${findPlayer})();
    return v ? { t: v.currentTime, paused: v.paused, ready: v.readyState } : null;
  })()`);

const MODES = {
  idle: {
    paths: ["/room/", "/room/"],
    async setup([alice, bob], c) {
      c.message = `before-${c.id}`;
      await alice.page.getByRole("button", { name: "Open chat", exact: true }).click();
      await alice.page.getByRole("textbox", { name: "Message", exact: true }).fill(c.message);
      await alice.page.getByRole("button", { name: "Send", exact: true }).click();
      await bob.page.getByRole("button", { name: /^Open chat/ }).waitFor({ timeout: WAIT });
      await closeChat(alice.page);
    },
    async check(ps, c) {
      // The conversation so far survives, for whoever came back.
      for (const p of ps) {
        await p.page.getByRole("button", { name: /^Open chat/ }).click();
        await p.page.getByTestId("chat-message").filter({ hasText: c.message }).waitFor({ timeout: WAIT });
        await closeChat(p.page);
      }
    },
  },
  share: {
    paths: ["/room/", "/room/"],
    async setup([alice, bob]) {
      await alice.page.getByRole("button", { name: "Choose a video" }).click();
      await alice.page.getByRole("button", { name: "Choose a tab to share" }).click();
      await alice.page.getByText("You’re sharing").waitFor({ timeout: WAIT });
      await shareLive(bob);
    },
    async check([alice, bob], c) {
      if ((c.disruption.endsShare ?? c.disruption.lostPage) && c.hits(alice)) {
        // A share cannot outlive the page that captured it: everyone is back to choosing.
        for (const p of [alice, bob]) await p.page.getByText("Nothing playing yet").waitFor({ timeout: WAIT });
        return;
      }
      await shareLive(bob);
      if (!(await alice.page.getByRole("button", { name: "Stop sharing" }).count())) throw new Error("Alice is no longer sharing");
    },
  },
  file: {
    paths: ["/room/", "/room/"],
    skip: !haveVideo,
    async setup([alice, bob]) {
      await alice.page.getByRole("button", { name: "Choose a video" }).click();
      await alice.page.getByRole("button", { name: "Video file" }).click();
      await alice.page.locator('[role="dialog"] input[type="file"]').setInputFiles(VIDEO);
      await pickFile(bob);
      await alice.page.waitForFunction(`(${findPlayer})()?.readyState >= 2`, null, { timeout: WAIT });
      await alice.page.evaluate(`(${findPlayer})().click()`);
      await synced([alice, bob], 0);
    },
    async before([alice]) {
      return (await playback(alice))?.t ?? 0;
    },
    async check(ps, c, before) {
      // A page that went away forgot its file; picking it again must land at the room's moment.
      for (const p of ps) if (c.disruption.lostPage && c.hits(p)) await pickFile(p);
      await synced(ps, before);
    },
  },
  overlay: {
    paths: ["/overlay/", "/overlay/"],
    async setup([alice, bob]) {
      await alice.page.getByRole("button", { name: "BRB", exact: true }).click();
      await bob.page.getByText("Alice stepped away").waitFor({ timeout: WAIT });
    },
    async check([alice, bob], c) {
      // Away is part of the seat: a reconnect or reload keeps it, a brand-new seat starts fresh.
      if (c.disruption.newSeat && c.hits(alice)) {
        await bob.page.getByText("Alice stepped away").waitFor({ state: "detached", timeout: WAIT });
        return;
      }
      await bob.page.getByText("Alice stepped away").waitFor({ timeout: WAIT });
      await alice.page.getByRole("button", { name: "I'm back" }).click();
      await bob.page.getByText("Alice stepped away").waitFor({ state: "detached", timeout: WAIT });
    },
  },
  phone: {
    paths: ["/overlay/", "/call/"],
  },
};

const closeChat = (page) =>
  page.getByRole("complementary", { name: "Chat", exact: true }).getByRole("button", { name: "Close chat", exact: true }).click();

async function shareLive(viewer) {
  await viewer.page.getByText("is sharing").waitFor({ timeout: WAIT });
  await viewer.page.waitForFunction(() => {
    const v = document.querySelector("video.object-contain");
    return v && v.videoWidth > 300 && !v.paused;
  }, null, { timeout: WAIT });
  const frames = () => viewer.page.evaluate(() => document.querySelector("video.object-contain")?.getVideoPlaybackQuality().totalVideoFrames ?? 0);
  const before = await frames();
  // Still moving, not a frozen last frame.
  await viewer.page.waitForFunction(
    (b) => (document.querySelector("video.object-contain")?.getVideoPlaybackQuality().totalVideoFrames ?? 0) > b,
    before,
    { timeout: WAIT },
  );
}

async function pickFile(p) {
  await p.page.getByText("picked a file").waitFor({ timeout: WAIT });
  await p.page.locator('input[type="file"]').first().setInputFiles(VIDEO);
}

/** Both playing, within a second of each other, and not sent back to the start. */
async function synced(ps, notBefore) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < WAIT) {
    const states = await Promise.all(ps.map(playback));
    last = states;
    if (states.every((s) => s && !s.paused && s.ready >= 2)) {
      const diff = Math.abs(states[0].t - states[1].t);
      if (diff < 1 && Math.min(states[0].t, states[1].t) >= notBefore - 0.5) return;
    }
    await ps[0].page.waitForTimeout(500);
  }
  throw new Error(`playback not in sync: ${JSON.stringify(last)} (expected ≥ ${notBefore.toFixed(1)}s)`);
}

/* ------------------------------------------------------------------ */
/* The matrix                                                          */
/* ------------------------------------------------------------------ */

const TABS = ["hidden20s", "frozen50s", "duplicateTab", "duplicateUseHere"];
const ALL = ["deadSocket", "networkChange", "drop", "dropTwice", "outage5s", "outage20s", "offline", "reload", "reloadTwice", "reloadLostGoodbye", "backForward", "closeReopen", "leaveRejoin", ...TABS];
const PLAN = {
  idle: { disruptions: [...ALL, "closeLostGoodbye", "chatWhileAway"], who: ["alice", "bob", "both"] },
  share: { disruptions: ALL, who: ["alice", "bob", "both"] },
  file: { disruptions: ALL, who: ["alice", "bob", "both"] },
  // The panel's Leave button belongs to the extension, and back/forward never applies inside its frame.
  overlay: { disruptions: ALL.filter((d) => d !== "leaveRejoin" && d !== "backForward"), who: ["alice", "bob", "both"] },
  phone: { disruptions: ["deadSocket", "networkChange", "drop", "outage20s", "offline", "reload", "closeReopen", ...TABS], who: ["alice", "bob"] },
};

const cases = [];
for (const [mode, plan] of Object.entries(PLAN)) {
  if (MODES[mode].skip) continue;
  for (const d of plan.disruptions) {
    for (const who of plan.who) {
      // A ghost seat takes a minute to clear; once per side is enough.
      if (d === "closeLostGoodbye" && who === "both") continue;
      const name = `${mode} · ${d} · ${who}`;
      if (!ONLY || ONLY.test(name)) cases.push({ name, mode, d, who });
    }
  }
}

async function runCase(spec, index) {
  const mode = MODES[spec.mode];
  const disruption = DISRUPTIONS[spec.d];
  const id = `rz-${RUN}-${index}`;
  const ps = [];
  const c = {
    id,
    ps,
    disruption,
    hits: (p) => spec.who === "both" || spec.who === p.name.toLowerCase(),
  };
  const t0 = Date.now();
  let stage = "join";
  try {
    ps.push(await participant("Alice", mode.paths[0], id));
    ps.push(await participant("Bob", mode.paths[1], id));
    for (const p of ps) await healthy(p);
    stage = "setup";
    await mode.setup?.(ps, c);
    const before = await mode.before?.(ps, c);
    stage = `disrupt (${spec.d})`;
    await Promise.all(ps.filter(c.hits).map((p) => disruption.run(p, c)));
    stage = "call recovers";
    const wait = disruption.slow ? GHOST_WAIT : WAIT;
    for (const p of ps) await healthy(p, 2, wait);
    stage = `${spec.mode} state`;
    await mode.check?.(ps, c, before);
    stage = "reactions";
    const [sender, receiver] = spec.who === "bob" ? [ps[1], ps[0]] : [ps[0], ps[1]];
    await reactionArrives(sender, receiver);
    const timed = ps.filter((p) => p.recoveredIn).map((p) => `${p.name} back in ${(p.recoveredIn / 1000).toFixed(1)}s`);
    log(`PASS  ${spec.name} (${((Date.now() - t0) / 1000).toFixed(1)}s${timed.length ? `; ${timed.join(", ")}` : ""})`);
    return null;
  } catch (e) {
    const details = [];
    for (const p of ps) {
      details.push(`    ${p.name}: ${JSON.stringify(await diagnose(p))}${p.errors.length ? ` errors=${JSON.stringify(p.errors.slice(0, 3))}` : ""}`);
      await p.page?.screenshot({ path: pathJoin(OUT, `${index}-${p.name}.png`) }).catch(() => {});
    }
    const failure = `${spec.name} — failed at ${stage}: ${String(e?.message ?? e).split("\n")[0]}\n${details.join("\n")}`;
    log(`FAIL  ${failure}`);
    return failure;
  } finally {
    await Promise.all(ps.map((p) => p.ctx.close().catch(() => {})));
  }
}

log(`${cases.length} cases, ${CONCURRENCY} at a time, against ${BASE}. Screenshots of failures go to ${OUT}`);
const failures = [];
let next = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, cases.length) }, async () => {
    while (next < cases.length) {
      const i = next++;
      const failure = await runCase(cases[i], i);
      if (failure) failures.push(failure);
    }
  }),
);
await browser.close();

console.log(`\n${cases.length - failures.length}/${cases.length} passed`);
if (failures.length) {
  console.log(`\nFailures:\n${failures.map((f) => `- ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("RESILIENCE E2E PASSED");
