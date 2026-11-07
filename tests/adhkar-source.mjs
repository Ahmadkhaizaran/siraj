import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const bytes=await readFile('lib/adhkar-data.json'),data=JSON.parse(bytes),manifest=JSON.parse(await readFile('docs/Adhkar-Source.json'));
assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.data_sha256);
assert.equal(data.length,146);
const expected={morning:19,evening:20,bedtime:10,'prayer-general':11,'prayer-fajr':2,'prayer-maghrib':1,'ruqyah-general':8,'ruqyah-hasad':5,'ruqyah-ayn':3,'ruqyah-sihr':5,'ruqyah-mass':6,'ruqyah-anxiety':6,'comprehensive-dua':50};
for(const [key,count]of Object.entries(expected)){const list=data.filter(d=>d.category===key);assert.equal(list.length,count);assert.equal(new Set(list.map(d=>d.id)).size,list.length)}
for(const d of data){assert.ok(d.text.length>0);assert.ok(Number.isSafeInteger(d.count)&&d.count>0)}
const require=createRequire(import.meta.resolve('wrangler/package.json'));await require('esbuild').build({entryPoints:['lib/adhkar.ts'],bundle:true,format:'esm',platform:'node',outfile:'outputs/adhkar-unit.mjs'});
const {adhkarFor}=await import('../outputs/adhkar-unit.mjs');
for(const [prayer,count]of Object.entries({fajr:13,dhuhr:11,asr:11,maghrib:12,isha:11})){const list=adhkarFor('prayer-'+prayer);assert.equal(list.length,count);assert.deepEqual(list.slice(0,11),data.filter(d=>d.category==='prayer-general'))}
assert.equal(adhkarFor('unlimited-subhanallah')[0].count,0);assert.deepEqual(adhkarFor('missing'),[]);
console.log('PASS: complete source snapshot, exact text integrity, all category counts and five prayer compositions');
