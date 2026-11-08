'use client';
import {ServiceBoundary} from './service-access';
import {useEffect,useState} from 'react';
import AchievementCard from './achievement-card';
import {RANKS} from '../lib/student-ranks';
type Row=Record<string,any>;
function StudentCertificatesContent({data,studentId,mosqueId}:{data:Row;studentId:string;mosqueId:string}){
 const manage=data.certificate_access==='manage';
 const [awards,setAwards]=useState<Row[]|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[index,setIndex]=useState(data.rank.index),[retry,setRetry]=useState(0);
 useEffect(()=>setIndex(data.rank.index),[data.rank.index]);
 async function load(){const r=await fetch('/api/student-certificates?mosque='+encodeURIComponent(mosqueId)+'&student_id='+encodeURIComponent(studentId),{cache:'no-store'});const d:any=await r.json();if(!r.ok)throw Error(d.error);return d.awards}
 useEffect(()=>{let live=true;setAwards(null);load().then(a=>{if(live)setAwards(a)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[mosqueId,studentId,retry]);
 if(!manage&&!awards?.length)return error?<p className="error" role="alert">{error}<button className="btn secondary" onClick={()=>setRetry(n=>n+1)}>إعادة المحاولة</button></p>:null;
 return <section className="student-certificate-grants"><h3>{manage?'إدارة شهادات الطالب':'شهاداتي الممنوحة'}</h3>{manage&&<><p>المعاينة والطباعة للمشرفين. لا تظهر شهادة للطالب قبل منحها له.</p><AchievementCard data={data} onIndexChange={setIndex}/><button className="btn primary" disabled={busy||!awards||awards.some(a=>a.index===index)} onClick={async()=>{setBusy(true);setError('');try{const r=await fetch('/api/student-certificates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mosque_id:mosqueId,student_id:studentId,index})});const d:any=await r.json();if(!r.ok)throw Error(d.error);setAwards(await load());setNotice('مُنحت الشهادة وأصبحت ظاهرة للطالب')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>{busy?'جارٍ المنح…':awards?.some(a=>a.index===index)?'الشهادة ممنوحة':'منح الشهادة للطالب'}</button></>}{awards?.map(a=><details key={a.index}><summary>شهادة {RANKS[a.index].name} · مُنحت بتاريخ {a.issued_at.slice(0,10)}</summary><AchievementCard data={a.snapshot} grantedIndex={a.index}/></details>)}{notice&&<p role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}</section>;
}

export default function StudentCertificates(props:Parameters<typeof StudentCertificatesContent>[0]){return <ServiceBoundary service="certificates"><StudentCertificatesContent {...props}/></ServiceBoundary>}
