export const PRAYER_SOURCE='https://tv.masjidi.app/67';
export const TABLE_SOURCE='https://tv.masjidi.app/upload/json_prayers_times/prayer_times_region_json_2.json';
export const KEYS=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'] as const;
const names={Fajr:'الفجر',Sunrise:'الشروق',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء'};
export function localDay(now:number){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Beirut'}).format(new Date(now))}
function offset(now:number){const s=new Intl.DateTimeFormat('en',{timeZone:'Asia/Beirut',timeZoneName:'longOffset'}).formatToParts(now).find(p=>p.type==='timeZoneName')!.value;const m=s.match(/GMT([+-])(\d{2}):(\d{2})/);if(!m)throw Error('تعذّر تحديد توقيت بيروت');return (m[1]==='-'?-1:1)*(+m[2]*60+ +m[3])}
export function parsePrayerConfig(html:string){
 const m=html.match(/<masjidi-data\b[^>]*\bdata="([^"]+)"/i);if(!m)throw Error('تعذّر قراءة إعدادات مسجدي');
 const c=JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&#0*39;/g,"'").replace(/&amp;/g,'&')).configuration;
 if(c?.id!=='67'||c.timezone!=='Asia/Beirut'||c.templateData?.masjidCity!=='صيدا'||c.timings?.type!=='table-api'||c.timings.url!==TABLE_SOURCE||c.daylightSaving?.mode!=='strategy-or-timezone')throw Error('تغيّر إعداد مصدر المواقيت؛ يحتاج مراجعة');return c;
}
export function prayerSchedule(config:any,table:any,now:number){
 if(!Array.isArray(table)||table.length!==366)throw Error('جدول مسجدي غير صالح');
 const today=localDay(now),year=+today.slice(0,4);const tomorrow=new Date(Date.parse(today+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 const build=(date:string)=>{const [y,m,d]=date.split('-').map(Number);const index=(Date.UTC(2024,m-1,d)-Date.UTC(2024,0,1))/86400000;
 const noon=Date.UTC(y,m-1,d,10),tz=offset(noon),winter=Math.min(offset(Date.UTC(y,0,1,10)),offset(Date.UTC(y,6,1,10))),dst=tz-winter;
 return KEYS.map(key=>{const clock=table[index]?.[key];if(typeof clock!=='string'||!/^\d{1,2}:\d{2}$/.test(clock))throw Error('موعد غير صالح من مسجدي');const [h,min]=clock.split(':').map(Number);const adjustment=config.prayers?.find((p:any)=>p.key===key)?.timeOffset;if(h>23||min>59||!Number.isInteger(adjustment)||Math.abs(adjustment)>120)throw Error('تعديل وقت غير صالح');const total=h*60+min+dst+adjustment;if(total<0||total>=1440)throw Error('موعد خارج اليوم');const time=String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');return {key,name:names[key],date,time,at:Date.UTC(y,m-1,d,Math.floor(total/60),total%60)-tz*60000}})};
 const prayers=build(today),next=[...prayers,...build(tomorrow)].find(p=>p.key!=='Sunrise'&&p.at>now)!;
 if(prayers.some((p,i)=>i>0&&p.at<=prayers[i-1].at))throw Error('تسلسل المواقيت غير صالح');
 return {date:today,timezone:'Asia/Beirut',city:'صيدا',mosque:'مسجد الزيتونة',source:PRAYER_SOURCE,table_source:TABLE_SOURCE,prayers,next,server_time:now};
}
export async function fetchPrayerSchedule(now=Date.now(),fetcher:typeof fetch=fetch){
 const get=async(url:string)=>{const r=await fetcher(url,{signal:AbortSignal.timeout(10000),redirect:'error',next:{revalidate:300}} as RequestInit);if(!r.ok)throw Error('تعذّر تحديث مواقيت مسجدي');const s=await r.text();if(s.length>2500000)throw Error('استجابة غير صالحة');return s};
 const config=parsePrayerConfig(await get(PRAYER_SOURCE));return prayerSchedule(config,JSON.parse(await get(TABLE_SOURCE)),now);
}
