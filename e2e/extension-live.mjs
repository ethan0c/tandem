// End-to-end with the real extension: two separate browser profiles load extension/ unpacked, open the same
// "YouTube" episode (a local page served on www.youtube.com through Playwright, with a real <video> and the
// player class YouTube uses for ads), arrive through the #tandem= invite hash, join the room in the floating
// panel, and then the two videos must follow each other: play, seek, pause, an ad, a reload, leaving.
//
//   BASE_URL=http://localhost:3000 node e2e/extension-live.mjs
//
// Needs ffmpeg to make the test clip. Uses Playwright's Chromium (Chrome stable no longer loads unpacked
// extensions from the command line). Exits non-zero on the first failed step.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { noTurn } from './no-turn.mjs';

const base = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const STEP_MS = Number(process.env.STEP_TIMEOUT ?? 30_000);
// EXTENSION_DIR tests another build, such as the one unpacked from the Chrome Web Store.
const extension = path.resolve(process.env.EXTENSION_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../extension'));
const { version } = JSON.parse(readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
/** Ad handling and "our shows" arrived in 0.3. */
const since03 = version.split('.').map(Number)[0] > 0 || version.split('.').map(Number)[1] >= 3;

const clipPath = path.join(tmpdir(), 'tandem-e2e-clip.webm');
if (!existsSync(clipPath)) {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=15:duration=120',
    '-c:v', 'libvpx', '-b:v', '150k', '-g', '15', clipPath]);
}
const clip = readFileSync(clipPath);
const EPISODE = 'https://www.youtube.com/watch?v=tandem-e2e';
const PAGE = `<!doctype html><title>Tandem e2e episode</title><body style="margin:0;background:#000">
  <div class="html5-video-player" style="width:960px;height:540px"><video src="/tandem-e2e/clip.webm" preload="auto" style="width:100%;height:100%"></video></div>`;

