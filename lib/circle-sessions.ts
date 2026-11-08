import {parseMemoryUpdates,memoryStatement,checkedMemoryBatch,circleKind} from './memory-updates';
import {circleWindow,validateSchedule,WEEKDAYS,type CircleSchedule} from './circle-window';
import {beirutDay,addDays} from './islamic-calendar';
import {MARKS,earnedPoints} from './student-ranks';
type Row=Record<string,any>;

// A circle has one attendance/assessment encounter per Beirut calendar day.
// A session-wide compare-and-swap gates every write in the atomic batch.
export async function circleSession(ctx:Row){
 const {db,user,body,params,method,path,scope,circleAccess,mosqueExists,text,date,fail,json}=ctx;
 const q=(sql:string,...args:any[])=>db.prepare(sql).bind(...args);
 const rows=async(sql:string,...args:any[])=>((await q(sql,...args).all()).results||[]) as Row[];
 const one=async(sql:string,...args:any[])=>await q(sql,...args).first() as Row|null;
 if(!['primary','supervisor','teacher'].includes(user.role))fail(403,'لقاءات الحلقات متاحة لفريق الجهة فقط');
 const mid=scope(method==='GET'?params.get('mosque'):body.mosque_id);
 await mosqueExists(mid);
 const cid=text(method==='GET'?params.get('circle_id'):body.circle_id,'الحلقة',80);
 const circle=await circleAccess(cid,mid);
 circle.kind=(await one('SELECT value FROM settings WHERE key=?','circle-kind:'+cid))?.value||circleKind(circle);
 const policyKey='circle-schedule:'+cid;
 const policy=await one('SELECT value FROM settings WHERE key=?',policyKey);
 let schedule:CircleSchedule|null=null;try{if(policy)schedule=validateSchedule(JSON.parse(policy.value))}catch{}
 if(path==='circle-schedule'){
  if(method!=='POST')fail(405,'العملية غير متاحة');
  if(user.role!=='primary')fail(403,'موعد الحلقة من صلاحيات المشرف الأساسي');
  let next:CircleSchedule;try{next=validateSchedule(body.schedule)}catch(e){fail(400,(e as Error).message);return}
  const prayers:Row={Fajr:'الفجر',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء'};
  const label=WEEKDAYS[next.weekday]+(next.mode==='day'?' · طوال اليوم':next.mode==='clock'?' · '+next.time:' · بعد أذان '+prayers[next.prayer!]+' بـ '+next.delay+' دقيقة');
  await db.batch([q('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',policyKey,JSON.stringify(next)),q('UPDATE circles SET schedule=? WHERE id=?',label,cid),q('INSERT INTO activity (id,mosque_id,actor_id,message,created_at) VALUES (?,?,?,?,?)',crypto.randomUUID(),mid,user.id,'حُدّد موعد تقييم حلقة '+circle.name,new Date().toISOString())]);
  return json({ok:true});
 }
 const member="(s.circle_id=? OR EXISTS (SELECT 1 FROM circle_enrollments ce WHERE ce.student_id=s.id AND ce.circle_id=?))";
 if(path==='circle-enrollments'){
  if(method!=='POST')fail(405,'العملية غير متاحة');
  if(user.role!=='primary')fail(403,'توزيع الطلاب على الحلقات من صلاحيات المشرف الأساسي');
  if(!Array.isArray(body.student_ids)||body.student_ids.length>500)fail(400,'اختر طلاب الحلقة');
  const ids:string[]=body.student_ids.map((v:unknown)=>text(v,'الطالب',80));
  if(new Set(ids).size!==ids.length)fail(400,'الطالب مكرر');
  for(const sid of ids)if(!await one("SELECT id FROM students WHERE id=? AND mosque_id=? AND status='active'",sid,mid))fail(400,'اختر طلابًا منتظمين من الجهة نفسها');
  const stamp=new Date().toISOString();
  const fallback="(SELECT ce.circle_id FROM circle_enrollments ce JOIN circles c ON c.id=ce.circle_id WHERE ce.student_id=students.id AND ce.circle_id!=? AND c.mosque_id=students.mosque_id AND c.status='active' ORDER BY ce.created_at,ce.circle_id LIMIT 1)";
  const clear=ids.length?q('UPDATE students SET circle_id='+fallback+' WHERE mosque_id=? AND circle_id=? AND id NOT IN ('+ids.map(()=>'?').join(',')+')',cid,mid,cid,...ids):q('UPDATE students SET circle_id='+fallback+' WHERE mosque_id=? AND circle_id=?',cid,mid,cid);
  await db.batch([clear,q('DELETE FROM circle_enrollments WHERE circle_id=?',cid),...ids.flatMap(sid=>[q('INSERT INTO circle_enrollments (circle_id,student_id,created_at) VALUES (?,?,?)',cid,sid,stamp),q('UPDATE students SET circle_id=? WHERE id=? AND mosque_id=? AND circle_id IS NULL',cid,sid,mid)]),q('INSERT INTO activity (id,mosque_id,actor_id,message,created_at) VALUES (?,?,?,?,?)',crypto.randomUUID(),mid,user.id,'حُدّث طلاب حلقة '+circle.name,stamp)]);
  return json({ok:true});
 }
 const day=date(method==='GET'?params.get('date')||beirutDay():body.date);
 const sessionId=cid+':'+day;
 const session=await one('SELECT id,day,revision,updated_at FROM circle_sessions WHERE circle_id=? AND day=?',cid,day);
 const weekday=new Date(day+'T12:00:00Z').getUTCDay(),weekStart=addDays(day,-((weekday+6)%7)),weekEnd=addDays(weekStart,6);
 const weeklySession=await one('SELECT id FROM circle_sessions WHERE circle_id=? AND day>=? AND day<=? LIMIT 1',cid,weekStart,weekEnd);
 const window=await circleWindow(schedule,day,!!weeklySession);
 if(method==='GET'){
  const students=await rows("SELECT s.id,s.name,s.status AS student_status,'SRG-'||n.number AS student_code FROM students s LEFT JOIN student_codes n ON n.student_id=s.id WHERE s.mosque_id=? AND s.status!='deleted' AND ((s.status='active' AND "+member+") OR EXISTS (SELECT 1 FROM circle_records cr WHERE cr.student_id=s.id AND cr.session_id=?)) ORDER BY s.name,s.id",mid,cid,cid,sessionId);
  const memoryChanges=await rows('SELECT key,value FROM settings WHERE key LIKE ?','circle-memory:'+sessionId+':%');
  const records=await rows('SELECT student_id,status,attendance,quran,religion,conduct,activity,points,notes,updated_at FROM circle_records WHERE session_id=?',sessionId);
  const members=await rows("SELECT s.id FROM students s WHERE s.mosque_id=? AND s.status='active' AND "+member,mid,cid,cid);
  const encounters=await rows('SELECT cs.day,cs.revision,(SELECT COUNT(*) FROM circle_records cr WHERE cr.session_id=cs.id) AS students_count FROM circle_sessions cs WHERE cs.circle_id=? ORDER BY cs.day DESC LIMIT 90',cid);
  const memory=await rows('SELECT m.student_id,m.surah,m.ranges,m.revision FROM memorization m JOIN students s ON s.id=m.student_id WHERE s.mosque_id=?',mid);
  return json({circle,date:day,revision:session?.revision||0,students:students.map(s=>({...s,memory:memory.filter(m=>m.student_id===s.id).map(m=>({...m,ranges:JSON.parse(m.ranges)})),record:records.find(r=>r.student_id===s.id)?{...records.find(r=>r.student_id===s.id),memory_updates:JSON.parse(memoryChanges.find(m=>m.key==='circle-memory:'+sessionId+':'+s.id)?.value||'[]')}:null})),member_ids:members.map(s=>s.id),encounters,schedule,window,can_record:circle.teacher_id===user.id&&window.open,can_enroll:user.role==='primary'});
 }
 if(method!=='POST')fail(405,'العملية غير متاحة');
 if(circle.teacher_id!==user.id)fail(403,'تسجيل حضور وتقييمات الحلقة خاص بالمدرّس أو المشرف المسندة إليه');
 if(!window.open)fail(403,window.reason);
 if(day>beirutDay())fail(400,'يمكن تجهيز اللقاء القادم، وتسجيل الحضور والعلامات في يومه');
 if(!Number.isSafeInteger(body.revision)||body.revision<0)fail(400,'نسخة اللقاء غير صالحة');
 if((session?.revision||0)!==body.revision)fail(409,'تغيّر اللقاء؛ حدّث سجله قبل الحفظ');
 if(!Array.isArray(body.records)||!body.records.length||body.records.length>500)fail(400,'سجّل حالة طالب واحد على الأقل');
 const seen=new Set<string>(),records:Row[]=[];
 for(const input of body.records){
  const sid=text(input.student_id,'الطالب',80);if(seen.has(sid))fail(400,'الطالب مكرر');seen.add(sid);
  if(!await one("SELECT s.id FROM students s WHERE s.id=? AND s.mosque_id=? AND s.status!='deleted' AND ((s.status='active' AND "+member+") OR EXISTS (SELECT 1 FROM circle_records cr WHERE cr.student_id=s.id AND cr.session_id=?))",sid,mid,cid,cid,sessionId))fail(403,'الطالب غير مسجل في هذه الحلقة');
  if(!['present','late','absent','excused'].includes(input.status))fail(400,'حدّد حالة الحضور');
  if(input.status==='excused'&&!String(input.notes||'').trim())fail(400,'أضف سبب الاعتذار للطالب');
  const values:Record<string,number>={attendance:input.status==='present'?3:input.status==='late'?2:0};
  for(const [key,label,max] of MARKS){if(key==='attendance')continue;const value=input[key]??0;if(!Number.isInteger(value)||value<0||value>max)fail(400,'تحقّق من علامة '+label);values[key]=value;}
  if(['absent','excused'].includes(input.status)&&Object.values(values).some(v=>v!==0))fail(400,'الطالب الغائب أو المعذور لا يحصل على علامات لقاء لم يحضره');
  let memoryUpdates:ReturnType<typeof parseMemoryUpdates>=[];try{memoryUpdates=parseMemoryUpdates(input.memory_updates)}catch(e){fail(400,(e as Error).message)}
  if(memoryUpdates?.length&&(circle.kind!=='quran'||!['present','late'].includes(input.status)))fail(400,'تحديث الحفظ متاح للحاضر في حلقة قرآن فقط');
  const meeting='circle:'+cid,prior=await one('SELECT points FROM motivational_scores WHERE student_id=? AND day=? AND meeting=?',sid,day,meeting);
  records.push({sid,memoryUpdates:memoryUpdates||[],status:input.status,values,points:earnedPoints(values),notes:text(input.notes,'الملاحظات',1000,false),prior:prior?.points||0,meeting});
 }
 const roster=await rows("SELECT s.id FROM students s WHERE s.mosque_id=? AND s.status='active' AND "+member,mid,cid,cid);
 if(roster.some(s=>!seen.has(s.id)))fail(400,'حدّد حالة جميع طلاب الحلقة قبل الاعتماد النهائي؛ اللقاء سيُقفل بعد الحفظ');
 const stamp=new Date().toISOString(),token=crypto.randomUUID();
 const authorized="EXISTS (SELECT 1 FROM circles c JOIN mosques m ON m.id=c.mosque_id WHERE c.id=? AND c.teacher_id=? AND c.status='active' AND m.cancelled_at IS NULL AND EXISTS (SELECT 1 FROM settings st WHERE st.key='circle-schedule:'||c.id AND st.value=?) AND NOT EXISTS (SELECT 1 FROM circle_sessions prior WHERE prior.circle_id=c.id AND prior.day>=? AND prior.day<=?))";
 const gate='EXISTS (SELECT 1 FROM circle_sessions cs WHERE cs.id=? AND cs.write_token=?)';
 const statements=[q('INSERT INTO circle_sessions (id,circle_id,day,revision,write_token,updated_by,updated_at) SELECT ?,?,?,1,?,?,? WHERE '+authorized+' ON CONFLICT(circle_id,day) DO UPDATE SET revision=circle_sessions.revision+1,write_token=excluded.write_token,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE circle_sessions.revision=0 AND circle_sessions.revision=? AND '+authorized,sessionId,cid,day,token,user.id,stamp,cid,user.id,policy!.value,weekStart,weekEnd,body.revision,cid,user.id,policy!.value,weekStart,weekEnd)];
 const required=[0];
 for(const r of records){
  for(const m of r.memoryUpdates){required.push(statements.length);statements.push(memoryStatement(q,r.sid,m,user.id,stamp,gate,[sessionId,token]))}
  if(r.memoryUpdates.length)statements.push(q('INSERT INTO settings (key,value) SELECT ?,? WHERE '+gate,'circle-memory:'+sessionId+':'+r.sid,JSON.stringify(r.memoryUpdates),sessionId,token));
  const marks=MARKS.map(([key])=>r.values[key]);
  statements.push(q('INSERT INTO circle_records (session_id,student_id,status,attendance,quran,religion,conduct,activity,points,notes,updated_by,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE '+gate+' ON CONFLICT(session_id,student_id) DO UPDATE SET status=excluded.status,attendance=excluded.attendance,quran=excluded.quran,religion=excluded.religion,conduct=excluded.conduct,activity=excluded.activity,points=excluded.points,notes=excluded.notes,updated_by=excluded.updated_by,updated_at=excluded.updated_at',sessionId,r.sid,r.status,...marks,r.points,r.notes,user.id,stamp,sessionId,token));
  statements.push(q('INSERT INTO motivational_scores (student_id,day,meeting,attendance,quran,religion,conduct,activity,points,notes,revision,updated_by,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,1,?,? WHERE '+gate+' ON CONFLICT(student_id,day,meeting) DO UPDATE SET attendance=excluded.attendance,quran=excluded.quran,religion=excluded.religion,conduct=excluded.conduct,activity=excluded.activity,points=excluded.points,notes=excluded.notes,revision=motivational_scores.revision+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at',r.sid,day,r.meeting,...marks,r.points,r.notes,user.id,stamp,sessionId,token));
  statements.push(q('INSERT OR IGNORE INTO platform_achievements (student_id,rank,points,marks,meeting,day,created_at) SELECT ?,MIN(6,CAST(SUM(points)/35 AS INTEGER)),SUM(points),?,?,?,? FROM motivational_scores WHERE student_id=? HAVING MIN(6,CAST(SUM(points)/35 AS INTEGER))>MIN(6,CAST((SUM(points)-?+?)/35 AS INTEGER)) AND ?>=20 AND ?>=4 AND '+gate,r.sid,JSON.stringify(r.values),r.meeting,day,stamp,r.sid,r.points,r.prior,Object.values(r.values).reduce<number>((n,v)=>n+Number(v),0),r.values.conduct,sessionId,token));
 }
 statements.push(q('INSERT INTO activity (id,mosque_id,actor_id,message,created_at) SELECT ?,?,?,?,? WHERE '+gate,crypto.randomUUID(),mid,user.id,'حُفظ لقاء '+circle.name+' بتاريخ '+day,stamp,sessionId,token));
 const result=records.some(r=>r.memoryUpdates.length)?await checkedMemoryBatch(db,statements,required,fail):await db.batch(statements);
 if(!result[0].meta.changes)fail(409,'تغيّر اللقاء أو إسناد الحلقة؛ حدّث الصفحة قبل الحفظ');
 return json({ok:true,revision:body.revision+1,points:records.reduce((n,r)=>n+r.points,0)});
}
