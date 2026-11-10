// Delayed/failed API responses exercise loading UI independently of fast local caches.
import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const seed = JSON.parse(readFileSync(new URL('../src/content/catalog.json', import.meta.url)));
const base = process.env.BASE_URL || 'http://localhost:3000';
const engine = process.env.TEST_ENGINE || 'chromium';
const browser = engine === 'webkit' ? await webkit.launch({ headless: true }) : await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let attempts = 0;
let releaseFirst;
const firstTitleGate = new Promise(resolve => { releaseFirst = resolve; });
try {
  await context.route('**/api/catalog?**', async route => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get('id');
    if (id) {
      if (id === '99999') await firstTitleGate;
      else await new Promise(resolve => setTimeout(resolve, 700));
      if (id === '99998' && attempts++ === 0) return route.fulfill({ status: 503, json: { error: 'Temporary provider outage' } });
      return route.fulfill({ json: { title: { ...seed.find(m => m.kind === 'manga'), id, title: `Loaded title ${id}` }, providers: [] } });
    }
    await new Promise(resolve => setTimeout(resolve, 700));
    return route.fulfill({ json: { items: [], hasMore: false, source: 'kitsu' } });
  });
  await context.route('**/api/content?**', route => route.fulfill({ json: { units: [], source: '', total: 0, hasMore: false } }));
  await page.goto(`${base}/title/manga/99999`);
  const loading = page.getByRole('status', { name: 'Loading title' });
  await loading.waitFor();
  await page.waitForFunction(() => { const shape = document.querySelector('[aria-label="Loading title"] .loading-shape'); return shape && getComputedStyle(shape).animationName === 'none'; });
  releaseFirst();
  assert.ok(await page.locator('.platform-header').count());
  await page.getByRole('heading', { name: 'Loaded title 99999', exact: true }).waitFor();
  assert.equal(await loading.count(), 0);
  await page.waitForLoadState('networkidle');
  await page.goto(`${base}/title/manga/99998`);
  await page.getByRole('status', { name: 'Loading title' }).waitFor();
  await page.getByRole('heading', { name: 'Title unavailable', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByRole('status', { name: 'Loading title' }).waitFor();
  await page.getByRole('heading', { name: 'Loaded title 99998', exact: true }).waitFor();
  await page.waitForLoadState('networkidle');
  await page.goto(`${base}/manga`);
  await page.getByRole('heading', { name: 'No stories found', exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Search titles', exact: true }).fill('new search');
  await page.getByRole('status', { name: 'Loading search results' }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'No stories found', exact: true }).count(), 0);
  await page.getByRole('heading', { name: 'No stories found', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log(`PASS ${engine}: slow title skeleton, reduced motion, header retained, provider failure/retry, and loading search results.`);
} finally { await browser.close(); }
