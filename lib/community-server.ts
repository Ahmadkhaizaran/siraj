import {notificationSince} from './notification-policy';
import { MASJIDI_SOURCES,parseMasjidi } from './masjidi';
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
export async function communityFeed(db:D1DatabaseSession,user:User|null){
 await syncMasjidi(db);
 const data=await db.prepare("SELECT e.*,m.name AS local_name FROM calendar_events e LEFT JOIN mosques m ON m.id=e.mosque_id WHERE e.status='active' AND (e.mosque_id IS NULL OR m.cancelled_at IS NULL) ORDER BY e.updated_at DESC LIMIT 300").all<any>();
 const today=beirutDay();
 const events=(data.results||[]).map(e=>{
  const canEdit=!!user&&!e.source_id&&(user.role==='primary'&&user.mosque_id===e.mosque_id);
  const {mosque_id,local_name,content_hash,published_at,...publicEvent}=e;
  return {...publicEvent,mosque_name:local_name||e.mosque_name,can_edit:canEdit,...(canEdit?{mosque_id}:{}),next_date:nextOccurrence(e,today)};
 }).filter(e=>e.next_date||!e.starts_on&&!e.weekdays&&(!e.ends_on||e.ends_on>=today));
 const sources=(await db.prepare('SELECT id,name,city,url,status,checked_at,success_at,error,event_count FROM calendar_sources ORDER BY id').all()).results;
 const read=user?await db.prepare('SELECT seen_at FROM community_reads WHERE user_id=?').bind(user.id).first<{seen_at:number}>():null;
 const managed=user?.role==='primary'?(await db.prepare('SELECT id,name FROM mosques WHERE id=?').bind(user.mosque_id).all()).results:[];
 const notificationsSince=Date.parse(notificationSince(user?.created_at)),seenAt=Math.max(read?.seen_at||0,notificationsSince);
 return {notifications_since:notificationsSince,events,sources,today,is_authenticated:!!user,seen_at:seenAt,unread_count:events.filter(e=>e.updated_at>seenAt).length,can_publish:managed.length>0,managed_mosques:managed,sync_interval_minutes:15,server_time:Date.now()};
}
