// Viewer controls use real bundled pages/video; extra units are fixtures to exercise navigation and spoilers.
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
const base = process.env.BASE_URL || "http://localhost:3000";
const seed = JSON.parse(readFileSync(new URL("../src/content/catalog.json", import.meta.url)));
const engine = process.env.TEST_ENGINE || "chromium";
const browser = engine === "webkit" ? await webkit.launch({ headless: true }) : await chromium.launch({ channel: "chrome", headless: true });
const output = `/private/tmp/tandem-viewer-${engine}`;
mkdirSync(output, { recursive: true });
const errors = [];
async function geometry(page, label) {
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const icons = [...document.querySelectorAll('button.btn3d > svg')].filter(svg => {
      const a = svg.getBoundingClientRect(), b = svg.parentElement.getBoundingClientRect();
      return a.width && b.width && (a.left < b.left + 2 || a.right > b.right - 2 || a.top < b.top + 2 || a.bottom > b.bottom - 2);
    });
    const fields = [...document.querySelectorAll('select.field')].filter(e => {
      const r = e.getBoundingClientRect();
      return r.width && (r.width < 120 || r.left < 0 || r.right > width + 1);
    });
    return { width, scroll: document.documentElement.scrollWidth, icons: icons.length, fields: fields.length };
  });
  assert.ok(result.scroll <= result.width + 1, `${label}: overflow ${JSON.stringify(result)}`);
  assert.equal(result.icons, 0, `${label}: chevron containment`);
  assert.equal(result.fields, 0, `${label}: squashed settings`);
}
try {
  for (const width of (process.env.TEST_WIDTHS || "320,390,430,768,1440").split(",").map(Number)) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 768, isMobile: width < 768 });
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    const catalogResponse = await context.request.get(`${base}/api/content?kind=manga&id=24249`);
    assert.ok(catalogResponse.ok());
    const catalog = await catalogResponse.json();
    const playback = await (await context.request.get(`${base}/api/content?kind=manga&id=24249&unit=ubunchu-12`)).json();
    const units = [12, 13].map(number => ({ ...playback.unit, id: `ubunchu-${number}`, number, label: `Chapter ${number}`, title: `Secret ending ${number}` }));
    await context.route("**/api/content?**", async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("kind") !== "manga") return route.continue();
      const unit = units.find(u => u.id === url.searchParams.get("unit"));
      if (unit?.number === 13) await new Promise(resolve => setTimeout(resolve, 900));
      await route.fulfill({ json: unit ? { ...playback, unit } : { ...catalog, units, total: 2 } });
    });
    await context.route("**/api/catalog?**", route => {
      const url = new URL(route.request().url());
      return route.fulfill({ json: { title: seed.find(m => m.kind === url.searchParams.get("kind") && m.id === url.searchParams.get("id")), providers: [] } });
    });
    await page.goto(`${base}/title/manga/24249`);
    await page.getByText("Title hidden until completed").first().waitFor();
    assert.equal(await page.getByText("Secret ending 13", { exact: true }).count(), 0);
    await page.getByRole("checkbox", { name: /Show unfinished/ }).check();
    await page.getByText("Secret ending 13", { exact: true }).waitFor();
    await page.getByRole("checkbox", { name: /Show unfinished/ }).uncheck();
    assert.equal(await page.getByText("Secret ending 13", { exact: true }).count(), 0);
    await page.getByRole("link", { name: "Read chapter 12", exact: true }).click();
    await page.locator('.reader-page img:visible').waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.reader-page img')].find(e => e.getBoundingClientRect().height)?.naturalWidth > 0);
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    assert.equal(await page.getByRole("spinbutton", { name: "Page number" }).inputValue(), "2");
    await page.getByRole("combobox", { name: "Reading direction" }).selectOption("rtl");
    await page.locator("h1:visible").click();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.getByRole("spinbutton", { name: "Page number" }).inputValue(), "3");
    await page.getByRole("combobox", { name: "Page sizing" }).selectOption("width");
    assert.equal(await page.locator('.reader-page').getAttribute('data-fit'), 'width');
    await geometry(page, `${width} manga width fit`);
    await page.getByRole("combobox", { name: "Reading mode" }).selectOption("scroll");
    await page.locator('[data-page="4"]').scrollIntoViewIfNeeded();
    await page.locator('[data-page="4"]').evaluate(e => e.scrollIntoView({ block: 'start' }));
    await page.waitForFunction(() => document.querySelector('[data-page="4"] img')?.naturalWidth > 0);
    await page.locator('[data-page="4"]').evaluate(e => e.scrollIntoView({ block: 'start' }));
    await page.waitForFunction(() => document.querySelector('input[aria-label="Page number"]')?.value === '5', null, { timeout: 5000 }).catch(async error => { console.log(await page.evaluate(() => ({ scroll: scrollY, page: document.querySelector('input[aria-label="Page number"]')?.value, positions: [...document.querySelectorAll('[data-page]')].map(e => ({ page: e.dataset.page, top: e.getBoundingClientRect().top, height: e.getBoundingClientRect().height, loaded: e.querySelector('img').naturalWidth })) }))); await page.screenshot({ path: '/private/tmp/tandem-scroll-debug.png' }); throw error; });
    await page.getByRole("combobox", { name: "Reading mode" }).selectOption("page");
    await page.getByRole("combobox", { name: "Page sizing" }).selectOption("height");
    const frameHeight = (await page.locator('.reader-page:visible').boundingBox()).height;
    await page.getByRole("button", { name: "Next chapter", exact: true }).click();
    await page.getByText("Opening chapter…", { exact: true }).waitFor();
    assert.equal(await page.locator('.reader-page img:visible').count(), 1, 'previous chapter remains mounted while loading');
    assert.equal((await page.locator('.reader-page:visible').boundingBox()).height, frameHeight, 'pending chapter keeps layout height');
    await page.waitForURL(/unit=ubunchu-13/);
    await page.waitForFunction(() => [...document.querySelectorAll('.unit-navigation select')].some(e => e.value === 'ubunchu-13'));
    await page.locator('.reader-page img:visible').waitFor();
    assert.equal(await page.getByRole("combobox", { name: "Reading direction" }).inputValue(), "rtl");
    assert.equal(await page.getByRole("spinbutton", { name: "Page number" }).inputValue(), "1");
    assert.ok(!(await page.locator('main').textContent()).includes('Secret ending'));
    await page.getByRole("button", { name: "Mark chapter 13 complete" }).click();
    await page.getByRole("button", { name: "Chapter 13 complete", exact: true }).waitFor();
    await geometry(page, `${width} manga`);
    await page.screenshot({ path: `${output}/${width}-manga.png`, fullPage: true });
    await page.goto(`${base}/play/anime/4650`);
    await page.waitForFunction(() => document.querySelector('video')?.readyState >= 1, null, { timeout: 60000 });
    await page.getByRole("combobox", { name: "Playback speed" }).selectOption("1.5");
    assert.equal(await page.locator('video').evaluate(v => v.playbackRate), 1.5);
    await page.getByRole("button", { name: "Forward 10 seconds" }).click();
    assert.ok(await page.locator('video').evaluate(v => v.currentTime >= 9.9));
    await page.getByRole("button", { name: "Back 10 seconds" }).click();
    assert.ok(await page.locator('video').evaluate(v => v.currentTime < 1));
    await page.locator('h1:visible').click();
    await page.keyboard.press('l');
    assert.ok(await page.locator('video').evaluate(v => v.currentTime >= 9.9));
    if (width === 390 && engine === 'chromium') {
      await page.getByRole('combobox', { name: 'Video format' }).selectOption('1');
      await page.waitForFunction(() => {
        const video = document.querySelector('video');
        return video?.readyState >= 1 && video.currentSrc.includes('wikimedia') && video.currentTime >= 9.9;
      }, null, { timeout: 30000 });
      assert.equal(await page.locator('video').evaluate(v => v.playbackRate), 1.5);
    }
    await geometry(page, `${width} anime`);
    await page.screenshot({ path: `${output}/${width}-anime.png`, fullPage: true });
    console.log(`PASS ${engine} ${width}px: spoiler reveals, chapter navigation, RTL keys, sizing, scroll progress, video speed/seeking, chevrons and layout.`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
