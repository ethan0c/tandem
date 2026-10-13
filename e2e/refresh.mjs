// Reload during a call even if the closing page's socket goodbye and beacon are lost.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
try {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    // Make unload unreliable, as it can be on mobile or a dropped connection.
    let unloading = false;
    window.addEventListener('pagehide', () => { unloading = true; }, { capture: true });
    navigator.sendBeacon = () => false;
    const send = WebSocket.prototype.send;
    WebSocket.prototype.send = function (...args) { if (!unloading) return send.apply(this, args); };
    window.__pcs = [];
    const Original = RTCPeerConnection;
    window.RTCPeerConnection = class extends Original {
      constructor(...args) { super(...args); window.__pcs.push(this); }
    };
  });
  const room = `${base}/room/refresh-${Date.now()}`;
  const alice = await context.newPage();
  const bob = await context.newPage();
  async function join(page, name) {
    await page.waitForFunction(() => document.querySelector('button[aria-label="Mute microphone"]')?.disabled === false);
    await page.getByLabel('Your name').fill(name);
    await page.getByRole('button', { name: 'Join room', exact: true }).click();
    await page.getByRole('link', { name: 'Leave room', exact: true }).waitFor();
  }
  async function healthy(page, count = 2) {
    await page.waitForFunction((n) => {
      const header = document.querySelector('header');
      const cameras = [...document.querySelectorAll('video.object-cover')].filter(v => !v.muted && v.videoWidth > 0 && !v.paused);
      return header?.querySelectorAll('span[title]').length === n && cameras.length === n - 1 && window.__pcs.filter(pc => pc.connectionState === 'connected').length === n - 1;
    }, count, { timeout: 25_000 }).catch(async (error) => {
      console.log(await page.evaluate(() => ({ header: document.querySelector('header')?.innerText, members: document.querySelectorAll('header span[title]').length, pcs: window.__pcs.map(pc => pc.connectionState), videos: [...document.querySelectorAll('video')].map(v => ({ muted: v.muted, width: v.videoWidth, paused: v.paused })) })));
      throw error;
    });
    assert.equal(await page.getByText('Weak call connection', { exact: true }).count(), 0);
  }
  await alice.goto(room); await join(alice, 'Alice');
  await bob.goto(room); await join(bob, 'Bob');
  await healthy(alice); await healthy(bob);
  for (let i = 0; i < 3; i++) {
    const oldTab = await bob.evaluate(() => sessionStorage.getItem('tandem:tab-id'));
    await bob.reload(); await join(bob, 'Bob');
    assert.equal(await bob.evaluate(() => sessionStorage.getItem('tandem:tab-id')), oldTab);
    await healthy(alice); await healthy(bob);
    console.log(`PASS: refresh ${i + 1}, two members and one remote camera per person`);
  }
  // A new tab inheriting storage is a separate participant, not a replacement.
  const copied = await bob.evaluate(() => sessionStorage.getItem('tandem:tab-id'));
  const carol = await context.newPage();
  await carol.addInitScript((id) => sessionStorage.setItem('tandem:tab-id', id), copied);
  await carol.goto(room); await join(carol, 'Carol');
  assert.notEqual(await carol.evaluate(() => sessionStorage.getItem('tandem:tab-id')), copied);
  await healthy(alice, 3); await healthy(bob, 3); await healthy(carol, 3);
  console.log('PASS: new tabs with copied storage retain separate seats');
} finally {
  await browser.close();
}
