import {beirutDay} from './islamic-calendar';
import {fetchPrayerSchedule} from './prayer-times';
export type CircleSchedule={weekday:number;mode:'day'|'clock'|'prayer';time?:string;prayer?:string;delay?:number};
export const WEEKDAYS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
export function validateSchedule(x:any):CircleSchedule{
 if(!x||!Number.isInteger(x.weekday)||x.weekday<0||x.weekday>6||!['day','clock','prayer'].includes(x.mode))throw Error('حدّد يوم الحلقة ونوع الموعد');
 if(x.mode==='clock'&&(typeof x.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time)))throw Error('حدّد ساعة صحيحة');
 if(x.mode==='prayer'&&(!['Fajr','Dhuhr','Asr','Maghrib','Isha'].includes(x.prayer)||!Number.isInteger(x.delay)||x.delay<0||x.delay>180))throw Error('حدّد الصلاة وعدد الدقائق بعد الأذان');
 return {weekday:x.weekday,mode:x.mode,...(x.mode==='clock'?{time:x.time}:{}),...(x.mode==='prayer'?{prayer:x.prayer,delay:x.delay}:{})};
}
export async function circleWindow(schedule:CircleSchedule|null,day:string,saved:boolean,now=Date.now(),prayers=fetchPrayerSchedule){
 if(saved)return {open:false,reason:'تم اعتماد هذا اللقاء وإقفاله. اللقاء القادم يفتح في يوم الحلقة من الأسبوع التالي.'};
 if(!schedule)return {open:false,reason:'يجب أن يحدّد المشرف الأساسي يوم الحلقة وموعد فتح التقييم أولًا.'};
 if(day!==beirutDay(new Date(now)))return {open:false,reason:'السجل للعرض فقط؛ التقييم متاح للقاء اليوم المحدّد بجدول الحلقة.'};
 const weekday=new Date(day+'T12:00:00Z').getUTCDay();if(weekday!==schedule.weekday)return {open:false,reason:'يفتح تقييم هذه الحلقة يوم '+WEEKDAYS[schedule.weekday]+' فقط.'};
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Beirut',hourCycle:'h23',hour:'2-digit',minute:'2-digit'}).format(new Date(now)).split(':').map(Number);const minute=parts[0]*60+parts[1];
 let start=0;
 if(schedule.mode==='clock')start=Number(schedule.time!.slice(0,2))*60+Number(schedule.time!.slice(3));
 if(schedule.mode==='prayer'){try{const data=await prayers(now),p=data.prayers.find(p=>p.key===schedule.prayer);if(!p||data.date!==day)throw Error();start=+p.time.slice(0,2)*60+ +p.time.slice(3)+(schedule.delay||0)}catch{return {open:false,reason:'تعذّر التحقق من موعد الصلاة؛ يبقى التقييم مغلقًا حتى تحديث المواقيت.'}}}
 return minute>=start?{open:true,reason:'التقييم مفتوح للقاء اليوم. بعد الحفظ النهائي يُقفل حتى اللقاء الأسبوعي التالي.'}:{open:false,reason:'لم يحن موعد فتح التقييم بعد؛ يفتح عند '+String(Math.floor(start/60)).padStart(2,'0')+':'+String(start%60).padStart(2,'0')+' بتوقيت بيروت.'};
}
