// Real licensed images. Long chapters are fixtures to verify bounded requests and DOM size.
import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://localhost:3000';
const engine=process.env.TEST_ENGINE||'chromium';
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
async function ready(page){await page.waitForFunction(()=>[...document.querySelectorAll('.reader-page img')].some(i=>i.complete&&i.naturalWidth>0))}
try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();const requests=new Set();
  page.on('request',r=>{if(r.url().includes('/reader/ubunchu/12/'))requests.add(r.url())});
  await page.goto(`${base}/play/manga/24249?unit=ubunchu-12`);await ready(page);await page.waitForTimeout(700);
  assert.ok(requests.size<=3,`Page mode requested ${requests.size} images instead of a small batch`);
  const firstRequests=requests.size;
  if(engine==='chromium'){
    await page.getByRole('button',{name:'Fullscreen reader',exact:true}).click();
    await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('manga-reader'));
    await page.getByRole('button',{name:'Close reader view',exact:true}).click();
    await page.waitForFunction(()=>!document.fullscreenElement);
  }
  await page.getByRole('combobox',{name:'Reading mode'}).selectOption('scroll');
  await page.getByRole('combobox',{name:'Reading direction'}).selectOption('rtl');
  await page.reload();
  assert.equal(await page.getByRole('combobox',{name:'Reading mode'}).inputValue(),'scroll');
  assert.equal(await page.getByRole('combobox',{name:'Reading direction'}).inputValue(),'rtl');
  await context.close();
  const long=await browser.newContext({viewport:{width:390,height:844}});
  await long.addInitScript(()=>Object.defineProperty(document,'fullscreenEnabled',{configurable:true,get:()=>false}));
  await long.route('**/api/content?**',async route=>{
    if(!new URL(route.request().url()).searchParams.has('unit'))return route.continue();
    const response=await route.fetch();const data=await response.json();
    if(data.pages)data.pages=Array.from({length:120},(_,i)=>`${data.pages[i%data.pages.length]}?fixture=${i}`);
    await route.fulfill({json:data});
  });
  const q=await long.newPage(), loaded=new Set();
  q.on('request',r=>{if(r.url().includes('/reader/ubunchu/12/'))loaded.add(r.url())});
  await q.goto(`${base}/play/manga/24249?unit=ubunchu-12`);await ready(q);
  await q.getByRole('button',{name:'Expand reader',exact:true}).click();
  const expanded=q.locator('.manga-reader[data-expanded="true"]');await expanded.waitFor();
  const box=await expanded.boundingBox();assert.ok(Math.abs(box.width-390)<1&&Math.abs(box.height-844)<1);
  await q.keyboard.press('Escape');await expanded.waitFor({state:'hidden'});
  assert.equal(await q.evaluate(()=>document.body.style.overflow),'');
  await q.getByRole('combobox',{name:'Reading mode'}).selectOption('scroll');
  await q.waitForFunction(()=>document.querySelectorAll('[data-page]').length===120);
  await q.waitForTimeout(500);
  assert.ok(await q.locator('.reader-page img').count()<12);
  assert.ok(loaded.size<14,`Initial scroll mode fetched ${loaded.size} / 120 pages`);
  await q.waitForFunction(()=>document.querySelector('[data-page="1"] img')?.naturalWidth>0);
  const scrollSpot=await q.evaluate(()=>{
    const second=document.querySelector('[data-page="1"]');
    const top=second.getBoundingClientRect().top+window.scrollY;
    window.scrollTo({top:top+150,behavior:'instant'});
    return window.scrollY;
  });
  await q.waitForTimeout(600);
  const scrollAfter=await q.evaluate(()=>({y:window.scrollY,page:document.querySelector('input[aria-label="Page number"]')?.value,top:document.querySelector('[data-page="1"]')?.getBoundingClientRect().top}));
  assert.ok(Math.abs(scrollAfter.y-scrollSpot)<35,`Vertical scrolling should not snap to a page top (${scrollSpot} -> ${JSON.stringify(scrollAfter)})`);
  await q.getByRole('spinbutton',{name:'Page number'}).fill('60');
  await q.waitForFunction(()=>document.querySelector('[data-page="59"] img')?.naturalWidth>0);
  assert.ok(await q.locator('.reader-page img').count()<12,'Far-away page images should leave the DOM');
  const jumped=await q.getByRole('spinbutton',{name:'Page number'}).inputValue();
  assert.equal(jumped,'60');
  assert.ok(loaded.size<25,'Jumping should load only pages near the new position');
  await q.getByRole('button',{name:'Open page grid'}).click();
  assert.equal(await q.getByRole('button',{name:/^Open page \d+$/}).count(),120);
  await q.getByRole('button',{name:'Open page 10',exact:true}).click();
  assert.equal(await q.getByRole('spinbutton',{name:'Page number'}).inputValue(),'10');
  assert.equal(await q.getByRole('button',{name:'Close page grid'}).count(),0);
  await long.close();
  const saver=await browser.newContext({viewport:{width:390,height:844}});
  await saver.addInitScript(()=>Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true,effectiveType:'3g'}}));
  const s=await saver.newPage(), saving=new Set();s.on('request',r=>{if(r.url().includes('/reader/ubunchu/12/'))saving.add(r.url())});
  await s.goto(`${base}/play/manga/24249?unit=ubunchu-12`);await ready(s);await s.waitForTimeout(500);
  assert.equal(saving.size,1,'Save Data should suppress speculative page requests');
  await saver.close();
  console.log(`PASS ${engine}: ${firstRequests}-image initial batch, saved modes, fullscreen/expanded view, 120-page scroll window, page-60 jump, Save Data.`);
}finally{await browser.close()}
