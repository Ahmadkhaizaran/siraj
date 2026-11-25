'use client';
import {useEffect,useState} from 'react';
import {CalendarCheck} from 'lucide-react';
import {fetchWithDeadline} from '../lib/client-request';
import {beirutDay,TIMEZONE} from '../lib/islamic-calendar';
import {beirutStart,canExcuse,nextRecitationDay,type Slot} from '../lib/individual-recitation';
import {useServiceAccess} from './service-access';

type Row=Record<string,any>;
type Lesson={title:string;content:string};
type Circle={id:string;name:string;schedule:string;teacher_name:string|null;day:string|null;minute:number|null;lesson:Lesson|null};
type CircleEntry={circle_id:string;circle_name:string;day:string;status:string|null;lesson:Lesson|null};
type RecitationSlot=Slot&{teacher_name:string};
type Reply='confirmed'|'excused';
type Recitations={slots:RecitationSlot[];responses:Record<string,{status:Reply}>;reminders:Record<string,unknown>;evaluations:Record<string,Row>};
type CircleData={appointments:Circle[];history:CircleEntry[]};
type Appointment={key:string;day:string;minute:number|null;circle?:Circle;slot?:RecitationSlot};
const appointmentDate=new Intl.DateTimeFormat('ar-LB-u-ca-islamic-umalqura',{timeZone:TIMEZONE,weekday:'long',day:'numeric',month:'long'});
const clock=new Intl.DateTimeFormat('ar-LB',{timeZone:TIMEZONE,hour:'numeric',minute:'2-digit',hour12:true});
const attendance:Record<string,string>={present:'حاضر',late:'متأخر',absent:'غائب',excused:'بعذر'};
const replyLabel:Record<Reply,string>={confirmed:'تم تأكيد الحضور',excused:'تم تسجيل الاعتذار'};
async function request<T>(url:string,options?:RequestInit):Promise<T>{
 const response=await fetchWithDeadline(url,{cache:'no-store',...options});
 const data=await response.json() as T&{error?:string};
 if(!response.ok)throw Error(data.error||'تعذّر تحميل المواعيد');
 return data;
}
function AppointmentDate({day}:{day:string}){
 return <p><time dateTime={day}>{appointmentDate.format(new Date(day+'T12:00:00Z'))}</time></p>;
}
function remainingTime(milliseconds:number){
 const minutes=Math.ceil(milliseconds/60000);
 const [value,unit]=minutes>=2880?[Math.floor(minutes/1440),'day']:minutes>=60?[Math.ceil(minutes/60),'hour']:[minutes,'minute'];
 return new Intl.NumberFormat('ar-LB',{style:'unit',unit:String(unit),unitDisplay:'long'}).format(Number(value));
}
export default function StudentCircles({mosqueId,home=false,onOpen}:{mosqueId:string;home?:boolean;onOpen:()=>void}){
 const allowed=useServiceAccess(),circlesOn=allowed('circles'),recitationOn=allowed('individual');
 const [circles,setCircles]=useState<CircleData|null>(null),[recitation,setRecitation]=useState<Recitations|null>(null);
 const [circleError,setCircleError]=useState(''),[recitationError,setRecitationError]=useState(''),[replyError,setReplyError]=useState('');
 const [busy,setBusy]=useState(false),[retry,setRetry]=useState(0),[now,setNow]=useState(Date.now);
 const recitationUrl='/api/individual-recitation?mosque='+encodeURIComponent(mosqueId);
 const today=beirutDay(new Date(now));
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{
  let live=true;
  setCircles(null);setCircleError('');
  if(circlesOn)request<CircleData>('/api/student-circle-appointments').then(d=>{if(live)setCircles(d)}).catch(e=>{if(live)setCircleError(e.message)});
  return()=>{live=false};
 },[circlesOn,mosqueId,retry,today]);
 useEffect(()=>{
  let live=true;
  setRecitation(null);setRecitationError('');
  if(recitationOn)request<Recitations>(recitationUrl).then(d=>{if(live)setRecitation(d)}).catch(e=>{if(live)setRecitationError(e.message)});
  return()=>{live=false};
 },[recitationOn,recitationUrl,retry]);
 const circleData=circlesOn?circles:null,recitationData=recitationOn?recitation:null;
 const upcoming:Appointment[]=(circleData?.appointments||[]).flatMap(circle=>circle.day?[{key:'circle:'+circle.id,day:circle.day,minute:circle.minute,circle}]:[]);
 for(const slot of recitationData?.slots||[]){
  const day=nextRecitationDay(slot,now);
  upcoming.push({key:slot.id+':'+day,day,minute:slot.minute,slot});
 }
 upcoming.sort((a,b)=>a.day.localeCompare(b.day)||(a.minute??1440)-(b.minute??1440));
 const historyKeys=[...new Set([...Object.keys(recitationData?.evaluations||{}),...Object.keys(recitationData?.responses||{})])]
  .map(key=>({key,day:key.slice(-10),slot:recitationData?.slots.find(slot=>slot.id===key.slice(0,-11))}))
  .filter(item=>item.day<today||item.day===today&&(!item.slot||beirutStart(item.day,item.slot.minute)+(item.slot.duration??30)*60000<=now))
  .sort((a,b)=>b.day.localeCompare(a.day));
 const pending=(circlesOn&&!circles&&!circleError)||(recitationOn&&!recitation&&!recitationError);
 const errors=[circlesOn?circleError:'',recitationOn?recitationError:''].filter(Boolean);
 async function respond(slot:RecitationSlot,day:string,status:Reply){
  const reason=status==='excused'?window.prompt('اكتب سبب الاعتذار عن الموعد')?.trim():'';
  if(status==='excused'&&!reason)return;
  setBusy(true);setReplyError('');
  try{
   await request('/api/individual-recitation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mosque_id:mosqueId,action:'respond',id:slot.id,day,status,reason})});
   const key=slot.id+':'+day;
   setRecitation(data=>data?{...data,responses:{...data.responses,[key]:{status}}}:data);
  }catch(e){setReplyError((e as Error).message)}finally{setBusy(false)}
 }
 if(home&&!circlesOn&&!recitationOn)return null;
 return <section className="student-circles" style={{marginBottom:16}}>
  <div className="panel-heading"><h2>{home?'مواعيدي الأسبوعية':'مواعيدي'}</h2>{home&&<button type="button" className="btn secondary" onClick={onOpen}>عرض كل المواعيد</button>}</div>
  {errors.length>0&&<div className="error" role="alert">{errors.join(' · ')} <button type="button" className="btn secondary" onClick={()=>setRetry(n=>n+1)}>إعادة المحاولة</button></div>}
  {replyError&&<p className="error" role="alert">{replyError}</p>}
  {pending&&<p role="status">جارٍ تحميل المواعيد…</p>}
  {!pending&&!upcoming.length&&!errors.length&&<p>ما عندك مواعيد قادمة حاليًا.</p>}
  {upcoming.map(({key,day,minute,circle,slot},index)=>{
   const start=minute===null?null:beirutStart(day,minute),response=slot?recitationData?.responses[key]:undefined;
   const canConfirm=slot&&!response&&start!==null&&now<start;
   const canCancel=slot&&response?.status!=='excused'&&canExcuse(day,slot.minute,now);
   return <article className="panel" key={key} style={{padding:16,marginTop:12,...(home&&index===0?{borderInlineStart:'4px solid var(--green)'}:{})}}>
    {home&&index===0&&<span className="eyebrow"><CalendarCheck size={17} aria-hidden="true"/> أقرب موعد</span>}
    <h3>{circle?.name||'التسميع الفردي'}</h3>
    {circle?.lesson?.title&&<p><strong>{circle.lesson.title}</strong></p>}
    <AppointmentDate day={day}/>
    <p>{start!==null?'الساعة '+clock.format(start).replace(/ ص$/,' صباحًا').replace(/ م$/,' مساءً'):circle?.schedule||'الساعة غير محدّدة'}{(slot?.teacher_name||circle?.teacher_name)&&' · مع '+(slot?.teacher_name||circle?.teacher_name)}</p>
    {start!==null&&start>now&&<p>المتبقّي {remainingTime(start-now)}</p>}
    {slot?.notes&&<p>{slot.notes}</p>}
    {slot&&!response&&Boolean(recitationData?.reminders[key])&&<p className="learning-notice">تنبيه من الإدارة لتأكيد الحضور أو الاعتذار.</p>}
    {slot&&<p role="status">{response?replyLabel[response.status]:start!==null&&now>=start?'الموعد جارٍ':'موعد قريب بانتظار ردّك'}</p>}
    {slot&&(canConfirm||canCancel)&&<div className="staff-account-actions">
     {canConfirm&&<button type="button" className="btn primary" disabled={busy} onClick={()=>respond(slot,day,'confirmed')}>تأكيد الحضور</button>}
     {canCancel&&<button type="button" className="btn secondary" disabled={busy} onClick={()=>respond(slot,day,'excused')}>اعتذار عن الموعد</button>}
    </div>}
    {slot&&response?.status!=='excused'&&start!==null&&now<start&&<small>يتوقّف تعديل الرد قبل الموعد بـ٣٠ دقيقة.</small>}
   </article>;
  })}
  {!home&&(circleData?.appointments||[]).filter(circle=>!circle.day).map(circle=><article className="panel" key={circle.id} style={{padding:16,marginTop:12}}><h3>{circle.name}</h3><p>المعلّم: {circle.teacher_name||'غير محدّد'}</p><p>{circle.schedule||'الموعد غير محدّد'}</p></article>)}
  {!home&&<section aria-labelledby="student-appointment-history" style={{marginTop:24}}>
   <h2 id="student-appointment-history">سجل اللقاءات والدروس</h2>
   {!pending&&!errors.length&&!circleData?.history.length&&!historyKeys.length&&<p>ما في لقاءات سابقة مسجّلة بعد.</p>}
   {circleData?.history.map(entry=><article className="panel" key={entry.circle_id+':'+entry.day} style={{padding:16,marginTop:12}}>
    <h3>{entry.circle_name}</h3><AppointmentDate day={entry.day}/>
    {entry.lesson?.title&&<p><strong>{entry.lesson.title}</strong></p>}
    {entry.lesson?.content&&<p style={{whiteSpace:'pre-wrap'}}>{entry.lesson.content}</p>}
    {entry.status&&<p>الحضور: {attendance[entry.status]||entry.status}</p>}
   </article>)}
   {historyKeys.map(({key,day,slot})=>{
    const evaluation=recitationData?.evaluations[key],response=recitationData?.responses[key];
    return <article className="panel" key={key} style={{padding:16,marginTop:12}}>
     <h3>التسميع الفردي</h3><AppointmentDate day={day}/>
     {slot?.teacher_name&&<p>المعلّم: {slot.teacher_name}</p>}
     {response&&<p>{replyLabel[response.status]}</p>}{evaluation&&<RecitationEvaluation evaluation={evaluation}/>}
    </article>;
   })}
  </section>}
 </section>;
}
const AXES:[string,string][]=[['memorization','الحفظ'],['retention','الثبات'],['tajweed','التجويد'],['performance','جودة التلاوة']];
export function RecitationEvaluation({evaluation}:{evaluation:Row}){
 const scores=AXES.filter(([key])=>evaluation.scores?.[key]!==undefined);
 return <div className="recitation-evaluation">{evaluation.recited&&<p><strong>ما تم تسميعه:</strong> {evaluation.recited}</p>}{scores.length>0&&<ul className="recitation-scores">{scores.map(([key,label])=><li key={key}><span>{label}</span><strong>{evaluation.scores[key]} / ٥</strong></li>)}</ul>}{evaluation.notes&&<p><strong>ملاحظة المعلّم:</strong> {evaluation.notes}</p>}</div>;
}
