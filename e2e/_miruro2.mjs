import { chromium } from 'playwright';
const ext = process.env.EXT;
const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', headless: !process.env.HEADED, viewport: { width: 1280, height: 800 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const p = ctx.pages()[0];
await p.goto('https://www.miruro.tv/watch/fs2dC9ykWuTjU9PE0wiOQbV2Io7lspxV/the-worlds-strongest-witch?ep=1#tandem=miruro-probe', { timeout: 45000 });
await p.waitForTimeout(12000);
const panel = p.frames().find((f) => f.url().includes('/overlay/'));
console.log('panel mounted:', !!panel, '| frames:', p.frames().map((f) => new URL(f.url()).host).join(', '));
let player = p.frames().find((f) => f.url().includes('strm.cx'));
console.log('content script in player frame:', await player.evaluate(() => !!window.__tandemLoaded).catch(() => 'n/a (isolated world)'));
const buttons = await player.$$eval('button,[role=button]', (bs) => bs.map((b) => b.getAttribute('aria-label') || b.title || b.className).filter(Boolean).slice(0, 40));
console.log('player buttons:', JSON.stringify(buttons));
const box = await p.locator('iframe[src*="strm.cx"]').boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await p.waitForTimeout(500);
let fsBtn;
for (let i = 0; i < 30 && !fsBtn; i++) {
  for (const f of p.frames().filter((f) => f.url().includes('strm.cx'))) {
    const b = f.getByRole('button', { name: 'Fullscreen' }).first();
    if (await b.count().catch(() => 0)) { fsBtn = b; player = f; }
  }
  if (!fsBtn) await p.waitForTimeout(1000);
}
console.log('fs button found', !!fsBtn, fsBtn && await fsBtn.isVisible());
await fsBtn.click({ timeout: 5000 }).catch(async (e) => { console.log('click failed', e.message.split('\n')[0]); await player.locator('video').dblclick(); });
for (const t of [300, 2000]) {
  await p.waitForTimeout(t);
  console.log(`after ${t}ms`, JSON.stringify(await p.evaluate(() => {
    const fe = document.fullscreenElement;
    const host = document.querySelector('#tandem-overlay-host');
    const r = host?.getBoundingClientRect();
    const hit = r && document.elementFromPoint(r.left + 20, r.top + 10);
    const ifr = document.querySelector('iframe[src*="strm.cx"]');
    const ir = ifr?.getBoundingClientRect();
    return { topFs: fe ? fe.tagName + '.' + String(fe.className).slice(0, 40) : null, pseudo: document.querySelector('.tandem-pseudo-fs')?.tagName ?? null,
      hostOnTop: !!hit && host.contains(hit), playerRect: ir && `${Math.round(ir.width)}x${Math.round(ir.height)}`, view: innerWidth + 'x' + innerHeight };
  })), 'player fs:', await player.evaluate(() => document.fullscreenElement?.tagName ?? null));
}
await p.screenshot({ path: '/private/tmp/claude-501/-Users-ethanlma-Github-tandem/ff705a61-2875-40ae-b1d8-b639dcf054dc/scratchpad/miruro-fs.png' });
await ctx.close();
