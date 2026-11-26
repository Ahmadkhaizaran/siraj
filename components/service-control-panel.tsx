'use client';
import MosqueLogo from './mosque-logo';
import useConfirmation from './use-confirmation';
import {fetchWithDeadline} from '../lib/client-request';
import {useEffect,useState} from 'react';
import {SlidersHorizontal,Globe,Landmark,GraduationCap,Save,RefreshCw} from 'lucide-react';
import {SERVICES,enabled,emptyControls,globalOn,institutionOn,setInstitutionDefaults,type ServiceConfig,type Service} from '../lib/service-controls';
export default function ServiceControlPanel({mosques}:{mosques:{id:string;name:string;city?:string;logo?:string|null}[]}){
 const confirmation=useConfirmation();
 const [accounts,setAccounts]=useState<{id:string;name:string;role:string;mosque_id:string}[]>([]),[target,setTarget]=useState(''),[config,setConfig]=useState<ServiceConfig>(emptyControls),[version,setVersion]=useState(''),[scope,setScope]=useState('global'),[mid,setMid]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [roster,setRoster]=useState<{id:string;name:string;status:string}[]|null>(null);
 const [rosterError,setRosterError]=useState(''),[resetting,setResetting]=useState(false);
 const mosque=mosques.find(item=>item.id===mid);
 useEffect(()=>{
  let live=true;setRoster(null);setRosterError('');
  if(scope==='all'&&mid)fetchWithDeadline('/api/institution-grades?mosque='+encodeURIComponent(mid),{cache:'no-store'})
   .then(async response=>{const data=await response.json() as {students?:{id:string;name:string;status:string}[];error?:string};if(!response.ok||!data.students)throw Error(data.error||'تعذّر تحميل الطلاب');if(live)setRoster(data.students)})
   .catch(e=>{if(live)setRosterError(e.message)});
  return()=>{live=false};
 },[scope,mid]);
 async function resetGrades(){
  if(!mosque||resetting)return;
  if(!await confirmation.ask('هل أنت متأكد من تصفير علامات الحلقات ونقاط الاجتهاد لجميع طلاب '+mosque.name+'؟ لا يمكن التراجع عن هذه العملية.',{cancel:'إلغاء',confirm:'متابعة التصفير'}))return;
  setResetting(true);setError('');setNotice('');
  try{
   const response=await fetchWithDeadline('/api/institution-grades',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mosque_id:mosque.id,confirm:mosque.id})});
   const data=await response.json() as {error?:string};if(!response.ok)throw Error(data.error||'تعذّر تصفير العلامات');
   setNotice('تم تصفير علامات الحلقات ونقاط الاجتهاد لطلاب '+mosque.name+'.');
  }catch(e){setError((e as Error).message)}finally{setResetting(false)}
 }
 async function load(){setLoading(true);setError('');try{const r=await fetchWithDeadline('/api/service-controls',{cache:'no-store'}),d:any=await r.json();if(!r.ok)throw Error(d.error);setAccounts(d.accounts);setConfig(d.config);setVersion(d.version);setDirty(false)}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 function toggle(key:Service,value:boolean){setNotice('');setDirty(true);setConfig(c=>{if(scope==='global')return {...c,global:{...c.global,[key]:value}};if(scope==='institutions')return setInstitutionDefaults(c,key,value);const m=c.mosques[mid]||{all:{},students:{}};if(scope==='roles'||scope==='users')return {...c,mosques:{...c.mosques,[mid]:{...m,[scope]:{...m[scope],[target]:{...m[scope]?.[target],[key]:value}}}}};return {...c,mosques:{...c.mosques,[mid]:{...m,[scope]:{...m[scope as 'all'|'students'],[key]:value}}}}})}
 async function save(){setBusy(true);setError('');setNotice('');try{const r=await fetchWithDeadline('/api/service-controls',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config,version})}),d:any=await r.json();if(!r.ok)throw Error(d.error);setVersion(d.version);setDirty(false);setNotice('تم حفظ التحكم بالخدمات. تتحدّث الواجهات المفتوحة خلال ١٥ ثانية.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const local=config.mosques[mid],flags=(scope==='roles'||scope==='users'?local?.[scope]?.[target]:local?.[scope as 'all'|'students'])||{};
 return <section className="service-panel" aria-busy={loading||busy}>{confirmation.dialog}<div className="panel service-control-intro"><SlidersHorizontal size={32}/><div><h2>خدمات المنصة، بقرارك</h2><p>اختر نطاق التحكم، عدّل المفاتيح، ثم احفظ. الإيقاف يحجب الخدمة دون حذف بياناتها. صلاحيات الحسابات الأساسية تبقى كما هي.</p></div></div><div className="service-scopes" aria-label="نطاق التحكم">{[['global','المنصة كلها',Globe],['institutions','كل الجهات',Landmark],['all','جهة محددة',Landmark],['roles','فئة حسابات',GraduationCap],['users','حساب محدد',GraduationCap]].map(([key,label,Icon]:any)=><button key={key} type="button" className={'btn '+(scope===key?'primary':'secondary')} aria-pressed={scope===key} onClick={()=>{setScope(key);setTarget('')}}><Icon size={20}/>{label}</button>)}</div>{!['global','institutions'].includes(scope)&&<label className="field">المسجد أو المركز<select value={mid} onChange={e=>{setMid(e.target.value);setTarget('')}}><option value="">اختر جهة</option>{mosques.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}{scope==='all'&&mosque&&<article className="panel" style={{padding:20,display:'grid',gap:12}}>
 <div style={{display:'flex',alignItems:'center',gap:12}}>
  <span style={{display:'grid',placeItems:'center',width:38,height:38,overflow:'hidden',flex:'0 0 38px'}}><MosqueLogo name={mosque.name} customLogo={mosque.logo} size={30}/></span>
  <div><h3>{mosque.name}</h3>{mosque.city&&<p>{mosque.city}</p>}</div>
 </div>
 <details><summary>طلاب الجهة{roster?' · '+roster.length.toLocaleString('ar-LB'):''}</summary>
  {rosterError?<p className="error" role="alert">{rosterError}</p>:!roster?<p role="status">جارٍ تحميل الطلاب…</p>:roster.length?<ul>{roster.map(student=><li key={student.id}>{student.name} · {student.status==='inactive'?'متوقف':'منتظم'}</li>)}</ul>:<p>ما في طلاب مسجّلين.</p>}
 </details>
 <div><button type="button" className="btn secondary danger-text" disabled={resetting||!roster?.length} onClick={resetGrades}>{resetting?'جارٍ التصفير…':'تصفير علامات الطلاب'}</button>
 <p className="muted">يصفّر علامات الحلقات ونقاط الاجتهاد لطلاب هالجهة. يبقى سجل الحضور والحفظ.</p></div>
</article>}{mid&&scope==='roles'&&<label className="field">فئة الحسابات<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">اختر الصفة</option>{[['primary','المشرف الأساسي'],['supervisor','المشرف'],['teacher','المدرّسون والمدرّسات'],['student','الطلاب']].map(([k,n])=><option key={k} value={k}>{n}</option>)}</select></label>}{mid&&scope==='users'&&<label className="field">الحساب<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">اختر حسابًا بالاسم</option>{accounts.filter(a=>a.mosque_id===mid).map(a=><option key={a.id} value={a.id}>{a.name} · {({primary:'مشرف أساسي',supervisor:'مشرف',teacher:'مدرّس',student:'طالب'} as Record<string,string>)[a.role]||a.role}</option>)}</select></label>}<p className="muted">{scope==='global'?'الإيقاف العام يوقف الخدمة للمستخدمين. يبقى المصحف والأذكار متاحين لصاحب المنصّة.':scope==='institutions'?'حدّد وضع الخدمة لكل الجهات. عند تغيير المفتاح، تُعاد اختيارات الجهات لهذه الخدمة إلى الوضع الجديد، ويمكنك بعدها تفعيل جهة معيّنة.':(scope==='roles'&&target==='student'||scope==='students')?'هذه المفاتيح تؤثر على الطلاب فقط. إيقاف السباق يستبعد طلاب الجهة من الترتيب، مع الاحتفاظ بعلاماتهم.':scope==='roles'?'الإعدادات لهذه الفئة داخل الجهة المختارة فقط.':scope==='users'?'الإعدادات للحساب المختار فقط. إيقاف الجهة أو فئته يتقدّم على مفتاح الحساب.':'هذه المفاتيح تشمل كل حسابات الجهة. الإيقاف العام يبقى له الأولوية.'}</p>{error&&<p role="alert" className="danger-text">{error}</p>}{notice&&<p role="status" className="learning-notice">{notice}</p>}{!loading&&(['global','institutions'].includes(scope)||mid&&(!['roles','users'].includes(scope)||target))&&<div className="service-grid">{SERVICES.map(([key,label,description])=>{const on=scope==='global'?globalOn(config,key):scope==='institutions'?institutionOn(config,key):scope==='all'?institutionOn(config,key,mid):flags[key]!==false;
 const role=scope==='roles'?target:scope==='users'?accounts.find(a=>a.id===target)?.role:undefined;
 const active=scope==='global'?on:scope==='institutions'?on&&globalOn(config,key):enabled(config,key,mid,role==='student'||scope==='students',role,scope==='users'?target:undefined);return <article className="panel service-card" key={key}><div><h3>{label}</h3><p>{description}</p><small className={'badge '+(active?'green':'neutral')}>{on&&!active?'موقوف من نطاق أعلى':active?'متاح':'موقوف'}</small></div><button type="button" role="switch" aria-checked={on} aria-label={label} disabled={busy} className={'service-switch '+(on?'is-on':'')} onClick={()=>toggle(key,!on)}><span/></button></article>})}</div>}<div className="panel service-save"><span>{dirty?'لديك تعديلات غير محفوظة':'الإعدادات المحفوظة هي المعتمدة'}</span><button className="btn secondary" disabled={busy||loading} onClick={async()=>{if(!dirty||(await confirmation.ask('تجاهل التعديلات غير المحفوظة وإعادة تحميل الإعدادات؟')))load()}}><RefreshCw size={16}/>إعادة تحميل</button><button className="btn primary" disabled={!dirty||loading||busy} onClick={save}><Save size={17}/>{busy?'جارٍ الحفظ…':'حفظ التعديلات'}</button></div><p className="muted">الدخول والخروج وحسابك ولوحة التحكم تبقى متاحة لتقدر تعيد تشغيل الخدمات. بعض الخدمات مخصّصة للفريق؛ مفتاح الطلاب يؤثر فقط على ما تسمح به صلاحياتهم أصلًا.</p></section>
}
