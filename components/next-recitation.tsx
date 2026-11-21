'use client';
import {useEffect,useState} from 'react';
import {CalendarCheck,Clock3,BellRing,StickyNote} from 'lucide-react';
import {fetchWithDeadline} from '../lib/client-request';
type Row=Record<string,any>;
const dateAt=(day:string,minute:number)=>{const utc=Date.parse(day+'T00:00:00Z')+minute*60000;let result=utc;const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Beirut',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});for(let i=0;i<3;i++){const p=Object.fromEntries(f.formatToParts(new Date(result)).map(x=>[x.type,x.value]));result+=utc-Date.parse(p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':00Z')}return result};
export default function NextRecitation({mosqueId,onOpen}:{mosqueId:string;onOpen:()=>void}){
 const [data,setData]=useState<Row|null>(null),[now,setNow]=useState(Date.now());
 useEffect(()=>{let live=true;fetchWithDeadline('/api/individual-recitation?mosque='+encodeURIComponent(mosqueId),{cache:'no-store'}).then(async r=>{if(r.ok&&live)setData(await r.json() as Row)}).catch(()=>{});const timer=setInterval(()=>setNow(Date.now()),60000);return()=>{live=false;clearInterval(timer)}},[mosqueId]);
 if(!data?.slots?.length)return null;
 const dateFmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Beirut',year:'numeric',month:'2-digit',day:'2-digit'});
 const today=dateFmt.format(new Date(now));
 const upcoming=Array.from({length:8},(_,i)=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10)}).flatMap(day=>data.slots.filter((s:Row)=>s.weekday===new Date(day+'T12:00:00Z').getUTCDay()).map((slot:Row)=>({slot,day,at:dateAt(day,slot.minute)}))).filter(x=>x.at+((x.slot.duration||30)*60000)>now).sort((a,b)=>a.at-b.at);
 const next=upcoming[0];if(!next)return null;
 const response=data.responses?.[next.slot.id+':'+next.day];
 const diff=Math.max(0,next.at-now),days=Math.floor(diff/86400000),hours=Math.floor((diff%86400000)/3600000),mins=Math.ceil((diff%3600000)/60000);
 const left=days>=2?days+' أيام':days===1?'يوم و'+hours+' ساعة':hours>0?hours+' ساعة و'+mins+' دقيقة':mins+' دقيقة';
 const time=new Intl.DateTimeFormat('ar-LB',{timeZone:'Asia/Beirut',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(next.at));
 async function reply(status:'confirmed'|'excused'){const reason=status==='excused'?window.prompt('اكتب سبب الاعتذار عن اللقاء'):'';if(status==='excused'&&!reason?.trim())return;const r=await fetchWithDeadline('/api/individual-recitation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mosque_id:mosqueId,action:'respond',id:next.slot.id,day:next.day,status,reason})});if(r.ok){const updated=await fetchWithDeadline('/api/individual-recitation?mosque='+encodeURIComponent(mosqueId),{cache:'no-store'});if(updated.ok)setData(await updated.json() as Row)}else{const e=await r.json() as Row;window.alert(e.error||'تعذر حفظ الرد')}}
 return <section className="panel" style={{padding:20,marginBottom:16}}><span className="eyebrow">موعدك القادم · التسميع الفردي</span><h3><CalendarCheck size={22}/> {next.day} · {time}</h3><p>المعلّم: {next.slot.teacher_name||'المعلّم المكلّف'} · مدة التسميع {next.slot.duration||30} دقيقة</p>{next.slot.notes&&<p><StickyNote size={16}/> ملاحظة: {next.slot.notes}</p>}{!response&&data.reminders?.[next.slot.id+':'+next.day]&&<p className="learning-notice" role="status"><BellRing size={16}/> تنبيه من الإدارة: الرجاء تأكيد حضورك أو الاعتذار عن هذا اللقاء.</p>}<p><Clock3 size={17}/> متبقّي {left}</p><p>{response?.status==='confirmed'?'تم تأكيد حضورك':response?.status==='excused'?'تم تسجيل اعتذارك':'بانتظار تأكيد حضورك'}</p>{!response&&now<next.at&&<div className="staff-account-actions"><button className="btn primary" onClick={()=>reply('confirmed')}>تأكيد الحضور</button><button className="btn secondary" onClick={()=>reply('excused')}>اعتذار</button></div>}<button className="btn secondary" onClick={onOpen}>عرض حلقاتي</button></section>;
}
