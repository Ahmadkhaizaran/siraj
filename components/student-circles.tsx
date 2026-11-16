'use client';
import {useEffect,useState} from 'react';
import {BookOpen,CalendarCheck,Clock3} from 'lucide-react';
import {fetchWithDeadline} from '../lib/client-request';
type Row=Record<string,any>;
export default function StudentCircles({student,mosqueId}:{student:Row;mosqueId:string}){
 const [profile,setProfile]=useState<Row|null>(null),[recitation,setRecitation]=useState<Row|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const suffix='?mosque='+encodeURIComponent(mosqueId)+'&student_id='+encodeURIComponent(student.id);const response=await fetchWithDeadline('/api/student-profile'+suffix,{cache:'no-store'});const p=await response.json() as Row;if(!response.ok)throw Error(p.error||'تعذّر تحميل حلقاتك');setProfile(p);try{const rr=await fetchWithDeadline('/api/individual-recitation?mosque='+encodeURIComponent(mosqueId),{cache:'no-store'});if(rr.ok)setRecitation(await rr.json() as Row)}catch{}}
 useEffect(()=>{let live=true;const suffix='?mosque='+encodeURIComponent(mosqueId)+'&student_id='+encodeURIComponent(student.id);fetchWithDeadline('/api/student-profile'+suffix,{cache:'no-store'}).then(async r=>{const d=await r.json() as Row;if(!r.ok)throw Error(d.error);if(live)setProfile(d)}).catch(e=>{if(live)setError(e.message)});fetchWithDeadline('/api/individual-recitation?mosque='+encodeURIComponent(mosqueId),{cache:'no-store'}).then(async r=>{if(r.ok&&live)setRecitation(await r.json() as Row)}).catch(()=>{});return()=>{live=false}},[student.id,mosqueId]);
 async function respond(slot:Row,day:string,status:'confirmed'|'excused',reason=''){setBusy(true);setError('');try{const r=await fetchWithDeadline('/api/individual-recitation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mosque_id:mosqueId,action:'respond',id:slot.id,day,status,reason})});const d=await r.json() as Row;if(!r.ok)throw Error(d.error);await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const now=new Date(),local=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Beirut',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const dates=Array.from({length:7},(_,i)=>{const d=new Date(local+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)});
 const upcoming=dates.flatMap(day=>(recitation?.slots||[]).filter((slot:Row)=>slot.weekday===new Date(day+'T12:00:00Z').getUTCDay()).map((slot:Row)=>({slot,day})));
 return <section className="student-circles">
  <h2>حلقاتي</h2><p>الحلقات التعليمية ومواعيد التسميع الفردي الأسبوعية.</p>
  {error&&<p className="error">{error}</p>}
  {!profile?<p>جارٍ تحميل حلقاتك…</p>:<div className="cards-grid">{(profile.circles||[]).map((c:Row)=><article className="panel" key={c.id} style={{padding:20}}><BookOpen size={24}/><h3>{c.name}</h3><p>{c.teacher_name||'المعلم غير محدد'}</p><p>{c.schedule||'لم يحدد موعد بعد'}</p></article>)}</div>}
  {upcoming.length>0&&<section className="panel" style={{padding:20,marginTop:16}}><h3>التسميع الفردي</h3>{upcoming.map(({slot,day})=>{
   const response=recitation?.responses?.[slot.id+':'+day];
   const evaluation=recitation?.evaluations?.[slot.id+':'+day];
   const hour=Math.floor(slot.minute/60)%12||12;
   const time=hour+':'+String(slot.minute%60).padStart(2,'0')+(slot.minute<720?' صباحًا':' مساءً');
   return <article key={slot.id+day} className="panel" style={{padding:14,marginTop:12}}>
    <strong>{day} · {time}</strong>
    <p>{response?.status==='confirmed'?'تم تأكيد الحضور':response?.status==='excused'?'تم تسجيل الاعتذار':'بانتظار تأكيد الحضور'}</p>
    {evaluation&&<div><strong>تقييم التسميع</strong><p>{Object.entries(evaluation.scores||{}).map(([key,value])=>key+': '+value+'/5').join(' · ')}</p>{evaluation.notes&&<p>ملاحظة المعلم: {evaluation.notes}</p>}</div>}
    {!response&&<div className="staff-account-actions"><button className="btn primary" disabled={busy} onClick={()=>respond(slot,day,'confirmed')}>تأكيد الحضور</button><button className="btn secondary" disabled={busy} onClick={()=>{const reason=window.prompt('سبب الاعتذار');if(reason?.trim())respond(slot,day,'excused',reason.trim())}}>اعتذار</button></div>}
   </article>;
  })}</section>}
 </section>;
}
