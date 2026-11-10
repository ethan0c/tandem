import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLibraryText} from '../src/lib/library';
const records=JSON.parse(readFileSync(new URL('./fixtures/weebcentral-subscriptions.json',import.meta.url),'utf8')) as string[][];
function paste(rows:string[][]){return `Weeb Central Logo\nQuick Search...\nHome\nSearch\nGeneral Chat\nRandom\nAccount\nMy Subscriptions (49)\nSearch for series...\n${rows.map(([title,latest,lastRead,status],i)=>` cover\n${title}\nLatest:\n${latest}\n· ${i<3?'4h':'Sep 7, 2024'}\nLast Read:\n${lastRead}\nStatus:\n${status}`).join('\n')}\nHome\nContact\nPrivacy\nFAQ\nExport\nCopyright © Weeb Central`}
test('full Weeb Central paste produces exactly the 49 series in source order',()=>{
  const rows=parseLibraryText(paste(records));
  assert.equal(rows.length,49);
  assert.deepEqual(rows.map(row=>row.title),records.map(row=>row[0]));
  for(let i=0;i<records.length;i++){
    const source=records[i][2];
    const number=source==='None'?0:Number(source.match(/(\d+(?:\.\d+)?)$/)![1]);
    assert.equal(rows[i].progress,number,records[i][0]);
    assert.equal(rows[i].status,source==='None'?'planned':'current');
  }
  assert.equal(rows.find(row=>row.title==='Bad Born Blood')?.progress,103,'Last Read can exceed Latest');
  assert.equal(rows.find(row=>row.title==='Choujin X')?.progress,68.2);
  assert.match(rows.find(row=>row.title==='Tower of God')?.progressNote||'',/season numbering/);
});
test('missing Last Read never imports Latest as progress; inline labels and duplicate rows work',()=>{
  assert.equal(parseLibraryText('cover\nBlue Lock\nLatest: Chapter 368\nLast Read: Chapter 25.5\nStatus: Ongoing')[0].progress,25.5);
  const missing=parseLibraryText('cover\nBlue Lock\nLatest: Chapter 368\nStatus: Ongoing')[0];
  assert.equal(missing.progress,0);assert.ok(missing.progressNote);
  const duplicate=parseLibraryText(paste([records[0],['Blue Lock','Chapter 400','Chapter 200','Complete']]));
  assert.equal(duplicate.length,1);assert.equal(duplicate[0].progress,368);
});
