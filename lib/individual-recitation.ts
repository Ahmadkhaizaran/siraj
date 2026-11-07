import {beirutDay} from './islamic-calendar';
export type Slot={id:string;student_id:string;teacher_id:string;weekday:number;minute:number;duration?:number};
export function validateSlot(slot:Slot,slots:Slot[]){
 const duration=slot.duration??30;
 if(!Number.isInteger(duration)||duration<1||duration>1440)throw Error('مدة التسميع يجب أن تكون عددًا صحيحًا من الدقائق بين 1 و1440');
 if(!Number.isInteger(slot.weekday)||slot.weekday<0||slot.weekday>6||!Number.isInteger(slot.minute)||slot.minute<0||slot.minute+duration>1440)throw Error('اختر وقتًا صالحًا؛ يجب أن ينتهي اللقاء ضمن اليوم نفسه');
 if(slots.some(s=>s.id!==slot.id&&s.weekday===slot.weekday&&(s.teacher_id===slot.teacher_id||s.student_id===slot.student_id)&&slot.minute<s.minute+(s.duration??30)&&s.minute<slot.minute+duration))throw Error('الموعد متداخل مع لقاء آخر للمعلّم أو الطالب. اختر وقتًا بعد انتهاء اللقاء السابق.');
}
export function beirutStart(day:string,minute:number){
 const target=Date.parse(day+'T00:00:00Z')+minute*60000;let result=target;
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Beirut',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){const p=Object.fromEntries(fmt.formatToParts(new Date(result)).map(p=>[p.type,p.value]));const rendered=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);result+=target-rendered;}
 return result;
}
export function canExcuse(day:string,minute:number,now=Date.now()){return now<beirutStart(day,minute)-30*60000}
export async function individualRecitation(ctx:any){
 const {db,user,body,params,method,fail,json,mosqueExists,text}=ctx;
 const mid=text(method==='GET'?params.get('mosque'):body.mosque_id,'الجهة',80);await mosqueExists(mid);
 const q=(sql:string,...args:any[])=>db.prepare(sql).bind(...args);
 const rows=async(sql:string,...args:any[])=>(await q(sql,...args).all()).results||[];
 if(user.role!=='admin'){
  if(!['primary','supervisor'].includes(user.role)||user.mosque_id!==mid)fail(403,'ليس لديك صلاحية استخدام التسميع الفردي لهذه الجهة');
  const enabled=await q('SELECT value FROM settings WHERE key=?','feature:individual-recitation:'+mid).first();
  if(enabled?.value!=='enabled')fail(403,'التسميع الفردي غير مفعّل لهذه الجهة');
 }
 const key='beta:individual-recitation:'+mid;
 const stored=await q('SELECT value FROM settings WHERE key=?',key).first();
 const state=stored?JSON.parse(stored.value):{slots:[],responses:{}};
 const students=await rows("SELECT id,name FROM students WHERE mosque_id=? AND status='active'",mid);
 const teachers=await rows("SELECT id,name,phone FROM users WHERE mosque_id=? AND active=1 AND cancelled_at IS NULL AND role IN ('primary','supervisor','teacher')",mid);
 if(method==='GET')return json({...state,students,teachers,today:beirutDay()});
 if(method!=='POST')fail(405,'العملية غير متاحة');
 if(body.action==='save'){
  const slot:Slot={id:body.id?text(body.id,'الموعد',80):crypto.randomUUID(),student_id:text(body.student_id,'الطالب',80),teacher_id:text(body.teacher_id,'المعلّم',80),weekday:Number(body.weekday),minute:Number(body.minute),duration:body.duration==null?30:Number(body.duration)};
  if(body.id&&!state.slots.some((s:Slot)=>s.id===slot.id))fail(404,'الموعد غير موجود');
  if(!students.some((s:any)=>s.id===slot.student_id)||!teachers.some((t:any)=>t.id===slot.teacher_id))fail(400,'اختر طالبًا ومعلّمًا من الجهة نفسها');
  if(!teachers.find((t:any)=>t.id===slot.teacher_id)?.phone)fail(400,'أضف رقم هاتف المعلّم إلى حسابه أولًا');
  try{validateSlot(slot,state.slots)}catch(e){fail(409,(e as Error).message)}
  if(state.slots.length>=500&&!body.id)fail(400,'بلغت الحد الأقصى للمواعيد');
  state.slots=[...state.slots.filter((s:Slot)=>s.id!==slot.id),slot];
  if(body.id)for(const k of Object.keys(state.responses))if(k.startsWith(slot.id+':'))delete state.responses[k];
 }else if(body.action==='delete'){
  const sid=text(body.id,'الموعد',80);state.slots=state.slots.filter((s:Slot)=>s.id!==sid);
  for(const k of Object.keys(state.responses))if(k.startsWith(sid+':'))delete state.responses[k];
 }else if(body.action==='respond'){
  const slot=state.slots.find((s:Slot)=>s.id===body.id);if(!slot)fail(404,'الموعد غير موجود');
  const day=text(body.day,'التاريخ',10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T12:00:00Z'))||new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day||new Date(day+'T12:00:00Z').getUTCDay()!==slot.weekday)fail(400,'التاريخ لا يطابق يوم الموعد');
  const k=slot.id+':'+day;if(state.responses[k]?.status==='excused')fail(409,'تم الاعتذار عن هذا اللقاء ولا يمكن تغيير الرد');
  if(Date.now()>=beirutStart(day,slot.minute))fail(409,'بدأ اللقاء؛ تواصل مع المعلّم');
  if(!['confirmed','excused'].includes(body.status))fail(400,'اختر تأكيد الحضور أو الاعتذار');
  if(body.status==='excused'&&!canExcuse(day,slot.minute))fail(409,'انتهت مهلة الاعتذار قبل اللقاء بنصف ساعة. تواصل مع المعلّم على رقمه.');
  const reason=body.status==='excused'?text(body.reason,'سبب الاعتذار',500):'';
  state.responses[k]={status:body.status,reason,updated_at:new Date().toISOString()};
 }else fail(400,'عملية غير صالحة');
 const value=JSON.stringify(state);
 const result=stored?await q('UPDATE settings SET value=? WHERE key=? AND value=?',value,key,stored.value).run():await q('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)',key,value).run();
 if(Number(result.meta.changes)!==1)fail(409,'تغيّر الجدول أثناء التعديل. حدّث الصفحة وحاول مجددًا');
 return json({ok:true});
}
