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

const DIRECTORY='https://tv.masjidi.app/api/main/v1/';
type DirectoryRow=Record<string,any>;
export type MasjidiCity={id:number;country:number;name:string;aliases:string[]};
type DirectoryEvent=Omit<import('./islamic-calendar').CalendarEvent,'next_date'> & {city_id:number};
export function cityKey(value:string){
 return value.normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
export async function fetchMasjidiCalendar(fetcher:typeof fetch=fetch){
 async function get(endpoint:string,params:Record<string,string>){
  const response=await fetcher(DIRECTORY+endpoint+'?'+new URLSearchParams(params),{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(6500)});
  if(!response.ok)throw Error('تعذّر تحميل مسجدي ('+response.status+')');
  const data=await response.json() as DirectoryRow;
  if(data.type!=='success')throw Error('تعذّر قراءة بيانات مسجدي');
  return data;
 }
 async function collect(endpoint:'lectures'|'activities'){
  const page=async(index:number)=>get(endpoint,{lang:'ar',isVerified:'1',isMasjid:'1',page:String(index),limit:'100'});
  const first=await page(1),total=Number(first.totalPages??1);
  if(!Number.isSafeInteger(total)||total<1||total>100)throw Error('عدد صفحات مسجدي غير صالح');
  const result=[first];
  for(let start=2;start<=total;start+=5)result.push(...await Promise.all(Array.from({length:Math.min(5,total-start+1)},(_,index)=>page(start+index))));
  return result.flatMap(data=>{
   if(!Array.isArray(data[endpoint]))throw Error('قائمة النشاطات غير صالحة');
   return (data[endpoint] as DirectoryRow[]).flatMap((item):DirectoryEvent[]=>{
    const mosqueId=Number(item.masjidId??item.mosqueId),city=Number(item.cityId),id=Number(item.id);
    const title=short(item.name,250),mosque=short(item.masjidName,200);
    if(!title||!mosque||![mosqueId,city,id].every(n=>Number.isSafeInteger(n)&&n>0))return [];
    const recurring=item.schedule?.type==='recurring';
    const weekdays=recurring&&Array.isArray(item.schedule.recurringWeekdays)?[...new Set(item.schedule.recurringWeekdays.filter((day:unknown)=>typeof day==='string'&&/^(sun|mon|tue|wed|thu|fri|sat)$/.test(day)))].join(','):'';
    const prayer=PRAYERS[item.timing?.postprayerPrayer];
    const time=short(item.timing?.instantTime,10);
    const updated=Date.parse(short(item.updatedAt||item.createdAt,30).replace(' ','T')+'Z');
    return [{id:'masjidi:'+endpoint+':'+id,source_id:mosqueId,city_id:city,mosque_name:mosque,title,
     description:short(item.notes),lecturer:short(item.lecturer,150),kind:endpoint==='lectures'?'lecture':'activity',
     starts_on:recurring?null:validDay(item.schedule?.onceDate),ends_on:null,weekdays,
     time_label:item.timing?.type==='postprayer'&&prayer?'بعد صلاة '+prayer:/^\d{1,2}:\d{2}/.test(time)?time.split(':').slice(0,2).join(':'):'',
     source_url:'https://tv.masjidi.app/'+mosqueId,status:'active',updated_at:Number.isFinite(updated)?updated:0}];
   });
  });
 }
 const [lectures,activities]=await Promise.all([collect('lectures'),collect('activities')]);
 const events=[...new Map([...lectures,...activities].map(event=>[event.id,event])).values()];
 const today=new Date().toISOString().slice(0,10);
 const ids=[...new Set(events.filter(event=>!event.starts_on||event.starts_on>=today).map(event=>event.source_id))];
 const countries=new Set([121]);
 for(let start=0;start<ids.length;start+=240){
  const batches=Array.from({length:Math.ceil(Math.min(240,ids.length-start)/60)},(_,i)=>ids.slice(start+i*60,start+(i+1)*60));
  const details=await Promise.allSettled(batches.map(group=>get('mosques',{mosqueIds:group.join(','),limit:'100'})));
  for(const result of details)if(result.status==='fulfilled')for(const mosque of result.value.mosques||[]){
   if(Number.isSafeInteger(mosque.countryId)&&mosque.countryId>0)countries.add(mosque.countryId);
  }
 }
 const cities:MasjidiCity[]=[];
 const wanted=new Set(events.map(event=>event.city_id));
 const countryIds=[...countries];
 for(let start=0;start<countryIds.length;start+=8){
  const results=await Promise.allSettled(countryIds.slice(start,start+8).map(async country=>({country,data:await get('cities',{countryId:String(country),lang:'ar'})})));
  for(const result of results)if(result.status==='fulfilled'){
   const {country,data}=result.value;
   for(const city of data.cities||[]){
    if(country!==121&&!wanted.has(city.id))continue;
    const aliases=[city.nameAr,city.langName,city.nameEn,city.name].filter((value:unknown):value is string=>typeof value==='string'&&!!value.trim());
    if(Number.isSafeInteger(city.id)&&aliases.length)cities.push({id:city.id,country,name:aliases[0],aliases});
   }
  }
 }
 if(!cities.some(city=>city.country===121))throw Error('تعذّر تحديد مدن لبنان من مسجدي');
 return {events,cities};
}
