'use client';
import {usePageAccess} from './service-access';
import {useEffect,useRef,useState} from 'react';
import useStudentNavigationSpace from './use-student-navigation-space';
import {BookOpen,Info,Trophy,UserRound,ArrowRight,Award,LayoutDashboard} from 'lucide-react';
import RanksBoard from './ranks-board';
import ThemeSwitcher from './theme-switcher';
import AboutSiraj from './about-siraj';
import IslamicTools from './islamic-tools';
import SirajAssistant from './siraj-assistant';
import StudentLearning from './student-learning';
import DateClock from './date-clock';
import HadithCard from './hadith-card';
import MosqueLogo from './mosque-logo';
import StudentAccount from './student-account';
import StudentOverview from './student-overview';
export default function StudentHome({data,onLogout}:{data:any;onLogout:()=>void}){
 const pageAllowed=usePageAccess();
 const [tab,setTab]=useState('overview');
 const homeRef=useRef<HTMLDivElement>(null),navigationRef=useRef<HTMLElement>(null);
 useStudentNavigationSpace(homeRef,navigationRef);
 const student=data.students[0],mosque=data.mosques.find((m:any)=>m.id===data.mosque_id)||data.mosques[0];
 const active=['quran','calendar','about'].includes(tab)?'tools':tab==='learning'?'achievement':tab;
 useEffect(()=>{if(!pageAllowed(tab))setTab('overview')},[tab,pageAllowed]);
 function go(page:string){if(!pageAllowed(page))return;setTab(page==='password'?'account':page==='achievement'?'learning':page);window.scrollTo({top:0,behavior:'instant'})}
 return <div className="student-home" ref={homeRef} dir="rtl"><header className="student-identity-header"><a className="student-siraj-brand" href="/" aria-label="سراج"><img src="/favicon.svg" alt="شعار سراج" width={44} height={44}/><strong>سِراج</strong></a><div className="student-mosque-brand"><span className="student-mosque-mark"><MosqueLogo name={mosque?.name} customLogo={mosque?.logo} size={30}/></span><strong>{mosque?.name}</strong></div><ThemeSwitcher/></header><DateClock/><main id="siraj-main" tabIndex={-1}><div className="page-heading"><div><span className="eyebrow">مساحتك التعليمية</span><h1>أهلًا، {student.name}</h1><p>رعاية اليوم، أثر الغد.</p></div><span className="badge green">{student.status==='inactive'?'متوقف':'منتظم'}</span></div>{tab==='learning'&&<><h2>إنجازي</h2><p>علاماتي، رحلة حفظي، وحلقاتي التعليمية.</p><HadithCard/><div className="panel student-learning-panel"><StudentLearning student={student} mosqueId={data.mosque_id} readOnly/></div><RanksBoard compact onOpen={()=>go('race')}/></>}{tab==='overview'&&<StudentOverview student={student} mosqueId={data.mosque_id} onOpen={go}/>} {tab==='account'&&<StudentAccount student={student} user={data.user} mosque={mosque} onLogout={onLogout}/>}{tab==='race'&&<RanksBoard studentView/>}{tab==='tools'&&<><div className="cards-grid student-tools-links"><button className="panel" onClick={()=>go('about')}><Info size={26}/><h2>من نحن</h2><p>تعرّف إلى سراج ورسالته</p></button></div><IslamicTools userId={data.user.id}/></>}{tab==='about'&&<button className="btn secondary" onClick={()=>go('tools')}><ArrowRight size={18}/>العودة إلى الأدوات</button>}{tab==='about'&&<AboutSiraj/>}{tab==='quran'&&<IslamicTools userId={data.user.id} initialTool="quran"/>}{tab==='calendar'&&<IslamicTools userId={data.user.id} initialTool="calendar"/>}</main><nav ref={navigationRef} className="student-bottom-nav" aria-label="قائمة الطالب">{[['overview','نظرة عامة',LayoutDashboard],['account','حسابي',UserRound],['achievement','إنجازي',Award],['tools','الأدوات',BookOpen],['race','سباق الاجتهاد',Trophy]].filter(([key])=>pageAllowed(String(key))).map(([key,label,Icon]:any)=><button type="button" key={key} className={active===key?'active':''} aria-current={active===key?'page':undefined} onClick={()=>go(key)}><Icon size={23}/><span>{label}</span></button>)}</nav><SirajAssistant role="student" onAction={a=>go(a.page)}/></div>
}
