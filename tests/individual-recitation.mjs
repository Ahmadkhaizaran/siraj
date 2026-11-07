import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const req=createRequire(import.meta.resolve('wrangler/package.json'));
await req('esbuild').build({entryPoints:['lib/individual-recitation.ts'],bundle:true,platform:'node',format:'esm',outfile:'outputs/recitation-unit.mjs'});
const {validateSlot,beirutStart,canExcuse}=await import('../outputs/recitation-unit.mjs');
const base={id:'a',student_id:'s',teacher_id:'t',weekday:1,minute:1080};
assert.throws(()=>validateSlot({...base,id:'b',minute:1095},[base]));
validateSlot({...base,id:'b',minute:1110},[base]);
validateSlot({...base,id:'b',student_id:'s2',teacher_id:'t2'},[base]);
assert.throws(()=>validateSlot({...base,id:'b',teacher_id:'t2'},[base]));
assert.throws(()=>validateSlot({...base,minute:1420},[]));
const short={...base,duration:15};
validateSlot({...base,id:'b',minute:1095,duration:15},[short]);
assert.throws(()=>validateSlot({...base,id:'b',minute:1094,duration:15},[short]));
assert.throws(()=>validateSlot({...base,id:'b',minute:1060,duration:30},[short]));
assert.throws(()=>validateSlot({...base,duration:0},[]));
assert.throws(()=>validateSlot({...base,duration:1.5},[]));
validateSlot({...base,minute:1425,duration:15},[]);
assert.throws(()=>validateSlot({...base,minute:1426,duration:15},[]));
for(const day of ['2026-11-09','2027-07-05']){
 const start=beirutStart(day,1080);
 assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Beirut',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(start)),'18:00');
 assert.equal(canExcuse(day,1080,start-1800001),true);
 assert.equal(canExcuse(day,1080,start-1800000),false);
 assert.equal(canExcuse(day,1080,start-1500000),false);
}
console.log('PASS: half-hour overlaps, adjacent slots, teacher/student conflicts and exact Beirut cancellation deadline in summer and winter');
