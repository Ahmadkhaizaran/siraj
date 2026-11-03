export const MASJIDI_SOURCES=[{id:67,name:'مسجد الزيتونة',city:'صيدا · نزلة صيدون',url:'https://tv.masjidi.app/67'},{id:111,name:'مسجد حبر الأمة عبدالله بن عباس',city:'الفوار',url:'https://tv.masjidi.app/111'}];
const decode=(s:string)=>s.replace(/&quot;/g,'"').replace(/&#0*39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&');
const short=(s:unknown,max=2000)=>typeof s==='string'?s.trim().slice(0,max):'';
const validDay=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s?s:null;
const PRAYERS:Record<string,string>={Fajr:'الفجر',Sunrise:'الشروق',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء',Jumuah:'الجمعة'};
export function parseMasjidi(html:string,source:typeof MASJIDI_SOURCES[number]){
 const match=html.match(/<masjidi-data\b[^>]*\bdata="([^"]+)"/i);if(!match)throw new Error('لم يُعثر على بيانات مسجدي في الصفحة');
 const data=JSON.parse(decode(match[1]));const config=data.configuration;
 if(!config||String(config.id)!==String(source.id)||!Array.isArray(config.notifications))throw new Error('بيانات مصدر مسجدي غير مطابقة');
 return config.notifications.slice(0,100).map((n:any)=>{
  if(!n||typeof n!=='object')return null;const d=n.data&&typeof n.data==='object'?n.data:{};
  const title=short(d.title||d.name||n.name||d.subject||n.textHeader,250);if(!title)return null;
  const recurring=d.lectureScheduleType==='recurring';
  const weekdayText=short(d.lectureRecurringWeekdays,100).toLowerCase();
  const weekdays=recurring?weekdayText.split(/[,;\s|]+/).filter((v:string)=>['sun','mon','tue','wed','thu','fri','sat'].includes(v)).filter((v:string,i:number,a:string[])=>a.indexOf(v)===i).join(','):'';
  const once=validDay(d.lectureOnceDate||d.activityOnceDate||d.date);
  const starts=recurring?validDay(n.startDate):once;
  const clock=short(d.lectureInstantTime||d.activityInstantTime,10);
  const time=d.lectureTimingType==='postprayer'?'بعد صلاة '+(PRAYERS[d.lecturePostprayerPrayer]||'حسب إعلان المسجد'):/^\d{1,2}:\d{2}(:\d{2})?$/.test(clock)?clock.slice(0,5):'';
  const key=short(String(n.id||n.uniqueId||d.id||title),150);
  return {id:'masjidi:'+source.id+':'+key,source_id:source.id,mosque_name:source.name,title,description:short(d.notes||d.body||n.textFooter),lecturer:short(d.lecturer,150),kind:n.type==='lecture'?'lecture':n.type==='activity'?'activity':'announcement',starts_on:starts,ends_on:validDay(n.endDate),weekdays,time_label:time,source_url:source.url,status:'active'};
 }).filter(Boolean) as any[];
}
