import {addDays} from './islamic-calendar';
import {beirutStart} from './individual-recitation';
import {SURAHS} from './quran';
type Row=Record<string,any>;
export function summarizeSupervision(students:Row[],attendance:Row[],scores:Row[],memory:Row[]){
 return students.map(student=>{
  const history=attendance.filter(a=>a.student_id===student.id).sort((a,b)=>b.day.localeCompare(a.day));
  const counts={present:0,late:0,absent:0,excused:0};for(const a of history)if(a.status in counts)counts[a.status as keyof typeof counts]++;
  const grouped=new Map<string,Row[]>();for(const score of scores.filter(s=>s.student_id===student.id)){const list=grouped.get(score.series_key||score.series)||[];list.push(score);grouped.set(score.series_key||score.series,list)}
  const comparisons=[...grouped.entries()].map(([series,list])=>{list.sort((a,b)=>a.day.localeCompare(b.day)||String(a.created_at||a.id).localeCompare(String(b.created_at||b.id)));const size=list.length>=6?3:1;const avg=(items:Row[])=>items.reduce((n,r)=>n+r.percent,0)/items.length;const first=avg(list.slice(0,size)),latest=avg(list.slice(-size));return {series:list[0].series,count:list.length,window:size,first,latest,change:list.length>1?latest-first:null,first_day:list[0].day,last_day:list.at(-1)!.day}});
  const verses=memory.filter(m=>m.student_id===student.id).reduce((total,m)=>total+JSON.parse(m.ranges).reduce((n:number,[a,b]:number[])=>n+b-a+1,0),0);
  return {...student,history,counts,alert:counts.absent>=3,attendance_rate:history.length?Math.round((counts.present+counts.late)/history.length*100):null,comparisons,verses};
 });
}
export async function supervisionReport(ctx:any){
 const {user,params,method,scope,mosqueExists,rows,one,date,beirutDay,services,fail,json}=ctx;
 if(!['primary','supervisor'].includes(user.role))fail(403,'تقارير الإشراف للمشرف والمشرف الأساسي فقط');
 if(method!=='GET')fail(405,'هذه الصفحة للعرض والإحصاء');
 const mid=scope(params.get('mosque')||user.mosque_id);await mosqueExists(mid);
 const pdf=params.get('format')==='pdf';
 if(pdf&&user.role!=='primary')fail(403,'تصدير تقرير الجهة متاح للمشرف الأساسي');
 const end=pdf?date(params.get('date')||beirutDay()):null;
 const days=params.get('days')==='7'?7:30;
 const start=end?addDays(end,1-days):null;
 const students=await rows("SELECT id,name,status FROM students WHERE mosque_id=? AND status!='deleted' ORDER BY name",mid);
 const attendance=await rows("SELECT cr.student_id,cs.day,c.name AS circle_name,cr.status,cr.notes AS reason FROM circle_records cr JOIN circle_sessions cs ON cs.id=cr.session_id JOIN circles c ON c.id=cs.circle_id WHERE c.mosque_id=?",mid);
 const legacy=await rows("SELECT student_id,day,status,'' AS circle_name,'' AS reason FROM attendance WHERE mosque_id=?",mid);
 const occupied=new Set(attendance.map((r:Row)=>r.student_id+':'+r.day));attendance.push(...legacy.filter((r:Row)=>!occupied.has(r.student_id+':'+r.day)));
 const circleScores=await rows("SELECT cr.student_id,cs.day,cs.id AS id,c.id AS series_key,c.name AS series,(cr.quran+cr.religion+cr.conduct+cr.activity+COALESCE(cr.tajweed,0))*100.0/(CASE WHEN cr.score_max=18 THEN 15 WHEN cr.score_max=25 OR cr.tajweed IS NULL THEN 22 ELSE 27 END) AS percent FROM circle_records cr JOIN circle_sessions cs ON cs.id=cr.session_id JOIN circles c ON c.id=cs.circle_id WHERE c.mosque_id=? AND cr.status IN ('present','late')",mid);
 circleScores.forEach((r:Row)=>r.series='تقييم الحلقة: '+r.series);
 const assessments=await rows("SELECT a.id,a.student_id,a.day,a.created_at,a.surah,a.maximum,a.memorization,a.retention,a.tajweed,a.performance FROM assessments a JOIN students s ON s.id=a.student_id WHERE s.mosque_id=?",mid);
 const progress=await rows("SELECT id,student_id,day,created_at,kind,score FROM progress WHERE mosque_id=?",mid);
 const memory=await rows("SELECT m.student_id,m.ranges FROM memorization m JOIN students s ON s.id=m.student_id WHERE s.mosque_id=?",mid);
 const scores=[...circleScores,...assessments.map((a:Row)=>({...a,series:'أداء القرآن · سورة '+(SURAHS.find(s=>s.id===a.surah)?.name||a.surah),percent:(a.memorization+a.retention+a.tajweed+a.performance)*100/(a.maximum*4)})),...progress.map((p:Row)=>({...p,series:'متابعة: '+p.kind,percent:p.score*20}))];
 if(!pdf)return json({students:summarizeSupervision(students,attendance,scores,memory)});
 const [institution,details,circles,memberships,logins]=await Promise.all([
  one('SELECT name,city FROM mosques WHERE id=?',mid),
  rows("SELECT s.id,s.circle_id,s.joined_on,'SRG-'||n.number AS code FROM students s LEFT JOIN student_codes n ON n.student_id=s.id WHERE s.mosque_id=? AND s.status!='deleted'",mid),
  rows("SELECT c.id,c.name,c.schedule,u.name AS teacher FROM circles c LEFT JOIN users u ON u.id=c.teacher_id AND u.mosque_id=c.mosque_id WHERE c.mosque_id=? AND c.status='active' ORDER BY c.name",mid),
  rows("SELECT e.student_id,e.circle_id FROM circle_enrollments e JOIN circles c ON c.id=e.circle_id WHERE c.mosque_id=? AND c.status='active'",mid),
  rows("SELECT a.id,a.created_at,u.name,u.role,u.student_id FROM activity a JOIN users u ON u.id=a.actor_id AND u.mosque_id=a.mosque_id WHERE a.mosque_id=? AND a.message='auth:successful-login' AND a.created_at>=? AND a.created_at<? ORDER BY a.created_at DESC,a.id",mid,new Date(beirutStart(start!,0)).toISOString(),new Date(beirutStart(addDays(end!,1),0)).toISOString()),
 ]);
 const inPeriod=(r:Row)=>r.day>=start!&&r.day<=end!;
 const scopedAttendance=attendance.filter(inPeriod),scopedScores=services.learning===false?[]:scores.filter(inPeriod);
 const summaries=summarizeSupervision(students,scopedAttendance,scopedScores,services.learning===false?[]:memory);
 const byId=new Map<string,Row>(details.map((s:Row)=>[s.id,s]));
 return json({institution,start,end,circles,logins,learning:services.learning!==false,students:summaries.map(student=>{
  const profile=byId.get(student.id);
  const ids=new Set([profile?.circle_id,...memberships.filter((m:Row)=>m.student_id===student.id).map((m:Row)=>m.circle_id)]);
  return {...student,code:profile?.code,joined_on:profile?.joined_on,circles:circles.filter((c:Row)=>ids.has(c.id)).map((c:Row)=>c.name)};
 })});
}
