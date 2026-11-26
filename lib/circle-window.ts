import {beirutDay,addDays} from './islamic-calendar';
export type CircleSchedule={weekday:number;weekdays?:number[];mode:'day'|'clock'|'prayer'|'text';label?:string;time?:string;prayer?:string;delay?:number};
export const WEEKDAYS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
export function validateSchedule(x:any):CircleSchedule{
 const days=x?.weekdays??[x?.weekday];
 if(!x||!Array.isArray(days)||days.length===0||days.length>7||days.some(day=>!Number.isInteger(day)||day<0||day>6)||!['day','clock','prayer','text'].includes(x.mode))throw Error('حدّد يوم الحلقة ونوع الموعد');
 if(x.mode==='clock'&&(typeof x.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time)))throw Error('حدّد ساعة صحيحة');
 if(x.mode==='prayer'&&(!['Fajr','Dhuhr','Asr','Maghrib','Isha'].includes(x.prayer)||!Number.isInteger(x.delay)||x.delay<0||x.delay>180))throw Error('حدّد الصلاة وعدد الدقائق بعد الأذان');
 if(x.mode==='text'&&(typeof x.label!=='string'||!x.label.trim()||x.label.length>95))throw Error('أدخل توقيت الحلقة');
 const weekdays=[...new Set<number>(days)].sort((a,b)=>a-b);
 return {weekday:weekdays[0],...(x.weekdays?{weekdays}:{}),mode:x.mode,...(x.mode==='text'?{label:x.label.trim()}:{}),...(x.mode==='clock'?{time:x.time}:{}),...(x.mode==='prayer'?{prayer:x.prayer,delay:x.delay}:{})};
}
export function scheduledCircleDay(weekday:number|number[],today=beirutDay()){
 const current=new Date(today+'T12:00:00Z').getUTCDay();const days=Array.isArray(weekday)?weekday:[weekday];return addDays(today,Math.min(...days.map(day=>(day-current+7)%7)));
}
export async function circleWindow(schedule:CircleSchedule|null,day:string,saved:boolean,now=Date.now()){
 if(saved)return {open:false,reason:'تم اعتماد هذا اللقاء وإقفاله. يمكن متابعة اللقاء القادم في موعده.'};
 if(!schedule)return {open:false,reason:'يجب أن يحدّد المشرف الأساسي يوم الحلقة أولًا.'};
 if(day!==beirutDay(new Date(now)))return {open:false,reason:'التقييم مغلق خارج يوم الحلقة المحدّد؛ السجل للعرض فقط.'};
 const weekday=new Date(day+'T12:00:00Z').getUTCDay();if(!(schedule.weekdays??[schedule.weekday]).includes(weekday))return {open:false,reason:'يفتح تقييم هذه الحلقة يوم '+(schedule.weekdays??[schedule.weekday]).map(day=>WEEKDAYS[day]).join('، ')+' فقط.'};
 return {open:true,reason:'التقييم مفتوح في يوم الحلقة، من منتصف الليل حتى نهاية اليوم بتوقيت بيروت. الاعتماد النهائي يقفله حتى الأسبوع التالي.'};
}
