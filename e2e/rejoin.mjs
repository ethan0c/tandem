import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
try {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => {
    window.__notes = 0;
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) { window.__notes++; return start.apply(this, args); };
  });
  const code = `rejoin-${Date.now()}`;
  const room = `${base}/room/${code}`;
  const alice = await context.newPage();
  const bob = await context.newPage();
  const notes = (page) => page.evaluate(() => window.__notes);
  async function join(page, name) {
    await page.waitForFunction(() => document.querySelector('button[aria-label="Mute microphone"]')?.disabled === false);
    await page.getByLabel('Your name').fill(name);
    await page.getByRole('button', { name: 'Join room', exact: true }).click();
    await page.getByRole('link', { name: 'Leave room', exact: true }).waitFor();
  }
  async function openChat(page) { await page.getByRole('button', { name: 'Open chat', exact: true }).click(); }
  async function send(page, text) {
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill(text);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await page.getByTestId('chat-message').filter({ hasText: text }).waitFor();
  }
  await alice.goto(room); await join(alice, 'Alice');
  await bob.goto(room); await join(bob, 'Bob');
  await alice.waitForFunction(() => document.querySelectorAll('header span[title]').length === 2);
  await openChat(alice); await openChat(bob);
  const beforeMessage = await notes(bob);
  await send(alice, 'Keep this conversation');
  await bob.getByTestId('chat-message').filter({ hasText: 'Keep this conversation' }).waitFor();
  assert((await notes(bob)) > beforeMessage);
  console.log('PASS: incoming messages play a chime');
  await bob.getByRole('complementary', { name: 'Chat', exact: true }).getByRole('button', { name: 'Close chat', exact: true }).click();
  await bob.getByRole('button', { name: 'Camera off', exact: true }).click();
  await bob.getByRole('button', { name: 'Mute', exact: true }).last().click();
  await bob.waitForFunction(() => { const s = JSON.parse(sessionStorage.getItem('tandem:room-session')); return s.camOn === false && s.micOn === false && s.active; });
  const beforeRefresh = await notes(alice);
  await bob.reload();
  await bob.getByRole('link', { name: 'Leave room', exact: true }).waitFor();
  await bob.getByRole('button', { name: 'Camera on', exact: true }).waitFor();
  await bob.getByRole('button', { name: 'Unmute', exact: true }).last().waitFor();
  await openChat(bob);
  await bob.getByTestId('chat-message').filter({ hasText: 'Keep this conversation' }).waitFor();
  assert.equal(await notes(alice), beforeRefresh);
  assert.equal(await alice.locator('header span[title]').count(), 2);
  console.log('PASS: reload resumes, retains chat and media choices, no departure/join chimes');
  await alice.getByRole('complementary', { name: 'Chat', exact: true }).getByRole('button', { name: 'Close chat', exact: true }).click();
  await bob.getByRole('complementary', { name: 'Chat', exact: true }).getByRole('button', { name: 'Close chat', exact: true }).click();
  await alice.getByRole('link', { name: 'Leave room', exact: true }).click();
  await bob.getByRole('link', { name: 'Leave room', exact: true }).click();
  await bob.getByRole('link', { name: 'Rejoin your last room', exact: false }).waitFor();
  const response = await bob.request.get(`${base}/room-status/${code}`);
  const status = await response.json();
  assert.equal(status.exists, true);
  assert(status.expiresAt > Date.now() && status.expiresAt <= Date.now() + 600_000);
  await bob.getByRole('link', { name: 'Rejoin your last room', exact: false }).click();
  await join(bob, 'Bob');
  await openChat(bob);
  await bob.getByTestId('chat-message').filter({ hasText: 'Keep this conversation' }).waitFor();
  console.log('PASS: empty room lasts ten minutes, homepage rejoin restores chat');
} finally { await browser.close(); }
