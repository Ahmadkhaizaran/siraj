import {notificationSince} from './notification-policy';
import { MASJIDI_SOURCES,parseMasjidi,cityKey,fetchMasjidiCalendar } from './masjidi';
import { digest } from './auth-crypto';
import { beirutDay,nextOccurrence } from './islamic-calendar';
type User={id:string;role:string;mosque_id:string|null;created_at?:string};
const TTL=15*60*1000;
export async function syncMasjidi(db:D1DatabaseSession,fetcher:typeof fetch=fetch){
 await Promise.all(MASJIDI_SOURCES.map(async source=>{
  const cached=await db.prepare('SELECT checked_at FROM calendar_sources WHERE id=?').bind(source.id).first<{checked_at:number}>();
  if(cached&&Date.now()-cached.checked_at<TTL)return;
  const stamp=Date.now();
  // Atomic lease prevents repeated parallel page loads from hammering the source.
  const lease=await db.prepare("INSERT INTO calendar_sources (id,name,city,url,status,checked_at,event_count) VALUES (?,?,?,?,'pending',?,0) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at WHERE calendar_sources.checked_at<? RETURNING id").bind(source.id,source.name,source.city,source.url,stamp,stamp-TTL).first();
  if(!lease)return;
  try{
   const response=await fetcher(source.url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(9000),redirect:'manual'});
   if(!response.ok)throw new Error('تعذّر جلب مسجدي ('+response.status+')');
   const html=await response.text();if(html.length>2500000)throw new Error('حجم استجابة المصدر غير متوقّع');
   const events=parseMasjidi(html,source);
   const statements:D1PreparedStatement[]=[];
   // Only a successfully parsed feed may retire old announcements.
   statements.push(db.prepare("UPDATE calendar_events SET status='inactive' WHERE source_id=?").bind(source.id));
   for(const e of events){
    const hash=await digest(JSON.stringify(e));
    statements.push(db.prepare("INSERT INTO calendar_events (id,source_id,mosque_id,mosque_name,title,description,lecturer,kind,starts_on,ends_on,weekdays,time_label,source_url,status,content_hash,published_at,updated_at) VALUES (?,?,NULL,?,?,?,?,?,?,?,?,?,?,'active',?,?,?) ON CONFLICT(id) DO UPDATE SET mosque_name=excluded.mosque_name,title=excluded.title,description=excluded.description,lecturer=excluded.lecturer,kind=excluded.kind,starts_on=excluded.starts_on,ends_on=excluded.ends_on,weekdays=excluded.weekdays,time_label=excluded.time_label,source_url=excluded.source_url,status='active',updated_at=CASE WHEN calendar_events.content_hash!=excluded.content_hash THEN excluded.updated_at ELSE calendar_events.updated_at END,content_hash=excluded.content_hash").bind(e.id,e.source_id,e.mosque_name,e.title,e.description,e.lecturer,e.kind,e.starts_on,e.ends_on,e.weekdays,e.time_label,e.source_url,hash,stamp,stamp));
   }
   statements.push(db.prepare("UPDATE calendar_sources SET status='ok',success_at=?,error=NULL,event_count=? WHERE id=?").bind(stamp,events.length,source.id));
   await db.batch(statements);
  }catch(error){await db.prepare("UPDATE calendar_sources SET status='error',error=? WHERE id=?").bind(error instanceof Error?error.message.slice(0,180):'تعذّرت المزامنة',source.id).run();}
 }));
}
const DIRECTORY_CACHE='calendar:masjidi-directory:v1';
async function cachedDirectory(db:D1DatabaseSession){
 type Snapshot=Awaited<ReturnType<typeof fetchMasjidiCalendar>>;
 const row=await db.prepare('SELECT value FROM settings WHERE key=?').bind(DIRECTORY_CACHE).first<{value:string}>();
 const cached=row?JSON.parse(row.value) as Snapshot:null;
 const now=Date.now();
 const lease=await db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE settings.value<? RETURNING key')
  .bind(DIRECTORY_CACHE+':checked',String(now),String(now-TTL)).first();
 if(!lease)return cached;
 try{
  const directory=await fetchMasjidiCalendar();
  await db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
   .bind(DIRECTORY_CACHE,JSON.stringify(directory)).run();
  return directory;
 }catch(error){
  console.warn('Masjidi calendar refresh failed',error instanceof Error?error.message:'Unknown error');
  return cached;
 }
}
export async function communityFeed(db:D1DatabaseSession,user:User|null){
 const directory=await cachedDirectory(db);
 if(!directory)await syncMasjidi(db);
 const [data,legacy,home]=await Promise.all([
  db.prepare("SELECT e.*,m.name AS local_name,m.city AS local_city FROM calendar_events e LEFT JOIN mosques m ON m.id=e.mosque_id WHERE e.status='active' AND (e.mosque_id IS NULL OR m.cancelled_at IS NULL) AND (e.source_id IS NULL OR ?=1) ORDER BY e.updated_at DESC").bind(directory?0:1).all<any>(),
  directory?null:db.prepare('SELECT id,name,city,url,status,checked_at,success_at,error,event_count FROM calendar_sources ORDER BY id').all<any>(),
  user?.mosque_id?db.prepare('SELECT id,city,name FROM mosques WHERE id=?').bind(user.mosque_id).first<{id:string;city:string;name:string}>():null,
 ]);
 const allAreas=user?.role==='admin'||user?.role==='platform_supervisor';
 const today=beirutDay();
 const cityById=new Map(directory?.cities.map(city=>[city.id,city]));
 function matchCity(value:string){
  const keys=[cityKey(value),cityKey(value.split(/[،,·]/)[0])].filter(Boolean);
  const matches=directory?.cities.filter(city=>city.aliases.some(alias=>keys.includes(cityKey(alias))))||[];
  return matches.find(city=>city.country===121)||matches[0];
 }
 const knownByName=directory?.events.find(event=>home&&cityKey(event.mosque_name)===cityKey(home.name));
 const homeCity=home?.city?.trim()||'';
 const homeId=matchCity(homeCity)?.id??(!homeCity?knownByName?.city_id:undefined);
 const homeKey=cityKey(homeCity.split(/[،,·]/)[0]);
 const regionKey=(id:number|undefined,city:string)=>id?'masjidi:'+id:city?'local:'+cityKey(city):'';
 const ownRegion=regionKey(homeId,homeKey);
 const legacyById=new Map((legacy?.results||[]).map(source=>[source.id,source]));
 const events=[...(data.results||[]),...(directory?.events||[])].flatMap(e=>{
  const source=legacyById.get(e.source_id);
  const cityId=e.city_id??matchCity(e.local_city||source?.city||'')?.id;
  const city=cityById.get(cityId)?.name||e.local_city||source?.city?.split('·')[0].trim()||(cityId?'مدينة '+cityId:'');
  const region=regionKey(cityId,city);
  const own=!!home&&e.mosque_id===home.id;
  if(!allAreas&&!own&&(!ownRegion||region!==ownRegion))return [];
  const next=nextOccurrence(e,today);
  if(!next&&(e.starts_on||e.weekdays||e.ends_on&&e.ends_on<today))return [];
  const canEdit=own&&user?.role==='primary'&&!e.source_id;
  const {mosque_id,local_name,local_city,content_hash,published_at,city_id,...event}=e;
  return [{...event,mosque_name:local_name||e.mosque_name,city,region,can_edit:canEdit,...(canEdit?{mosque_id}:{}),next_date:next}];
 });
 const sources=[...new Map(events.filter(event=>event.source_id).map(event=>[event.source_id,{id:event.source_id,name:event.mosque_name,city:event.city,region:event.region}])).values()];
 const regions=[...new Map(events.filter(event=>event.region).map(event=>[event.region,{id:event.region,name:event.city}])).values()].sort((a,b)=>a.name.localeCompare(b.name,'ar'));
 const read=user?await db.prepare('SELECT seen_at FROM community_reads WHERE user_id=?').bind(user.id).first<{seen_at:number}>():null;
 const managed=user?.role==='primary'?(await db.prepare('SELECT id,name FROM mosques WHERE id=?').bind(user.mosque_id).all()).results:[];
 const notificationsSince=Date.parse(notificationSince(user?.created_at)),seenAt=Math.max(read?.seen_at||0,notificationsSince);
 return {notifications_since:notificationsSince,events,sources,regions,can_filter_regions:allAreas,area_name:cityById.get(homeId??0)?.name||homeCity,is_directory_synced:!!directory,today,is_authenticated:!!user,seen_at:seenAt,unread_count:events.filter(e=>e.updated_at>seenAt).length,can_publish:managed.length>0,managed_mosques:managed,sync_interval_minutes:15,server_time:Date.now()};
}
