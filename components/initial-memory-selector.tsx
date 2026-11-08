'use client';
import {useEffect,useRef} from 'react';
import {BookOpen} from 'lucide-react';
import {INITIAL_JUZ,selectionCount,toggleInitialMemory,type InitialMemory} from '../lib/initial-memory';
function Selection({label,selected,total,onChange}:{label:string;selected:number;total:number;onChange:(on:boolean)=>void}){
 const ref=useRef<HTMLInputElement>(null);useEffect(()=>{if(ref.current)ref.current.indeterminate=selected>0&&selected<total},[selected,total]);
 return <label className="initial-memory-check"><input ref={ref} type="checkbox" checked={selected===total} onChange={e=>onChange(e.target.checked)}/><span>{label}</span></label>;
}
export default function InitialMemorySelector({value,onChange}:{value:InitialMemory;onChange:(value:InitialMemory)=>void}){
 const verses=value.reduce((n,m)=>n+m.ranges.reduce((sum,[a,b])=>sum+b-a+1,0),0);
 return <fieldset className="initial-memory-selector"><legend><BookOpen size={19}/>الحفظ السابق عند الانضمام</legend><p>حدّد الجزء المحفوظ كاملًا، أو افتحه لاختيار السور. هذا تحديد للمستوى فقط، دون علامات أو نقاط اجتهاد.</p><p className="info-strip" role="status">المحدّد: {verses} آية من {value.length} سورة. يمكن تركه فارغًا إن لم يبدأ الطالب الحفظ.</p><p className="muted">إذا امتدّت السورة عبر أكثر من جزء، تُحدّد آياتها داخل الجزء المفتوح فقط؛ ولا يُسجّل باقي السورة تلقائيًا.</p><div className="initial-juz-list">{INITIAL_JUZ.map(j=>{const count=selectionCount(value,j.segments);return <section className="initial-juz-card" key={j.number}><Selection label={'الجزء '+j.number+(j.number===30?' · عمّ':'')+' كاملًا'} {...count} onChange={on=>onChange(toggleInitialMemory(value,j.segments,on))}/><details><summary>اختيار السور · {j.segments.length} {count.selected>0?'· محدّد '+count.selected+' من '+count.total+' آية':''}</summary><div className="initial-surah-list">{j.segments.map(s=><Selection key={s.surah} label={'سورة '+s.name+(s.whole?'':' · الآيات '+s.from+'–'+s.to+' ضمن هذا الجزء')} {...selectionCount(value,[s])} onChange={on=>onChange(toggleInitialMemory(value,[s],on))}/>)}</div></details></section>})}</div></fieldset>;
}
