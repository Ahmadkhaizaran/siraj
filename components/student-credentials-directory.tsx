'use client';
import {useEffect,useState} from 'react';
import {Copy,RefreshCw} from 'lucide-react';
import {Credentials} from './student-learning';
type Row=Record<string,any>;
async function request(id?:string){
 const response=await fetch('/api/student-credentials',{method:id?'POST':'GET',credentials:'same-origin',cache:'no-store',...(id?{headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}:{})});
 const data:Row=await response.json();if(!response.ok)throw Error(data.error||'تعذّر استرجاع الحسابات');return data;
}
export default function StudentCredentialsDirectory({mosques}:{mosques:Row[]}){
 const [accounts,setAccounts]=useState<Row[]>([]),[filter,setFilter]=useState(''),[search,setSearch]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(''),[value,setValue]=useState<Row|null>(null);
 async function load(){setLoading(true);setError('');try{setAccounts((await request()).accounts)}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 useEffect(()=>{let active=true;request().then(d=>{if(active)setAccounts(d.accounts)}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 const visible=accounts.filter(a=>(!filter||a.mosque_id===filter)&&(!search||a.name.includes(search)||a.username.toLowerCase().includes(search.toLowerCase())));
 return <section className="panel" style={{marginBottom:24}}><div className="panel-heading"><div><h2>حسابات الطلاب · جميع المساجد والمراكز</h2><p>استرجاع بيانات الدخول المحفوظة دون تغيير الحساب أو سجل الطالب.</p></div><button className="btn secondary" onClick={load} disabled={loading||!!busy}><RefreshCw size={16}/>تحديث</button></div><div className="toolbar"><select aria-label="تصفية حسابات الطلاب حسب الجهة" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">كل المساجد والمراكز</option>{mosques.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><input aria-label="البحث في حسابات الطلاب" placeholder="اسم الطالب أو اسم المستخدم" value={search} onChange={e=>setSearch(e.target.value)}/></div>{error&&<p className="error" role="alert">{error}</p>}{loading?<p role="status">جارٍ تحميل الحسابات…</p>:<div className="table-wrap"><table><thead><tr><th>الطالب</th><th>المسجد أو المركز</th><th>اسم المستخدم</th><th>بيانات الدخول</th></tr></thead><tbody>{visible.map(a=><tr key={a.id}><td>{a.name}</td><td>{a.mosque_name}</td><td><bdi>{a.username.toUpperCase()}</bdi></td><td>{a.recoverable?<button className="text-button" disabled={!!busy} onClick={async()=>{setBusy(a.id);setError('');try{setValue((await request(a.id)).credentials)}catch(e){setError((e as Error).message)}finally{setBusy('')}}}><Copy size={16}/>{busy===a.id?'جارٍ الاسترجاع…':'عرض ونسخ بيانات الدخول'}</button>:<span>كلمة السر القديمة غير محفوظة؛ تُجدّد من ملف الطالب بواسطة المشرف الأساسي.</span>}</td></tr>)}</tbody></table>{!visible.length&&<p>لا توجد حسابات مطابقة.</p>}</div>}{value&&<Credentials value={value} onClose={()=>setValue(null)}/>}</section>;
}
