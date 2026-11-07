'use client';
import {useState} from 'react';
import {credentialMessage} from '../lib/credential-message';
import {Copy} from 'lucide-react';
import {Credentials} from './student-learning';
export default function StaffCredentials({id}:{id:string}){
 const [value,setValue]=useState<Record<string,any>|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <><button type="button" className="btn secondary" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const r=await fetch('/api/staff-credentials',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});const d:any=await r.json();if(!r.ok)throw Error(d.error||'تعذّر استرجاع البيانات');setValue({...d.credentials,kind:d.kind});try{await navigator.clipboard.writeText(credentialMessage(d.credentials,location.origin))}catch{/* The dialog provides manual copy when clipboard access is unavailable. */}}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}><Copy size={16}/>{busy?'جارٍ الاسترجاع…':'نسخ بيانات الدخول'}</button>{error&&<p className="error" role="alert">{error}</p>}{value&&<Credentials value={value} onClose={()=>setValue(null)}/>}</>;
}
