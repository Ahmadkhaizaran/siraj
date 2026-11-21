// End-to-end individual recitation flow on PostgreSQL: auto-suggested slots, notes, evaluation,
// supervisor reminders, student confirmation/excuse and teacher scoping.
import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const req=createRequire(import.meta.resolve('wrangler/package.json'));
const {suggestNext}=await (async()=>{await req('esbuild').build({entryPoints:['lib/individual-recitation.ts'],bundle:true,platform:'node',format:'esm',outfile:'outputs/recitation-flow-unit.mjs'});return import('../outputs/recitation-flow-unit.mjs')})();
assert.equal(suggestNext([],'t',1),null);
assert.deepEqual(suggestNext([{id:'a',student_id:'s',teacher_id:'t',weekday:1,minute:1050,duration:30}],'t',1),{minute:1080,duration:30});
assert.deepEqual(suggestNext([{id:'a',student_id:'s',teacher_id:'t',weekday:1,minute:1050,duration:30},{id:'b',student_id:'s2',teacher_id:'t',weekday:1,minute:1080,duration:20}],'t',1),{minute:1100,duration:20});
assert.equal(suggestNext([{id:'a',student_id:'s',teacher_id:'t2',weekday:1,minute:1050}],'t',1),null);
assert.equal(suggestNext([{id:'a',student_id:'s',teacher_id:'t',weekday:1,minute:1410,duration:30}],'t',1),null);
const h=await (await import('./postgres-harness.mjs')).postgresHarness(req('esbuild').build);const origin='http://terminal.local:4173';
function client(){let cookie='';return async(path,body,expected=200)=>{const r=await h.localFetch(origin+'/api/'+path,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{Origin:origin,'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json();assert.equal(r.status,expected,path+' '+JSON.stringify(d));if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return d}}
try{
 const owner=client(),primary=client(),teacher=client(),pupil=client();
 await owner('auth/setup',{setup_key:'local-setup-token',name:'Synthetic Owner',username:'synthetic.owner',password:'SyntheticOnly123!'},201);
 const mid=(await owner('data')).mosques[0].id;
 const boss=await owner('users',{mosque_id:mid,name:'Synthetic Primary',english_name:'Synthetic Primary',phone:'70000001',role:'primary',auto_credentials:true},201);await primary('auth/login',boss.credentials);
 const tutor=await owner('users',{mosque_id:mid,name:'Synthetic Tutor',english_name:'Synthetic Tutor',phone:'70000002',role:'teacher',auto_credentials:true},201);await teacher('auth/login',tutor.credentials);
 assert.equal((await teacher('data')).features.individual_recitation,true);
 const s1=await primary('students',{mosque_id:mid,name:'طالب أول',english_name:'Student One',contact:'03123456'},201);
 const s2=await primary('students',{mosque_id:mid,name:'طالب ثان',english_name:'Student Two'},201);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Beirut'}).format(new Date());
 const past=new Date(Date.parse(today+'T12:00:00Z')-7*86400000).toISOString().slice(0,10),future=new Date(Date.parse(today+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
 const weekday=new Date(future+'T12:00:00Z').getUTCDay();
 await primary('individual-recitation',{mosque_id:mid,action:'save',student_id:s1.id,teacher_id:tutor.id,weekday,minute:1050,duration:30,notes:'حضّر سورة الملك'});
 await primary('individual-recitation',{mosque_id:mid,action:'save',student_id:s2.id,teacher_id:tutor.id,weekday,minute:1070,duration:30},409);
 await primary('individual-recitation',{mosque_id:mid,action:'save',student_id:s2.id,teacher_id:tutor.id,weekday,minute:1080,duration:30});
 let state=await primary('individual-recitation?mosque='+mid);
 const first=state.slots.find(s=>s.student_id===s1.id);assert.equal(first.notes,'حضّر سورة الملك');
 assert.ok(state.students.find(s=>s.id===s1.id).contact);
 // Evaluation for a past occurrence (regression: the date check rejected every valid date).
 await teacher('individual-recitation',{mosque_id:mid,action:'evaluate',id:first.id,day:past,scores:{memorization:5,tajweed:4},recited:'الملك ١–١٠',notes:'ممتاز'});
 await teacher('individual-recitation',{mosque_id:mid,action:'evaluate',id:first.id,day:future,scores:{memorization:5}},400);
 const seen=await teacher('individual-recitation?mosque='+mid);
 assert.equal(seen.evaluations[first.id+':'+past].scores.memorization,5);
 assert.equal(seen.students[0].contact,undefined);
 await teacher('individual-recitation',{mosque_id:mid,action:'remind',id:first.id,day:future},403);
 await teacher('individual-recitation',{mosque_id:mid,action:'save',student_id:s1.id,teacher_id:tutor.id,weekday,minute:600},403);
 // Supervisor reminder shows on the student's account until they answer.
 await primary('individual-recitation',{mosque_id:mid,action:'remind',id:first.id,day:future});
 await primary('individual-recitation',{mosque_id:mid,action:'remind',id:first.id,day:future});
 state=await primary('individual-recitation?mosque='+mid);assert.equal(state.reminders[first.id+':'+future].count,2);
 await pupil('auth/login',s1.credentials);
 let mine=await pupil('individual-recitation?mosque='+mid);
 assert.equal(mine.slots.length,1);assert.equal(mine.slots[0].notes,'حضّر سورة الملك');assert.equal(mine.slots[0].teacher_name,'Synthetic Tutor');
 assert.ok(mine.reminders[first.id+':'+future]);
 await pupil('individual-recitation',{mosque_id:mid,action:'remind',id:first.id,day:future},403);
 await pupil('individual-recitation',{mosque_id:mid,action:'respond',id:first.id,day:future,status:'excused',reason:''},400);
 await pupil('individual-recitation',{mosque_id:mid,action:'respond',id:first.id,day:future,status:'excused',reason:'سفر عائلي'});
 mine=await pupil('individual-recitation?mosque='+mid);
 assert.equal(mine.responses[first.id+':'+future].reason,'سفر عائلي');assert.equal(mine.reminders[first.id+':'+future],undefined);
 await primary('individual-recitation',{mosque_id:mid,action:'remind',id:first.id,day:future},409);
 console.log('PASS: individual recitation launch flow — auto-suggest, notes, evaluation, reminders, excuse and teacher scope');
}finally{await h.close?.()}
