// Real browser auth with a disposable confirmed test user. No emails are sent; credentials stay in memory.
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const project=process.argv[2],base=process.env.BASE_URL||'http://localhost:3000';
if(!/^[a-z]{20}$/.test(project||''))throw new Error('Pass the Tandem project reference');
const keys=JSON.parse(execFileSync('supabase',['projects','api-keys','--project-ref',project,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const publicKey=keys.find(k=>k.name==='anon')?.api_key,adminKey=keys.find(k=>k.name==='service_role')?.api_key;
if(!publicKey||!adminKey)throw new Error('Project authentication is unavailable');
const options={auth:{persistSession:false,autoRefreshToken:false}},url=`https://${project}.supabase.co`;
const admin=createClient(url,adminKey,options),probe=createClient(url,publicKey,options);
const email=`tandem-qa-${randomUUID()}@example.com`,password=randomUUID();
let userId,browser;
try{
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);userId=created.data.user.id;
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  const seed=JSON.parse(readFileSync(new URL('../src/content/catalog.json',import.meta.url)));
  await context.route('**/api/catalog?**',route=>route.fulfill({json:{items:seed.filter(m=>m.kind==='anime'),source:'live',hasMore:false}}));
  const scripts=[];page.on('response',r=>{if(r.request().resourceType()==='script')scripts.push(r.body().then(b=>b.toString()).catch(()=>''))});
  await page.goto(`${base}/anime`);await page.locator('.media-card').first().waitFor();await page.waitForTimeout(400);
  assert.ok(!(await Promise.all(scripts)).some(s=>s.includes('GoTrueClient')),'Guest browse should not load the account SDK');
  await page.getByRole('link',{name:'Sign in',exact:true}).click();
  await page.getByRole('textbox',{name:'Email',exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
  await page.locator('button[type="submit"]').click();await page.getByRole('heading',{name:'Your corner of Tandem.',exact:true}).waitFor({timeout:30000});
  await page.goto(`${base}/anime`);await page.getByRole('button',{name:`Save ${seed[0].title} to library`,exact:true}).click();
  assert.ifError((await probe.auth.signInWithPassword({email,password})).error);
  for(let attempt=0;attempt<20;attempt++){
    const saved=await probe.from('library_entries').select('entry').eq('media_key',`anime:${seed[0].id}`);
    assert.ifError(saved.error);if(saved.data.length)break;
    if(attempt===19)assert.fail('Browser cloud save did not persist');
    await new Promise(r=>setTimeout(r,200));
  }
  await page.reload();await page.getByRole('link',{name:'My account',exact:true}).waitFor({timeout:30000});
  await page.getByRole('button',{name:`Remove ${seed[0].title} from library`,exact:true}).waitFor();
  await page.getByRole('link',{name:'My account',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.getByRole('link',{name:'Sign in',exact:true}).waitFor();
  await page.goto(`${base}/library`);assert.equal(await page.getByText(seed[0].title,{exact:true}).count(),0,'Private account library must not appear in the guest library');
  console.log('PASS: guest SDK deferral, real browser sign-in, private cloud save, session restoration, and sign-out isolation.');
}finally{
  await browser?.close();await probe.auth.signOut();
  if(userId){const removed=await admin.auth.admin.deleteUser(userId);if(removed.error)throw new Error('Could not remove disposable test account');console.log('Removed disposable test account and its library rows.');}
}
