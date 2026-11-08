import {weeklyPoints} from './weekly-points';
import {rankFor} from './student-ranks';
export async function studentCertificates(ctx:any){
 const {user,method,body,params,scope,studentAccess,mosqueExists,rows,one,q,fail,json,audit}=ctx;
 const manager=['primary','supervisor'].includes(user.role);
 if(!manager&&user.role!=='student')fail(403,'الشهادات من صلاحيات المشرف والمشرف الأساسي فقط');
 if(method!=='GET'&&method!=='POST')fail(405,'عملية غير متاحة');
 if(method==='POST'&&!manager)fail(403,'منح الشهادة من صلاحيات المشرفين فقط');
 const mid=scope(method==='GET'?params.get('mosque'):body.mosque_id),sid=method==='GET'?params.get('student_id'):body.student_id;
 if(typeof sid!=='string'||!sid||sid.length>80)fail(400,'حدّد الطالب');
 const student=await studentAccess(sid,mid);await mosqueExists(mid);
 const prefix='student-certificate:'+sid+':';
 if(method==='GET'){
  const awards=await rows('SELECT value FROM settings WHERE key LIKE ?',prefix+'%');
  return json({awards:awards.map((r:any)=>JSON.parse(r.value)).sort((a:any,b:any)=>a.index-b.index)});
 }
 const index=body.index;if(!Number.isInteger(index)||index<0||index>6)fail(400,'الرتبة غير صالحة');
 const records=await rows('SELECT ms.*,u.name AS teacher_name FROM motivational_scores ms LEFT JOIN users u ON u.id=ms.updated_by WHERE ms.student_id=? ORDER BY ms.day DESC,ms.meeting',sid);
 const points=weeklyPoints(records);
 if(index>rankFor(points).index)fail(400,'لم يبلغ الطالب هذه الرتبة بعد');
 const mosque=await one('SELECT name,logo FROM mosques WHERE id=?',mid);
 const award={index,issued_at:new Date().toISOString(),issued_by:user.name,snapshot:{issued_at:new Date().toISOString(),points,records,student:{id:sid,name:student.name},mosque}};
 await q('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)',prefix+index,JSON.stringify(award)).run();
 await audit(mid,'مُنحت شهادة رتبة '+index+' للطالب '+student.name).run();
 return json({ok:true});
}
