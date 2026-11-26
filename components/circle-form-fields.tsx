'use client';
import {WEEKDAYS,validateSchedule} from '../lib/circle-window';
import {beirutDay} from '../lib/islamic-calendar';
type Row=Record<string,any>;
export function circleForm(item?:Row){
 let schedule;
 try{if(item?.schedule_config)schedule=validateSchedule(JSON.parse(item.schedule_config))}catch{}
 const time=schedule?.time?.split(':');
 const hour=time?Number(time[0]):10;
 return {name:'',kind:'quran',teacher_id:'',level:'',schedule:'',...item,days:schedule?.weekdays??(schedule?[schedule.weekday]:[]),timing:schedule?.mode==='clock'?'clock':'text',
  timeLabel:schedule?.mode==='text'?schedule.label:schedule?String(item?.schedule||'').split(' · ').at(-1)||'':item?.schedule||'',hour:String(hour%12||12),minute:time?.[1]||'00',period:hour>=12?'PM':'AM',scheduleChanged:!item};
}
export function circlePayload(form:Row){
 if(!form.scheduleChanged)return form;
 if(!form.days.length)throw Error('اختَر يومًا واحدًا على الأقل.');
 const hour=Number(form.hour)%12+(form.period==='PM'?12:0);
 const weekly_schedule=validateSchedule({weekdays:form.days,mode:form.timing,...(form.timing==='text'?{label:form.timeLabel}:{time:String(hour).padStart(2,'0')+':'+form.minute})});
 return {...form,weekly_schedule};
}
export default function CircleFormFields({form,update,staff}:{form:Row;update:(key:string,value:any)=>void;staff:Row[]}){
 function change(key:string,value:any){update(key,value);update('scheduleChanged',true)}
 const pathways=form.kind==='quran'?['حفظ القرآن','مراجعة الحفظ','التجويد','تصحيح التلاوة']:form.kind==='religion'?['فقه','عقيدة','سيرة','حديث']:[];
 return <>
  <label className="field"><span>نوع الحلقة</span><select value={form.kind} onChange={e=>{update('kind',e.target.value);update('level','')}}><option value="quran">حلقة قرآن</option><option value="religion">حلقة دين</option><option value="other">حلقة أخرى</option></select></label>
  <label className="field"><span>تاريخ بدء الحلقة</span><input type="date" value={form.start_date||beirutDay()} readOnly/></label>
  <label className="field"><span>اسم الحلقة</span><input value={form.name} onChange={e=>update('name',e.target.value)} required maxLength={150}/></label>
  <label className="field"><span>المدرّس المسؤول</span><select value={form.teacher_id||''} onChange={e=>update('teacher_id',e.target.value)}><option value="">يُحدّد لاحقًا</option>{staff.filter(a=>a.active&&['primary','supervisor','teacher'].includes(a.role)).map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></label>
  <label className="field"><span>المسار أو المستوى</span><input list="circle-pathways" value={form.level} onChange={e=>update('level',e.target.value)} maxLength={100}/><datalist id="circle-pathways">{pathways.map(path=><option value={path} key={path}/>)}</datalist></label>
  <fieldset className="circle-form-days"><legend>أيام الحلقة</legend><div>{WEEKDAYS.map((day,index)=><label key={day}><input type="checkbox" checked={form.days.includes(index)} onChange={e=>change('days',e.target.checked?[...form.days,index]:form.days.filter((n:number)=>n!==index))}/>{day}</label>)}</div></fieldset>
  <label className="field"><span>التوقيت</span><select value={form.timing} onChange={e=>change('timing',e.target.value)}><option value="text">توقيت مكتوب</option><option value="clock">ساعة محدّدة</option></select></label>
  {form.timing==='text'?<label className="field"><span>وقت الحلقة</span><input maxLength={95} value={form.timeLabel} onChange={e=>change('timeLabel',e.target.value)} placeholder="مثال: بعد العصر" required={form.scheduleChanged}/></label>:<div className="form-row">
   <label className="field"><span>الساعة</span><select value={form.hour} onChange={e=>change('hour',e.target.value)}>{Array.from({length:12},(_,i)=><option key={i}>{i+1}</option>)}</select></label>
   <label className="field"><span>الدقيقة</span><select value={form.minute} onChange={e=>change('minute',e.target.value)}>{Array.from({length:60},(_,i)=>String(i).padStart(2,'0')).map(minute=><option key={minute}>{minute}</option>)}</select></label>
   <label className="field"><span>الفترة</span><select value={form.period} onChange={e=>change('period',e.target.value)}><option value="AM">صباحًا (AM)</option><option value="PM">مساءً (PM)</option></select></label>
  </div>}
 </>;
}
