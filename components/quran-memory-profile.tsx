'use client';
import {useState} from 'react';
import QuranMemorySelector from './quran-memory-selector';
import {memoryDiff} from '../lib/memory-updates';
import type {InitialMemory} from '../lib/initial-memory';
export default function QuranMemoryProfile({memory,studentId,mosqueId,readOnly,onSaved}:{memory:any[];studentId:string;mosqueId:string;readOnly:boolean;onSaved:()=>Promise<any>}){
 const [value,setValue]=useState<InitialMemory>(()=>memory.map(m=>({surah:m.surah,ranges:m.ranges}))),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const changes=memoryDiff(memory,value);
 return <section><h3>مستوى الحفظ الحالي</h3><p>تحديث مستوى الطالب لا يضيف علامات أو نقاطًا إلى سباق الاجتهاد.</p><QuranMemorySelector value={value} onChange={setValue} disabled={readOnly||busy}/>{!readOnly&&<div className="staff-account-actions"><button type="button" className="btn primary" disabled={busy||!changes.length} onClick={async()=>{setBusy(true);setError('');try{const r=await fetch('/api/memorization-batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mosque_id:mosqueId,student_id:studentId,updates:changes})});const d:any=await r.json();if(!r.ok)throw Error(d.error);setNotice('تم حفظ المستوى دون نقاط');await onSaved()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>{busy?'جارٍ الحفظ…':'حفظ مستوى القرآن'}</button><button type="button" className="btn secondary" disabled={busy||!changes.length} onClick={()=>{setValue(memory.map(m=>({surah:m.surah,ranges:m.ranges})));setError('')}}>تراجع عن التغييرات</button></div>}{notice&&<p role="status">{notice}</p>}{error&&<p className="error" role="alert">{error}</p>}</section>;
}