async function serveEpisode(context) {
  await context.route('https://www.youtube.com/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/watch') return route.fulfill({ contentType: 'text/html', body: PAGE });
    if (url.pathname !== '/tandem-e2e/clip.webm') return route.abort();
    // Byte ranges, so the player can seek like it does on a real site.
    const m = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? '');
    if (!m) return route.fulfill({ contentType: 'video/webm', headers: { 'accept-ranges': 'bytes' }, body: clip });
    const start = Number(m[1]);
    const end = m[2] ? Math.min(Number(m[2]), clip.length - 1) : clip.length - 1;
    return route.fulfill({
      status: 206,
      contentType: 'video/webm',
      headers: { 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${clip.length}` },
      body: clip.subarray(start, end + 1),
    });
  });
}

async function launch(name) {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: !process.env.HEADED,
    viewport: { width: 1280, height: 800 },
    permissions: ['camera', 'microphone'],
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  await context.addInitScript(noTurn);
  await serveEpisode(context);
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  // The popup's "Tandem website address" setting.
  await worker.evaluate((origin) => chrome.storage.sync.set({ appOrigin: origin }), base);
  const page = context.pages()[0] ?? await context.newPage();
  page.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message));
  return { name, context, worker, page };
}

const overlay = (p) => p.page.frames().find((f) => f.url().includes('/overlay/'));
const video = (p) => p.page.evaluate(() => {
  const v = document.querySelector('video');
  return { paused: v.paused, time: v.currentTime, rate: v.playbackRate, ready: v.readyState };
});

async function until(label, fn) {
  const deadline = Date.now() + STEP_MS;
  let last;
  while (Date.now() < deadline) {
    try {
      last = await fn();
      if (last === true || (last && last.ok)) return last;
    } catch (e) {
      last = e.message;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`timed out: ${label} (last: ${JSON.stringify(last)})`);
}

async function inSync(label, playing) {
  return until(label, async () => {
    const [a, b] = [await video(alice), await video(bob)];
    const ok = a.paused === !playing && b.paused === !playing && Math.abs(a.time - b.time) < 0.6;
    return { ok, alice: a, bob: b };
  });
}

async function joinPanel(p) {
  await p.page.goto(`${EPISODE}#tandem=${room}`);
  await until(`${p.name} panel mounts`, async () => !!overlay(p));
  const f = overlay(p);
  await f.waitForFunction(() => {
    const b = document.querySelector('button[aria-label*="microphone"]');
    return b && !b.disabled;
  }, null, { timeout: STEP_MS });
  await f.getByLabel('Your name').fill(p.name);
  await f.getByRole('button', { name: 'Join room' }).click();
}

const room = `ext-${Date.now().toString(36)}`;
let alice, bob;
const step = (s) => console.log(`✓ ${s}`);
try {
  [alice, bob] = await Promise.all([launch('Alice'), launch('Bob')]);
  step(`both profiles loaded the extension (${version})`);

  await joinPanel(alice);
  await joinPanel(bob);
  assert.equal(new URL(alice.page.url()).hash, '', 'invite hash is removed from the address bar');
  for (const p of [alice, bob]) {
    await until(`${p.name} panel sees the partner and the video`, async () => {
      const text = await overlay(p).locator('body').innerText();
      return text.includes(p === alice ? 'Bob' : 'Alice') && /Ready to watch|Watching together/.test(text);
    });
  }
  step('both joined through the panel, each sees the other and their video');

  await alice.page.evaluate(() => document.querySelector('video').play());
  await inSync('Alice plays, Bob follows', true);
  step('play from Alice reaches Bob');

  await alice.page.evaluate(() => { document.querySelector('video').currentTime = 60; });
  const seek = await until('Bob seeks to ~60s', async () => {
    const b = await video(bob);
    return { ok: b.time > 59 && b.time < 64 && !b.paused, bob: b };
  });
  await inSync('in sync after the seek', true);
  step(`seek from Alice reaches Bob (Bob at ${seek.bob.time.toFixed(1)}s)`);

  await new Promise((r) => setTimeout(r, 3000));
  const drift = await inSync('still together after a few seconds of playback', true);
  step(`drift after 3s of playback: ${Math.abs(drift.alice.time - drift.bob.time).toFixed(2)}s`);

  await bob.page.evaluate(() => document.querySelector('video').pause());
  const paused = await inSync('Bob pauses, Alice follows', false);
  step(`pause from Bob reaches Alice (gap ${Math.abs(paused.alice.time - paused.bob.time).toFixed(2)}s)`);

  await bob.page.evaluate(() => document.querySelector('video').play());
  await inSync('Bob resumes, Alice follows', true);
  if (since03) {
  await alice.page.evaluate(() => document.querySelector('.html5-video-player').classList.add('ad-showing'));
  await until('Bob holds while Alice sits through an ad', async () => (await video(bob)).paused);
  await alice.page.evaluate(() => document.querySelector('.html5-video-player').classList.remove('ad-showing'));
  await inSync('both play again once the ad is over', true);
  step('an ad on Alice\'s side pauses Bob, and they resume together after it');
  } else console.log(`- skipped ad handling (not in ${version})`);

  await bob.page.reload();
  await until('Bob\'s panel comes back after a reload', async () => !!overlay(bob));
  await until('Bob rejoins without retyping his name, or after it', async () => {
    const f = overlay(bob);
    if (await f.getByRole('button', { name: 'Join room' }).isVisible().catch(() => false)) {
      await f.getByLabel('Your name').fill('Bob');
      await f.getByRole('button', { name: 'Join room' }).click();
    }
    return (await f.locator('body').innerText()).includes('Alice');
  });
  await inSync('Bob catches up with Alice after a reload', true);
  step('reload keeps Bob in the room and catches him up');

  if (since03) {
  const history = await until('"our shows" records the episode', async () => {
    const saved = await alice.worker.evaluate(() => chrome.storage.local.get('tandem:history'));
    const entry = saved['tandem:history']?.find((h) => h.url === EPISODE);
    return { ok: !!entry && entry.roomId === room && entry.together > 0, entry };
  });
  step(`"our shows" saved the episode (${history.entry.together.toFixed(1)}s together)`);
  } else console.log(`- skipped "our shows" (not in ${version})`);

  await bob.page.locator('#tandem-overlay-host button[title="Leave room"]').first().click();
  await until('Bob\'s panel closes', async () => !overlay(bob) && !(await bob.page.locator('#tandem-overlay-host').count()));
  await alice.page.evaluate(() => document.querySelector('video').pause());
  await new Promise((r) => setTimeout(r, 2500));
  assert.equal((await video(bob)).paused, false, 'after leaving, Bob no longer follows Alice');
  await until('Alice\'s panel shows Bob left', async () => !(await overlay(alice).locator('body').innerText()).includes('Bob'));
  step('leaving closes the panel, stops syncing, and Alice sees Bob go');

  console.log(`\nPASS extension ${version} e2e against ${base}`);
} catch (e) {
  console.error('\nFAIL', e.message);
  for (const p of [alice, bob].filter(Boolean)) {
    console.error(`--- ${p.name}`, await video(p).catch(() => null));
    console.error(await overlay(p)?.locator('body').innerText().catch(() => '') ?? '(no panel)');
    await p.page.screenshot({ path: `e2e/out-ext-${p.name}.png` }).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await Promise.all([alice, bob].filter(Boolean).map((p) => p.context.close()));
}
