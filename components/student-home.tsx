'use client';
import {useState,type FormEvent} from 'react';
import {BookOpen,CalendarDays,KeyRound,LogOut,Info} from 'lucide-react';
import RanksBoard from './ranks-board';
import ThemeSwitcher from './theme-switcher';
import AboutSiraj from './about-siraj';
import QuranReader from './quran-reader';
import SirajAssistant from './siraj-assistant';
import StudentLearning from './student-learning';
import DateClock from './date-clock';
import HadithCard from './hadith-card';
import CommunityCalendar from './community-calendar';
export default function StudentHome({data,onLogout}:{data:any;onLogout:()=>void}){
 const [tab,setTab]=useState('learning'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function password(e:FormEvent<HTMLFormElement>){e.preventDefault();const el=e.currentTarget;setBusy(true);setError('');try{const r=await fetch('/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(el)))});const d:any=await r.json();if(!r.ok)throw Error(d.error);setError('تم تغيير كلمة السر');el.reset()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const student=data.students[0];
 return <div className="student-home" dir="rtl"><header><a className="student-home-brand" href="/">سِراج</a><span>{data.mosques[0]?.name}</span><ThemeSwitcher/><button className="btn secondary" onClick={onLogout}><LogOut size={16}/>خروج</button></header><DateClock/><main><div className="page-heading"><div><span className="eyebrow">مساحتك التعليمية</span><h1>أهلًا، {student.name}</h1><p>كود الطالب: <bdi>{student.student_code}</bdi></p></div><span className="badge green">{student.status==='inactive'?'متوقف':'منتظم'}</span></div><RanksBoard/><HadithCard/><nav className="student-tabs">{[['learning','حفظي وتقييمي',BookOpen],['quran','المصحف الشريف',BookOpen],['calendar','التقويم والنشاطات',CalendarDays],['password','كلمة السر',KeyRound],['about','من نحن',Info]].map(([key,label,Icon]:any)=><button className={'btn '+(tab===key?'primary':'secondary')} key={key} onClick={()=>setTab(key)}><Icon size={17}/>{label}</button>)}</nav>{tab==='learning'&&<div className="panel student-learning-panel"><StudentLearning student={student} mosqueId={data.mosque_id} readOnly/></div>}{tab==='about'&&<><h2 className="student-about-title">من نحن</h2><AboutSiraj/></>}{tab==='quran'&&<QuranReader/>}{tab==='calendar'&&<CommunityCalendar/>}{tab==='password'&&<section className="panel student-password"><h2>تغيير كلمة السر</h2><form onSubmit={password}><label className="field"><span>كلمة السر الحالية</span><input name="current_password" required type="password" autoComplete="current-password" dir="ltr"/></label><label className="field"><span>كلمة سر جديدة (١٢ محرفًا على الأقل)</span><input name="new_password" required type="password" minLength={12} maxLength={128} autoComplete="new-password" dir="ltr"/></label><button className="btn primary" disabled={busy}>حفظ كلمة السر</button><p role="status">{error}</p></form></section>}</main><SirajAssistant role="student" onAction={a=>setTab(a.page)}/></div>
}
