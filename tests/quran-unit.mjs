import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {build}=require('esbuild');
await build({entryPoints:['lib/quran.ts'],outfile:'outputs/quran-unit.mjs',format:'esm',platform:'node',bundle:true});
const {SURAHS,normalizeRanges,rangeCount,juzFor}=await import('../outputs/quran-unit.mjs');
const q=JSON.parse(await readFile('public/quran/hafs.json','utf8'));
assert.equal(q.surahs.length,114);assert.equal(q.riwaya,'حفص عن عاصم');
assert.equal(q.surahs.reduce((n,s)=>n+s.ayahs.length,0),6236);
const parts=new Set();
for(let i=0;i<114;i++){
 const s=q.surahs[i];assert.equal(s.id,i+1);assert.equal(s.count,SURAHS[i].count);assert.equal(s.name,SURAHS[i].name);
 assert.equal(s.ayahs.length,s.count);
 s.ayahs.forEach((a,j)=>{assert.equal(a.number,j+1);assert.ok(a.text.trim());assert.equal(a.juz,juzFor(s.id,a.number));parts.add(a.juz)});
}
assert.equal(parts.size,30);assert.equal(juzFor(2,141),1);assert.equal(juzFor(2,142),2);assert.equal(juzFor(9,1),10);assert.equal(juzFor(114,6),30);
assert.equal(q.surahs[0].ayahs[0].text,'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ');
assert.equal(q.surahs.at(-1).ayahs.at(-1).text,'مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ');
assert.deepEqual(normalizeRanges([[7,7],[1,3],[2,6]],7),[[1,7]]);
assert.equal(rangeCount(normalizeRanges([[1,5],[3,9],[20,21]],286)),11);
for(const v of [[[0,1]],[[1,8]],[[5,2]],[[1.5,3]],[[1,'3']],{},null])assert.throws(()=>normalizeRanges(v,7));
console.log('PASS: Quran corpus: 114 surahs, 6236 ordered ayahs, 30 juz boundaries, Hafs source text, and deduplicated range validation.');
