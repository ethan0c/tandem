// Sample rendered backgrounds beneath visible text, including gradients and translucent panels.
import { chromium, webkit } from 'playwright';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://localhost:3000';
const engine = process.env.TEST_ENGINE || 'chromium';
const browser = await (engine === 'webkit' ? webkit.launch({ headless: true }) : chromium.launch({ channel: 'chrome', headless: true }));
const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
const seed = JSON.parse(readFileSync(new URL('../src/content/catalog.json', import.meta.url)));
await context.addInitScript(entries => {
  sessionStorage.setItem('tandem:intro-seen', '1');
  localStorage.setItem('tandem:library:v1', JSON.stringify(entries.map(media => ({ media, status: 'current', progress: 2, favorite: true, subscribed: false, updatedAt: Date.now() }))));
}, [seed[0], seed.find(m => m.kind === 'manga')]);
await context.route('**/api/catalog?**', route => {
  const q = new URL(route.request().url()).searchParams;
  return route.fulfill({ json: q.has('id') ? { title: seed.find(m => m.kind === q.get('kind') && m.id === q.get('id')), providers: [] } : { items: seed.filter(m => m.kind === q.get('kind')), source: 'live', hasMore: false } });
});
const page = await context.newPage();
function luminance(rgb) { return rgb.reduce((sum, v, i) => { const n = v / 255; return sum + (n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4) * [.2126,.7152,.0722][i]; }, 0); }
const failures = [], all = [];
async function audit(path) {
  const candidates = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    function rgba(color) { ctx.clearRect(0,0,1,1); ctx.fillStyle = color; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data]; }
    const result = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, el = node.parentElement;
      const text = node.textContent.replace(/\s+/g,' ').trim();
      if (!text || !el || el.closest('script,style,svg,option,[aria-hidden="true"],[inert],:disabled,.sr-only')) continue;
      const style = getComputedStyle(el);
      if (style.visibility !== 'visible') continue;
      let opacity = 1;
      for (let ancestor = el; ancestor; ancestor = ancestor.parentElement) opacity *= Number(getComputedStyle(ancestor).opacity);
      if (!opacity) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const box of range.getClientRects()) {
        if (box.width < 3 || box.height < 3 || box.top < 0 || box.bottom > innerHeight || box.left < 0 || box.right > innerWidth) continue;
        result.push({ text: text.slice(0,100), className: String(el.className), color: rgba(style.color), opacity, size: parseFloat(style.fontSize), weight: parseFloat(style.fontWeight), x: box.x, y: box.y, w: box.width, h: box.height });
      }
    }
    for (const el of document.querySelectorAll('input[placeholder]:not(:disabled)')) {
      if (el.value || el.closest('[inert]')) continue;
      const box = el.getBoundingClientRect(), style = getComputedStyle(el,'::placeholder');
      if (box.top < 0 || box.bottom > innerHeight || !box.height) continue;
      result.push({ text: `Placeholder: ${el.placeholder}`, className: el.className, color: rgba(style.color), opacity: Number(style.opacity), size: parseFloat(style.fontSize) || parseFloat(getComputedStyle(el).fontSize), weight: 400, x: box.x + 14, y: box.y + 8, w: Math.max(8,box.width-60), h: box.height-16 });
    }
    return result;
  });
  const hide = await page.addStyleTag({ content: 'body,body * { transition:none!important; color:transparent!important; -webkit-text-fill-color:transparent!important; text-shadow:none!important; }' });
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const screenshot = await page.screenshot(); await hide.evaluate(el => el.remove());
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const { data, info } = await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const item of candidates) {
    let ratio = Infinity;
    for (const f of [.1,.5,.9]) {
      const x = Math.min(info.width-1,Math.max(0,Math.round(item.x+item.w*f))), y = Math.min(info.height-1,Math.max(0,Math.round(item.y+item.h/2)));
      const offset = (y*info.width+x)*info.channels, bg = [...data.subarray(offset,offset+3)];
      const alpha = item.color[3]/255*item.opacity;
      const fg = bg.map((v,i)=>item.color[i]*alpha+v*(1-alpha));
      const l1=luminance(fg), l2=luminance(bg);
      ratio=Math.min(ratio,(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05));
    }
    const threshold = item.size >= 24 || (item.size >= 18.66 && item.weight >= 700) ? 3 : 4.5;
    const row = { path, text:item.text, className:item.className, ratio:Math.round(ratio*100)/100, required:threshold };
    all.push(row); if (ratio < threshold) failures.push(row);
  }
}
try {
  for (const path of ['/', '/anime', '/manga', '/library', '/library/import', '/account', '/rooms', '/title/anime/7442', '/play/manga/24249?unit=ubunchu-12']) {
    await page.goto(base+path); await page.evaluate(()=>document.fonts.ready);
    if (path.startsWith('/play')) await page.waitForFunction(()=>document.querySelector('.reader-page img')?.naturalWidth>0);
    else if (['/anime','/manga'].includes(path)) await page.waitForFunction(()=>!document.querySelector('.media-grid[aria-busy="true"]'));
    for (const offset of [0, 750, 1e7]) { await page.evaluate(y=>scrollTo(0,y),offset); await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))); await audit(path); }
  }
  const unique = [...new Map(failures.map(row=>[`${row.path}:${row.text}:${row.className}`,row])).values()];
  writeFileSync(`/private/tmp/tandem-contrast-${engine}.json`,JSON.stringify({ checked:all.length, failures:unique },null,2));
  console.log(JSON.stringify({ engine, checked:all.length, failures:unique }));
  assert.equal(unique.length,0,'Visible text must meet its WCAG AA contrast threshold on sampled backgrounds');
} finally { await browser.close(); }
