import { chromium } from 'playwright';
const ext = '/Users/ethanlma/Github/tandem/extension';
const ctx = await chromium.launchPersistentContext('', { channel: 'chromium', headless: !process.env.HEADED, args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--disable-features=LocalNetworkAccessChecks'] });
const PLAYER = `<body style="margin:0"><div id="wrap" style="width:100%;height:100%;background:#123"><video style="width:100%;height:90%"></video><button id="fs">fullscreen</button></div>
<script>fs.onclick=()=>wrap.requestFullscreen()</script>`;
await ctx.route('https://www.youtube.com/**', (r) => r.fulfill({ contentType: 'text/html', body: process.env.SAME ? PLAYER : `<body style="margin:0"><iframe allowfullscreen src="https://www.crunchyroll.com/player" style="width:960px;height:540px;border:0"></iframe>` }));
await ctx.route('https://www.crunchyroll.com/**', (r) => r.fulfill({ contentType: 'text/html', body: PLAYER }));
const w = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
await w.evaluate(() => chrome.storage.sync.set({ appOrigin: 'http://localhost:3124' }));
const p = ctx.pages()[0];
p.on('console', (m) => /fullscreen|Tandem|denied|Permissions/i.test(m.text()) && console.log('console', m.text()));
await p.goto('https://www.youtube.com/watch?v=x#tandem=fs-room');
await p.waitForSelector('#tandem-overlay-host');
const player = process.env.SAME ? p.mainFrame() : p.frames().find((f) => f.url().includes('crunchyroll'));
await player.click('#fs');
for (const t of [200, 1500]) {
  await p.waitForTimeout(t);
  console.log(`after ${t}ms`, await p.evaluate(() => {
    const fe = document.fullscreenElement;
    const host = document.querySelector('#tandem-overlay-host');
    const r = host?.getBoundingClientRect();
    const hit = r && document.elementFromPoint(r.left + 20, r.top + 10);
    return { topFs: fe ? (fe.tagName + (fe.id ? '#' + fe.id : '')) : null, pseudo: document.querySelector('.tandem-pseudo-fs')?.tagName ?? null, hostOnTop: !!hit && host.contains(hit), inner: innerWidth + 'x' + innerHeight };
  }), 'inner fs:', await player.evaluate(() => document.fullscreenElement?.id ?? null));
}
await ctx.close();
