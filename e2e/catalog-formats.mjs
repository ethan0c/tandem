import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
const base=process.env.BASE_URL||'http://localhost:3000',engine=process.env.TEST_ENGINE||'chromium';
const seed=JSON.parse(readFileSync(new URL('../src/content/catalog.json',import.meta.url)));
const codes=['manga','manhwa','manhua','novel','oneshot','doujin','oel'];
const labels=['Manga','Manhwa','Manhua','Novels','One-shots','Doujinshi','English originals'];
const items=codes.map((format,i)=>({...seed.find(m=>m.kind==='manga'),id:String(91000+i),title:`${labels[i]} Alpha`,aliases:[],format,poster:'',year:2024,status:'current',genres:['Action']}));
items.push({...items[1],id:'91009',title:'Manhwa Beta',format:'MANHWA',genres:['Drama'],status:'finished',year:2023});
const anime=[{...seed[0],id:'92000',title:'TV sample',format:'TV',poster:''},{...seed[0],id:'92001',title:'Movie sample',format:'movie',poster:''}];
const browser=await(engine==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true}));
mkdirSync(`/private/tmp/tandem-formats-${engine}`,{recursive:true});
async function settled(page){await page.waitForFunction(()=>!document.querySelector('.media-grid[aria-busy="true"]'));}
async function geometry(page,label){
  const r=await page.evaluate(()=>{
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    return {overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...document.querySelectorAll('select.field')].flatMap(el=>{
      const b=el.getBoundingClientRect();if(!b.width||!b.height)return[];
      const s=getComputedStyle(el);ctx.font=`${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      const needed=ctx.measureText(el.selectedOptions[0]?.textContent||'').width+parseFloat(s.paddingLeft)+parseFloat(s.paddingRight)+2;
      return needed>b.width+1?[{text:el.selectedOptions[0]?.textContent,width:b.width,needed}]:[];
    })};
  });assert.equal(r.overflow,false,`${label}: horizontal overflow`);assert.deepEqual(r.clipped,[],`${label}: selected filter text clipped`);
}
try{
for(const width of (process.env.TEST_WIDTHS||'320,390,768,1024,1440').split(',').map(Number)){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.addInitScript(data=>localStorage.setItem('tandem:library:v1',JSON.stringify(data.map((media,i)=>({media,progress:3,status:i===7?'planned':'current',favorite:i%2===0,subscribed:true,updatedAt:i+1})))),[...items,...anime]);
  const queries=[];
  await context.route('**/api/catalog?**',async route=>{
    const p=new URL(route.request().url()).searchParams;queries.push(Object.fromEntries(p));
    let filtered=(p.get('kind')==='anime'?anime:items).filter(m=>(!p.get('format')||m.format.toLowerCase()===p.get('format').toLowerCase())&&(!p.get('q')||m.title.toLowerCase().includes(p.get('q').toLowerCase()))&&(!p.get('genre')||m.genres.some(g=>g.toLowerCase()===p.get('genre')))&&(!p.get('status')||m.status===p.get('status'))&&(!p.get('year')||String(m.year)===p.get('year')));
    let hasMore=false;
    if(p.get('format')==='manhwa'&&!p.get('q')&&!p.get('genre')){const n=Number(p.get('page')||1);hasMore=n===1;filtered=filtered.slice(n-1,n);}
    await route.fulfill({json:{items:filtered,hasMore,source:'live'}});
  });
  const page=await context.newPage();
  await page.goto(`${base}/manga`);await page.getByRole('link',{name:'Manhwa Alpha',exact:true}).waitFor();await settled(page);
  const format=page.getByRole('combobox',{name:'Format',exact:true});
  await format.selectOption('manhwa');await settled(page);assert.equal(await page.locator('.media-card:visible').count(),1);
  await page.getByRole('button',{name:'Explore more',exact:true}).click();await settled(page);assert.equal(await page.locator('.media-card:visible').count(),2);
  await page.getByRole('textbox',{name:'Search titles',exact:true}).fill('Alpha');await settled(page);
  await page.getByRole('combobox',{name:'Genre',exact:true}).selectOption('action');await settled(page);
  await page.getByRole('combobox',{name:'Release status',exact:true}).selectOption('current');await settled(page);
  await page.getByRole('textbox',{name:'Release year',exact:true}).fill('2024');await settled(page);
  await format.selectOption('manhua');await settled(page);
  assert.equal(await page.locator('.media-card:visible .media-title').textContent(),'Manhua Alpha');
  assert.equal(queries.at(-1).page,'1');assert.equal(queries.at(-1).genre,'action');assert.equal(queries.at(-1).q,'Alpha');
  for(const code of codes){await format.selectOption(code);await settled(page);assert.ok(await page.locator('.media-card:visible').count());await geometry(page,`${width} ${code}`)}
  for (const genre of ['science-fiction','slice-of-life']) { await page.getByRole('combobox',{name:'Genre',exact:true}).selectOption(genre); await settled(page); await geometry(page,`${width} long genre ${genre}`); }
  await page.getByRole('textbox',{name:'Release year',exact:true}).fill('9999');await settled(page);
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();await settled(page);assert.equal(await format.inputValue(),'');
  await page.screenshot({path:`/private/tmp/tandem-formats-${engine}/${width}-browse.png`,fullPage:true});
  await format.selectOption('manhwa');await settled(page);
  await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'Anime',exact:true}).click();
  await page.getByRole('heading',{name:'Anime',exact:true}).waitFor();await settled(page);
  assert.equal(await format.inputValue(),'','Anime must not retain a reading-format filter');
  await format.selectOption('movie');await settled(page);assert.equal(await page.locator('.media-card:visible').count(),1);
  await page.goto(`${base}/library`);await page.getByRole('link',{name:'Manhwa Alpha',exact:true}).waitFor();
  const savedFormat=page.getByRole('combobox',{name:'Format',exact:true});await savedFormat.selectOption('manhwa');
  assert.equal(await page.locator('.library-row:visible').count(),2);
  await page.getByRole('combobox',{name:'Filter by status',exact:true}).selectOption('current');
  assert.equal(await page.locator('.library-row:visible').count(),1);
  assert.ok((await page.locator('.library-row:visible').textContent()).includes('Manhwa Alpha'));
  await page.getByRole('combobox',{name:'Filter by status',exact:true}).selectOption('all');
  for(const code of codes){await savedFormat.selectOption(code);assert.ok(await page.locator('.library-row:visible').count());await geometry(page,`${width} saved ${code}`)}
  await page.getByRole('button',{name:/^anime$/i}).click();assert.equal(await savedFormat.inputValue(),'');
  await savedFormat.selectOption('movie');assert.equal(await page.locator('.library-row:visible').count(),1);
  await page.screenshot({path:`/private/tmp/tandem-formats-${engine}/${width}-library.png`,fullPage:true});
  await context.close();console.log(`PASS ${engine} ${width}px: reading/anime formats, full-library filtering, combined search filters, pagination/reset, and unclipped controls.`);
}
}finally{await browser.close()}
