import {chromium,webkit} from 'playwright';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://localhost:3000', engine=process.env.TEST_ENGINE||'chromium';
const records=JSON.parse(readFileSync(new URL('../tests/fixtures/weebcentral-subscriptions.json',import.meta.url)));
const seed=JSON.parse(readFileSync(new URL('../src/content/catalog.json',import.meta.url)));
const fixture=records.map(([title],index)=>({...seed.find(m=>m.kind==='manga'),id:String(80000+index),title,originalTitle:title,aliases:[title],poster:'',total:title==='Bad Born Blood'?98:1000,status:'current'}));
const text=`Weeb Central Logo\nQuick Search...\nHome\nSearch\nGeneral Chat\nRandom\nAccount\nMy Subscriptions (49)\nSearch for series...\n${records.map(([title,latest,lastRead,status])=>` cover\n${title}\nLatest:\n${latest}\n· Sep 7, 2024\nLast Read:\n${lastRead}\nStatus:\n${status}`).join('\n')}\nHome\nContact\nPrivacy\nFAQ\nExport\nCopyright © Weeb Central`;
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
try{
const context=await browser.newContext({viewport:{width:390,height:844}});
const previous=fixture.find(m=>m.title==="The Extra's Academy Survival Guide");
await context.addInitScript(media=>localStorage.setItem('tandem:library:v1',JSON.stringify([{media,progress:145,status:'current',favorite:true,subscribed:true,updatedAt:1} ])),previous);
let active=0,peak=0;const queries=[];
await context.route('**/api/catalog?**',async route=>{
  const query=new URL(route.request().url()).searchParams.get('q');
  queries.push(query);active++;peak=Math.max(peak,active);
  await new Promise(r=>setTimeout(r,40));
  await route.fulfill({json:{items:fixture.filter(m=>m.title===query),source:'live',hasMore:false}});active--;
});
const page=await context.newPage();await page.goto(`${base}/library/import`);
await page.getByRole('textbox',{name:'Your manga list',exact:true}).fill(text);
await page.getByRole('button',{name:'Review matches',exact:true}).click();
await page.getByRole('heading',{name:/49 titles ·/}).waitFor({timeout:30000});
assert.equal(await page.getByRole('checkbox').count(),49);
assert.ok(peak<=3,`Lookup concurrency ${peak} exceeded three`);
assert.ok(queries.every(q=>records.some(r=>r[0]===q)),`Metadata queries included non-title page text`);
for(const [name,value] of [['Blue Lock','368'],['The Archmage Returns After 4000 Years','201'],['Choujin X','68.2'],['Bad Born Blood','103'],['The God of High School','42'],['Bleach','0']]){
assert.equal(await page.getByRole('spinbutton',{name:`Chapter progress for ${name}`,exact:true}).inputValue(),value);
}
assert.equal(await page.getByRole('checkbox',{name:'Import Tower of God',exact:true}).isChecked(),false);
await page.getByText(/This uses season numbering/).waitFor();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.getByRole('button',{name:'Import selected titles',exact:true}).click();
await page.getByRole('heading',{name:'Your stories made it.',exact:true}).waitFor();
let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('tandem:library:v1')));
assert.equal(stored.length,48);assert.equal(stored.find(e=>e.media.title==='Bad Born Blood').progress,103);
assert.equal(stored.find(e=>e.media.title==="The Extra's Academy Survival Guide").progress,145);
assert.equal(stored.find(e=>e.media.title==='Bleach').status,'planned');
await page.getByRole('link',{name:'Open your library',exact:true}).click();
await page.getByRole('button',{name:'Favorite Bad Born Blood',exact:true}).click();
stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('tandem:library:v1')));
assert.equal(stored.find(e=>e.media.title==='Bad Born Blood').progress,103,'Favoriting must not clamp imported progress to an older catalog count');
await page.getByRole('button',{name:'Mark next chapter of Bad Born Blood completed',exact:true}).click();
stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('tandem:library:v1')));
assert.equal(stored.find(e=>e.media.title==='Bad Born Blood').progress,104);
console.log(`PASS ${engine}: 49 subscription titles, Last Read/decimal/episode progress, no metadata noise, season review, max ${peak} lookups, progress preserved beyond catalog totals.`);
}finally{await browser.close()}
