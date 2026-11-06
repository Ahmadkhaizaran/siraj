'use client';
import RankIcon from './rank-icon';
import {useEffect,useState} from 'react';
import AchievementCard from './achievement-card';
import {MARKS,RANKS,rankFor} from '../lib/student-ranks';
type Row=Record<string,any>;
export function RankBadge({points}:{points:number}){const rank=rankFor(points);return <strong className="rank-badge" style={{borderColor:rank.color}}><span aria-hidden="true"><RankIcon index={rank.index}/></span>{rank.name}</strong>}
export default function StudentMotivation({studentId,mosqueId}:{studentId:string;mosqueId:string;readOnly?:boolean}){
 const [data,setData]=useState<Row|null>(null),[error,setError]=useState('');
 const url='/api/motivation?mosque='+encodeURIComponent(mosqueId)+'&student_id='+encodeURIComponent(studentId);
 async function load(){const r=await fetch(url,{cache:'no-store'}),d:any=await r.json();if(!r.ok)throw Error(d.error);setData(d);setError('')}
 useEffect(()=>{let live=true;setData(null);setError('');fetch(url,{cache:'no-store'}).then(async r=>{const d:any=await r.json();if(!r.ok)throw Error(d.error);if(live)setData(d)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[url]);
 if(!data)return <section className="motivation-panel"><p role="status">{error||'جارٍ تحميل سجل الاجتهاد…'}</p>{error&&<button className="btn secondary" onClick={()=>load().catch(e=>setError(e.message))}>إعادة التحميل</button>}</section>;
 const rank=rankFor(data.points),statuses:Record<string,string>={present:'حاضر',late:'متأخر',absent:'غائب',excused:'بعذر'};
 return <section className="motivation-panel"><h3>رحلة الاجتهاد والرتب</h3><div className="rank-summary"><RankBadge points={data.points}/><strong>{data.points} نقطة</strong><span>{rank.remaining?'باقي '+rank.remaining+' نقطة لتصبح '+RANKS[rank.index+1].name:<>وصلت إلى رتبة رائد <RankIcon index={6} size={18}/> — واصل زيادة رصيدك</>}</span></div><progress max={35} value={rank.progress} aria-label="التقدم نحو الرتبة التالية"/><div className="rank-steps">{RANKS.map((r,i)=><span key={r.name} style={{borderColor:r.color}} className={i<=rank.index?'achieved':''}><RankIcon index={i}/> {r.name}<small>{i*35} نقطة</small></span>)}</div><p>يسجّل المدرّس الحضور والعلامات من لقاء كل حلقة، وتتجمّع هنا عبر الأيام والحلقات. الحد الأقصى للقاء واحد ٣٠ نقطة؛ تعديل اللقاء يصحّح رصيده ولا يكرّره. السجلات السابقة تبقى محفوظة.</p><AchievementCard data={data}/><details open><summary>سجل اللقاءات والنقاط ({data.records.length})</summary>{data.records.map((r:Row)=><article className="rank-history" key={r.day+(r.circle_id||r.meeting)}><strong>{new Date(r.day+'T12:00:00Z').toLocaleDateString('ar-LB',{timeZone:'Asia/Beirut',weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {r.meeting} · {r.points} نقطة</strong><p>{r.attendance_status&&<strong>{statuses[r.attendance_status]} · </strong>}{MARKS.map(([key,label,max])=>label+': '+r[key]+'/'+max).join(' · ')}</p><small>{r.teacher_name} · تعديل {r.revision}{!r.circle_id?' · سجل سابق':''}</small>{r.notes&&<p>{r.notes}</p>}</article>)}</details>{error&&<p className="error" role="alert">{error}</p>}</section>
}
