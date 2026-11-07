'use client';
import {useState} from 'react';
import {KeyRound} from 'lucide-react';
import {Credentials} from './student-learning';
export default function StudentAccountRecovery({student,mosqueId}:{student:Record<string,any>;mosqueId:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[value,setValue]=useState<Record<string,any>|null>(null);
 return <><button type="button" className="btn secondary" disabled={busy} aria-label={'استرجاع بيانات حساب '+student.name} onClick={async()=>{
  setBusy(true);setError('');try{
   const response=await fetch('/api/student-account',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({mosque_id:mosqueId,student_id:student.id,action:'reveal'})});
   const data:any=await response.json();if(!response.ok)throw Error(data.error||'تعذّر استرجاع بيانات الحساب');
   setValue({...data.credentials,name:student.name,contact_mode:student.contact_mode});
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }}><KeyRound size={16}/>{busy?'جارٍ الاسترجاع…':'استرجاع بيانات الحساب'}</button>{error&&<p className="error" role="alert">{error}</p>}{value&&<Credentials value={value} onClose={()=>setValue(null)}/>}</>;
}
