import {beirutDay,addDays} from './islamic-calendar';
export type CircleSchedule={weekday:number;mode:'day'|'clock'|'prayer';time?:string;prayer?:string;delay?:number};
export const WEEKDAYS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
export function validateSchedule(x:any):CircleSchedule{
 if(!x||!Number.isInteger(x.weekday)||x.weekday<0||x.weekday>6||!['day','clock','prayer'].includes(x.mode))throw Error('حدّد يوم الحلقة ونوع الموعد');
 if(x.mode==='clock'&&(typeof x.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time)))throw Error('حدّد ساعة صحيحة');
 if(x.mode==='prayer'&&(!['Fajr','Dhuhr','Asr','Maghrib','Isha'].includes(x.prayer)||!Number.isInteger(x.delay)||x.delay<0||x.delay>180))throw Error('حدّد الصلاة وعدد الدقائق بعد الأذان');
 return {weekday:x.weekday,mode:x.mode,...(x.mode==='clock'?{time:x.time}:{}),...(x.mode==='prayer'?{prayer:x.prayer,delay:x.delay}:{})};
}
export function scheduledCircleDay(weekday:number,today=beirutDay()){
 const current=new Date(today+'T12:00:00Z').getUTCDay();return addDays(today,(weekday-current+7)%7);
}
export async function circleWindow(schedule:CircleSchedule|null,day:string,saved:boolean,now=Date.now()){
 if(saved)return {open:false,reason:'تم اعتماد هذا اللقاء وإقفاله. اللقاء التالي في يوم الحلقة من الأسبوع القادم.'};
 if(!schedule)return {open:false,reason:'يجب أن يحدّد المشرف الأساسي يوم الحلقة أولًا.'};
 if(day!==beirutDay(new Date(now)))return {open:false,reason:'التقييم مغلق خارج يوم الحلقة المحدّد؛ السجل للعرض فقط.'};
 const weekday=new Date(day+'T12:00:00Z').getUTCDay();if(weekday!==schedule.weekday)return {open:false,reason:'يفتح تقييم هذه الحلقة يوم '+WEEKDAYS[schedule.weekday]+' فقط.'};
 return {open:true,reason:'التقييم مفتوح في يوم الحلقة، من منتصف الليل حتى نهاية اليوم بتوقيت بيروت. الاعتماد النهائي يقفله حتى الأسبوع التالي.'};
}
