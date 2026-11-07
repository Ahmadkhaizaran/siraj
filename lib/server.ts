import {sealStudentPassword,openStudentPassword,readablePassword} from './credential-vault';
import {circleSession} from './circle-sessions';
import { defaultRuntime, type SirajRuntime } from './server-runtime';
import { digest, equal, hashPassword, verifyPassword, token } from './auth-crypto';
import { communityFeed } from './community-server';
import { beirutDay } from './islamic-calendar';
import { SURAHS, normalizeRanges } from './quran';
import {notificationSince} from './notification-policy';
import {rankFor} from './student-ranks';
import { ENTITY_KINDS } from './entity-kinds';
type Row = Record<string, any>;
type User = {id:string;mosque_id:string|null;name:string;username:string;role:string;active:number;student_id:string|null;created_at:string};
class APIError extends Error { constructor(public status:number,message:string){super(message);} }
function fail(status:number,message:string):never{throw new APIError(status,message)}
const id=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
function studentPassword(name:string){
 const prefix=name.trim().split(/\s+/)[0].replace(/[^A-Za-z]/g,'').slice(0,3);
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const random=crypto.getRandomValues(new Uint8Array(9-prefix.length));
 return prefix+'-'+Array.from(random,b=>alphabet[b&31]).join('');
}
const SESSION_SECONDS=365*24*60*60;

const publicUser=(u:Row):User=>({id:u.id,mosque_id:u.mosque_id,name:u.name,username:u.role==='student'&&u.student_number?'SRG-'+u.student_number:u.username,role:u.role,active:u.active,created_at:u.created_at,student_id:u.student_id||null});
function text(v:unknown,label:string,max=150,required=true){if(v==null&&!required)return '';if(typeof v!=='string'||(required&&!v.trim())||v.length>max)fail(400,`تحقّق من ${label}`);return (v as string).trim();}
function entityKind(v:unknown){if(typeof v!=='string'||!Object.prototype.hasOwnProperty.call(ENTITY_KINDS,v))fail(400,'اختر نوع الجهة التعليمية');return v as string;}
function date(v:unknown){const s=text(v,'التاريخ',10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(new Date(s).getTime())||new Date(s).toISOString().slice(0,10)!==s)fail(400,'التاريخ غير صالح');return s;}
function username(v:unknown){const s=text(v,'اسم المستخدم',40).toLowerCase();if(!/^[a-z0-9_.-]{3,40}$/.test(s))fail(400,'اسم المستخدم: 3 إلى 40 حرفًا إنكليزيًا أو رقمًا أو _ . -');return s;}
function loginPassword(v:unknown){if(typeof v!=='string'||!v.length||v.length>128)fail(400,'تحقّق من كلمة السر');return v;}
function password(v:unknown){if(typeof v!=='string'||v.length<12||v.length>128)fail(400,'كلمة السر يجب أن تتكوّن من 12 إلى 128 محرفًا');return v as string;}
function sessionCookie(req:Request,value:string,maxAge=2592000){const secure=new URL(req.url).protocol==='https:';return `${secure?'__Host-siraj_session':'siraj_session'}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`;}
function cookieToken(req:Request){return req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-siraj_session=')||s.startsWith('siraj_session='))?.split('=')[1]||'';}
export async function handle(req:Request,runtime?:SirajRuntime){
 let refreshedCookie:string|undefined;
 let issuedSessionAge=2592000;
 const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...(refreshedCookie?{'Set-Cookie':refreshedCookie}:{}),...headers}});
 try{
  const env=runtime||await defaultRuntime();
  if(!env.DB)fail(503,'قاعدة البيانات غير متاحة حاليًا');
  const db=env.DB!.withSession('first-primary');
  const q=(sql:string,...args:any[])=>db.prepare(sql).bind(...args);
  const rows=async(sql:string,...args:any[])=>((await q(sql,...args).all<Row>()).results||[]);
  const one=(sql:string,...args:any[])=>q(sql,...args).first<Row>();
  const path=new URL(req.url).pathname.replace(/^\/api\//,'');
  const method=req.method;
  const write=!['GET','HEAD'].includes(method);
  if(write){
   const origin=req.headers.get('origin');
   if(!origin||origin!==new URL(req.url).origin)fail(403,'الطلب غير مسموح من هذا المصدر');
   if(!req.headers.get('content-type')?.includes('application/json'))fail(415,'صيغة الطلب غير صالحة');
   const length=Number(req.headers.get('content-length')||0);if(length>450000)fail(413,'حجم الطلب كبير جدًا');
  }
  let body:Row={};
  if(write){const raw=await req.text();if(raw.length>450000)fail(413,'حجم الطلب كبير جدًا');try{body=JSON.parse(raw)}catch{fail(400,'تعذّر قراءة الطلب')}if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'طلب غير صالح');}
  const initialized=async()=>!!await one("SELECT key FROM settings WHERE key='initialized'");
  const pepper=()=>env.SIRAJ_PASSWORD_PEPPER||fail(503,'إعداد تسجيل الدخول غير مكتمل');
  const throttle=async(key:string,max:number)=>{
   const timestamp=Date.now(),expires=timestamp+15*60*1000;
   await q('INSERT INTO auth_attempts (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN auth_attempts.expires_at<? THEN 1 ELSE auth_attempts.count+1 END, expires_at=CASE WHEN auth_attempts.expires_at<? THEN ? ELSE auth_attempts.expires_at END',key,expires,timestamp,timestamp,expires).run();
   const a=await one('SELECT count FROM auth_attempts WHERE key=?',key);if(Number(a?.count)>max)fail(429,'محاولات كثيرة. حاول مجددًا بعد 15 دقيقة.');
  };
  const newSession=async(userId:string)=>{const account=await one('SELECT role FROM users WHERE id=?',userId);issuedSessionAge=account?.role==='student'?SESSION_SECONDS:2592000;const t=token();await q('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)',await digest(t),userId,Date.now()+issuedSessionAge*1000).run();return t;};
  const current=async()=>{
   const t=cookieToken(req);if(!t)return null;const hash=await digest(t);
   const u=await one('SELECT u.*,n.number AS student_number,s.expires_at AS session_expires FROM users u JOIN sessions s ON s.user_id=u.id LEFT JOIN student_codes n ON n.student_id=u.student_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1 AND u.cancelled_at IS NULL AND (u.mosque_id IS NULL OR EXISTS (SELECT 1 FROM mosques m WHERE m.id=u.mosque_id AND m.cancelled_at IS NULL))',hash,Date.now());
   if(!u)return null;
   if(u.role==='student'&&u.session_expires-Date.now()<30*24*60*60*1000){await q('UPDATE sessions SET expires_at=? WHERE token_hash=?',Date.now()+SESSION_SECONDS*1000,hash).run();refreshedCookie=sessionCookie(req,t,SESSION_SECONDS);}
   return publicUser(u);
  };
  if(path==='auth/status'&&method==='GET')return json({initialized:await initialized(),user:await current()});
  if(path==='auth/setup'&&method==='POST'){
   await throttle('setup:'+await digest(req.headers.get('cf-connecting-ip')||'local'),12);
   if(await initialized())fail(409,'تم إعداد المنصّة مسبقًا. سجّل الدخول إلى حسابك.');
   if(!env.SIRAJ_SETUP_TOKEN_HASH||!equal(await digest(text(body.setup_key,'رابط التفعيل',128)),env.SIRAJ_SETUP_TOKEN_HASH))fail(403,'افتح رابط إعداد المدير الخاص بك');
   const name=text(body.name,'الاسم'),login=username(body.username),hashed=await hashPassword(password(body.password),pepper());
   const uid=id(),mid=id(),stamp=now();
   await db.batch([
    q("INSERT INTO settings (key,value) VALUES ('initialized',?)",stamp),
    q('INSERT INTO mosques (id,name,city,created_at) VALUES (?,?,?,?)',mid,'مسجد الزيتونة','صيدا، لبنان',stamp),
    q("INSERT INTO users (id,name,username,password_hash,role,mosque_id,active,created_at) VALUES (?,?,?,?,'admin',NULL,1,?)",uid,name,login,hashed,stamp),
    q('INSERT INTO activity (id,mosque_id,actor_id,message,created_at) VALUES (?,?,?,?,?)',id(),mid,uid,'جُهّزت المنصّة وأُضيف أول مسجد',stamp)
   ]);
   const t=await newSession(uid);return json({ok:true},201,{'Set-Cookie':sessionCookie(req,t,issuedSessionAge)});
  }
  if(path==='auth/login'&&method==='POST'){
   const login=username(body.username),pw=loginPassword(body.password);
   await throttle('ip:'+await digest(req.headers.get('cf-connecting-ip')||'local'),45);
   await throttle('account:'+await digest(login),10);
   const canonical=/^srg-([1-9]\d*)$/.exec(login);
   // Existing accounts retain their passwords; both their old login and the new compact code work.
   const u=canonical?await one('SELECT u.* FROM users u JOIN student_codes n ON n.student_id=u.student_id WHERE n.number=? AND u.role=\'student\'',Number(canonical[1])):await one('SELECT * FROM users WHERE username=?',login);
   const dummy='v1$000000000000000000000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';
   let valid=await verifyPassword(pw,u?.password_hash||dummy,pepper());
   // Imported hashes keep their existing pepper private on the original host.
   // Only explicitly imported, unchanged hashes may verify once with that host.
   // A successful login upgrades the hash locally; password resets disable this
   // path automatically because the imported hash no longer matches.
   if(!valid&&u?.active&&!u.cancelled_at&&env.SIRAJ_LEGACY_AUTH_URL){
    const imported=await one('SELECT value FROM settings WHERE key=?','migration:legacy-password:'+u.id);
    if(imported?.value===u.password_hash){
     const legacy=new URL('/api/auth/login',env.SIRAJ_LEGACY_AUTH_URL);
     try{
      const response=await fetch(legacy,{method:'POST',headers:{'Content-Type':'application/json','Origin':legacy.origin},body:JSON.stringify({username:login,password:pw}),redirect:'error',signal:AbortSignal.timeout(12000)});
      if(response.status!==401){
       if(response.status!==200||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')fail(503,'تعذّر التحقق من الحساب المنقول. حاول مجددًا بعد قليل.');
       const confirmation:unknown=await response.json();
       if(!confirmation||typeof confirmation!=='object'||Array.isArray(confirmation)||(confirmation as {ok?:unknown}).ok!==true)fail(503,'تعذّر التحقق من الحساب المنقول. حاول مجددًا بعد قليل.');
       const upgradedHash=await hashPassword(pw,pepper());
       const [upgrade]=await db.batch([
        q('UPDATE users SET password_hash=? WHERE id=? AND password_hash=? AND active=1 AND cancelled_at IS NULL',upgradedHash,u.id,u.password_hash),
        q('DELETE FROM settings WHERE key=? AND value=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND password_hash=?)','migration:legacy-password:'+u.id,u.password_hash,u.id,upgradedHash),
       ]);
       valid=Number(upgrade.meta.changes)===1;
      }
     }catch{fail(503,'تعذّر التحقق من الحساب المنقول. حاول مجددًا بعد قليل.');}
    }
   }
   if(!u||!valid||!u.active||u.cancelled_at||(u.mosque_id&&!await one('SELECT id FROM mosques WHERE id=? AND cancelled_at IS NULL',u.mosque_id)))fail(401,'اسم المستخدم أو كلمة السر غير صحيح');
   await q('DELETE FROM auth_attempts WHERE key=?','account:'+await digest(login)).run();
   const t=await newSession(u.id);return json({ok:true},200,{'Set-Cookie':sessionCookie(req,t,issuedSessionAge)});
  }
  if(path==='auth/logout'&&method==='POST'){const t=cookieToken(req);if(t)await q('DELETE FROM sessions WHERE token_hash=?',await digest(t)).run();return json({ok:true},200,{'Set-Cookie':sessionCookie(req,'',0)});}
  const u=await current();if(!u)fail(401,'يرجى تسجيل الدخول');
  const user=u!;
  if(path==='calendar'&&method==='GET')return json(await communityFeed(db,user));
  const isOwner=user.role==='admin',isAdmin=['admin','platform_supervisor'].includes(user.role),manager=isAdmin||user.role==='primary',isTeacher=user.role==='teacher',isStudent=user.role==='student';
  if(isStudent&&path==='export')fail(403,'تصدير بيانات الجهة متاح لإدارتها فقط');
  if(isStudent&&write&&!['auth/password','calendar/seen'].includes(path))fail(403,'حساب الطالب للعرض فقط');
  if(isAdmin&&['students','circles','attendance','progress','export','student-profile','memorization','assessments','student-account','motivation','circle-session','circle-enrollments','circle-schedule'].includes(path))fail(403,'المتابعة التعليمية من صلاحيات إدارة المسجد أو المركز ومدرّسيه');
  const scope=(mosque:unknown)=>{const mid=text(mosque,'المسجد',80);if(!isAdmin&&mid!==user.mosque_id)fail(403,'ليس لديك صلاحية الوصول إلى هذا المسجد أو المركز');return mid;};
  const mosqueExists=async(mid:string)=>{if(!await one('SELECT id FROM mosques WHERE id=? AND cancelled_at IS NULL',mid))fail(404,'المسجد أو المركز غير موجود');};
  const circleAccess=async(cid:string,mid:string)=>{const c=await one("SELECT * FROM circles WHERE id=? AND mosque_id=? AND status='active'",cid,mid);if(!c)fail(404,'الحلقة غير موجودة في هذا المسجد أو المركز');if(isTeacher&&c!.teacher_id!==user.id)fail(403,'هذه الحلقة غير مسندة إليك');return c!;};
  const studentAccess=async(sid:string,mid:string)=>{if(isStudent&&sid!==user.student_id)fail(403,'يمكنك عرض ملفّك فقط');const s=await one("SELECT * FROM students WHERE id=? AND mosque_id=? AND status!='deleted'",sid,mid);if(!s)fail(404,'الطالب غير موجود في هذا المسجد أو المركز');if(isTeacher&&!await one("SELECT c.id FROM circles c WHERE c.mosque_id=? AND c.teacher_id=? AND c.status='active' AND (c.id=? OR EXISTS (SELECT 1 FROM circle_enrollments ce WHERE ce.circle_id=c.id AND ce.student_id=?))",mid,user.id,s!.circle_id,sid))fail(403,'الطالب غير مسند إلى حلقتك');return s!;};
  const audit=(mid:string|null,message:string)=>q('INSERT INTO activity (id,mosque_id,actor_id,message,created_at) VALUES (?,?,?,?,?)',id(),mid,user.id,message,now());
  const params=new URL(req.url).searchParams;
  if(path==='student-credentials'&&['GET','POST'].includes(method)){
   if(!isOwner)fail(403,'حسابات طلاب جميع الجهات من صلاحيات صاحب المنصّة فقط');
   if(method==='GET')return json({accounts:await rows("SELECT u.id,u.student_id,u.username,s.name,s.contact_mode,m.name AS mosque_name,m.id AS mosque_id,CASE WHEN v.key IS NULL THEN 0 ELSE 1 END AS recoverable FROM users u JOIN students s ON s.id=u.student_id JOIN mosques m ON m.id=u.mosque_id LEFT JOIN settings v ON v.key='student-credential:'||u.student_id WHERE u.role='student' AND u.cancelled_at IS NULL AND s.status!='deleted' AND m.cancelled_at IS NULL ORDER BY m.name,s.name")});
   await throttle('student-recovery:'+user.id,30);
   const account=await one("SELECT u.username,u.password_hash,u.student_id,s.name,s.contact_mode,u.mosque_id FROM users u JOIN students s ON s.id=u.student_id JOIN mosques m ON m.id=u.mosque_id WHERE u.id=? AND u.role='student' AND u.cancelled_at IS NULL AND s.status!='deleted' AND m.cancelled_at IS NULL",text(body.id,'الحساب',80));
   if(!account)fail(404,'حساب الطالب غير موجود');
   const saved=await one('SELECT value FROM settings WHERE key=?','student-credential:'+account.student_id);
   if(!saved)fail(409,'كلمة السر القديمة لم تُحفظ للاسترجاع. يستطيع المشرف الأساسي تجديدها من ملف الطالب دون فقدان سجله.');
   let secret='';try{secret=await openStudentPassword(account.student_id,account.password_hash,saved.value,pepper())}catch{fail(409,'تعذّر استرجاع كلمة السر المحفوظة؛ راجع المشرف الأساسي لتجديدها.');}
   await audit(account.mosque_id,'استرجع صاحب المنصّة بيانات دخول الطالب '+account.name).run();
   return json({credentials:{name:account.name,username:account.username.toUpperCase(),password:secret,contact_mode:account.contact_mode}});
  }
  if(path==='staff-credentials'&&method==='POST'){
   if(!isOwner&&!['primary','supervisor','teacher'].includes(user.role))fail(403,'استرجاع حسابات الفريق متاح لصاحب المنصّة وفريق تعليم الجهة');
   await throttle('staff-recovery:'+user.id,30);
   const target=await one("SELECT id,name,username,password_hash,role,mosque_id,active FROM users WHERE id=? AND cancelled_at IS NULL",text(body.id,'الحساب',80));
   if(!target||!['primary','supervisor','teacher','platform_supervisor'].includes(target.role)||!target.active)fail(404,'الحساب غير متاح للاسترجاع');
   if(!isOwner&&(!target.mosque_id||target.mosque_id!==user.mosque_id||!['primary','supervisor','teacher'].includes(target.role)))fail(403,'يمكنك استرجاع حسابات فريق التعليم في جهتك فقط');
   if(target.mosque_id)await mosqueExists(target.mosque_id);
   const saved=await one('SELECT value FROM settings WHERE key=?','staff-credential:'+target.id);
   if(!saved)fail(409,'الحساب قديم؛ عيّن كلمة سر جديدة واحفظها مرة واحدة لتفعيل نسخ بيانات الدخول');
   let secret='';try{secret=await openStudentPassword('staff:'+target.id,target.password_hash,saved.value,pepper())}catch{fail(409,'تغيّرت كلمة السر؛ جدّدها واحفظها مرة واحدة لتفعيل النسخ')}
   await audit(target.mosque_id,'استُرجعت بيانات دخول حساب الفريق '+target.name).run();
   return json({kind:target.role==='platform_supervisor'?'platform':'staff',credentials:{name:target.name,username:target.username,password:secret}});
  }
  if(path==='platform-users'&&['POST','PATCH'].includes(method)){
   if(!isOwner)fail(403,'إدارة فريق المنصّة من صلاحيات المدير فقط');
   const automatic=method==='POST'&&(body.auto_credentials===true||!body.username||!body.password);
   const name=text(body.name,'الاسم'),phone=text(body.phone,'الهاتف',60,automatic);let login=automatic?'':username(body.username);
   if(/^srg-\d+$/.test(login))fail(400,'هذه الصيغة محجوزة للطلاب');
   if(method==='POST'){
    const englishName=text(body.english_name,'الاسم بالإنجليزي',120,automatic);
    if(englishName&&!/^[A-Za-z][A-Za-z .'-]{1,119}$/.test(englishName))fail(400,'اكتب الاسم بالإنجليزي');
    const secret=automatic?readablePassword():password(body.password);
    if(automatic){const base='sj.'+englishName.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'').slice(0,25).replace(/\.$/,'');for(let attempt=0;attempt<100;attempt++){login=base+(attempt?String(attempt+1):'');if(!await one('SELECT id FROM users WHERE username=?',login))break;login='';}if(!login)fail(503,'تعذّر توليد اسم الدخول، حاول مجددًا')}
    const uid=id(),hashed=await hashPassword(secret,pepper());
    await db.batch([q("INSERT INTO users (id,name,english_name,username,password_hash,role,mosque_id,phone,active,created_at) VALUES (?,?,?,?,?,'platform_supervisor',NULL,?,1,?)",uid,name,englishName,login,hashed,phone,now()),q('INSERT INTO settings (key,value) VALUES (?,?)','staff-credential:'+uid,await sealStudentPassword('staff:'+uid,hashed,secret,pepper())),audit(null,'أُضيف مشرف منصّة '+name)]);
    return json({ok:true,id:uid,...(automatic?{credentials:{username:login,password:secret}}:{})},201);
   }
   const target=await one("SELECT id FROM users WHERE id=? AND role='platform_supervisor' AND cancelled_at IS NULL",text(body.id,'الحساب',80));
   if(!target)fail(404,'مشرف المنصّة غير موجود');
   const statements=[q('UPDATE users SET name=?,username=?,phone=?,active=? WHERE id=?',name,login,phone,body.active===0?0:1,target.id),q('DELETE FROM sessions WHERE user_id=?',target.id),audit(null,'حُدّث مشرف منصّة '+name)];
   if(body.password){const secret=password(body.password),hashed=await hashPassword(secret,pepper());statements.push(q('UPDATE users SET password_hash=? WHERE id=?',hashed,target.id),q('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','staff-credential:'+target.id,await sealStudentPassword('staff:'+target.id,hashed,secret,pepper())))}
   await db.batch(statements);return json({ok:true});
  }
  if(path==='support/broadcast'&&method==='POST'){
   if(!isAdmin)fail(403,'التعميم من صلاحيات فريق المنصّة فقط');
   const content=text(body.message,'الرسالة',3000);await throttle('broadcast:'+user.id,20);
   const stamp=now();
   const result=await db.batch([q('INSERT INTO support_messages (mosque_id,sender_id,body,created_at) SELECT id,?,?,? FROM mosques WHERE cancelled_at IS NULL',user.id,'تعميم من إدارة المنصّة\n'+content,stamp),audit(null,'أُرسل تعميم إلى إدارات جميع الجهات')]);
   return json({ok:true,recipients:result[0].meta.changes,created_at:stamp},201);
  }
  if(path==='support/unread'&&method==='GET'){
   if(!['primary','supervisor'].includes(user.role))fail(403,'هذه التنبيهات لإدارة الجهة');
   const unread=await one("SELECT COUNT(*) AS count,MAX(sm.number) AS latest FROM support_messages sm JOIN users u ON u.id=sm.sender_id WHERE sm.mosque_id=? AND sm.created_at>? AND u.role IN ('admin','platform_supervisor') AND sm.number>COALESCE((SELECT last_number FROM support_reads WHERE user_id=? AND mosque_id=?),0)",user.mosque_id,notificationSince(user.created_at),user.id,user.mosque_id);
   return json(unread);
  }
  if(path==='administration/cancel'&&method==='POST'){
   if(!isAdmin)fail(403,'إلغاء الجهات والحسابات من صلاحيات مدير المنصّة فقط');
   const targetId=text(body.id,'العنصر',80),kind=body.kind,action=body.action;
   if(!['account','mosque'].includes(kind)||!['cancel','restore'].includes(action))fail(400,'عملية غير صالحة');
   const stamp=action==='cancel'?now():null;
   if(kind==='account'){
    const target=await one('SELECT * FROM users WHERE id=?',targetId);
    if(!target||target.id===user.id||!['primary','supervisor','teacher',...(isOwner?['platform_supervisor']:[])].includes(target.role))fail(403,'لا يمكنك إلغاء هذا الحساب');
    if(target.mosque_id)await mosqueExists(target.mosque_id);
    await db.batch([q('UPDATE users SET cancelled_at=? WHERE id=?',stamp,targetId),q('DELETE FROM sessions WHERE user_id=?',targetId),audit(target.mosque_id,(stamp?'أُلغي حساب ':'أُعيد حساب ')+target.name)]);
   }else{
    const target=await one('SELECT id,name FROM mosques WHERE id=?',targetId);if(!target)fail(404,'الجهة غير موجودة');
    await db.batch([q('UPDATE mosques SET cancelled_at=? WHERE id=?',stamp,targetId),q('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE mosque_id=?)',targetId),audit(targetId,(stamp?'أُلغيت جهة ':'أُعيدت جهة ')+target!.name)]);
   }
   return json({ok:true});
  }
  if(path==='institution-health'&&method==='GET'){
   if(!isAdmin)fail(403,'هذه المساحة لإدارة المنصّة');
   const mid=scope(params.get('mosque'));await mosqueExists(mid);
   const mosque=await one('SELECT * FROM mosques WHERE id=?',mid);
   const team=await rows("SELECT id,name,english_name,username,role,phone,active,created_at FROM users WHERE mosque_id=? AND cancelled_at IS NULL AND role!='student' ORDER BY created_at",mid);
   const last=await one('SELECT MAX(created_at) AS at FROM activity WHERE mosque_id=?',mid);
   return json({mosque,team,last_activity_at:last?.at||null,checks:{primary_assigned:team.some(t=>t.role==='primary'&&t.active),active_team:team.filter(t=>t.active).length,contact_available:team.some(t=>t.role==='primary'&&t.active&&t.phone)}});
  }
  if(path==='support'||path==='support/messages'||path==='support/seen'){
   if(!['admin','platform_supervisor','primary','supervisor'].includes(user.role))fail(403,'التواصل الإداري متاح لإدارة الجهة وإدارة المنصّة');
   if(path==='support'&&method==='GET'){
    const threads=await rows("SELECT m.id,m.name,m.kind,m.city,(SELECT body FROM support_messages WHERE mosque_id=m.id ORDER BY number DESC LIMIT 1) AS last_message,(SELECT created_at FROM support_messages WHERE mosque_id=m.id ORDER BY number DESC LIMIT 1) AS last_message_at,(SELECT COUNT(*) FROM support_messages sm WHERE sm.mosque_id=m.id AND sm.sender_id!=? AND sm.created_at>? AND sm.number>COALESCE((SELECT last_number FROM support_reads WHERE user_id=? AND mosque_id=m.id),0)) AS unread_count FROM mosques m"+(isAdmin?' WHERE m.cancelled_at IS NULL':' WHERE m.cancelled_at IS NULL AND m.id=?')+' ORDER BY last_message_at DESC,m.created_at',user.id,notificationSince(user.created_at),user.id,...(isAdmin?[]:[user.mosque_id]));
    return json({threads});
   }
   const mid=scope(method==='GET'?params.get('mosque'):body.mosque_id);await mosqueExists(mid);
   if(path==='support/messages'&&method==='GET'){
    const before=params.get('before');if(before&&(!/^\d+$/.test(before)||Number(before)<1))fail(400,'رقم الصفحة غير صالح');
    const messages=await rows("SELECT sm.number,sm.body,sm.created_at,sm.sender_id,u.name AS sender_name,u.role AS sender_role FROM support_messages sm JOIN users u ON u.id=sm.sender_id WHERE sm.mosque_id=?"+(before?' AND sm.number<?':'')+' ORDER BY sm.number DESC LIMIT 101',mid,...(before?[Number(before)]:[]));
    const has_more=messages.length>100;return json({mosque_id:mid,messages:messages.slice(0,100).reverse(),has_more});
   }
   if(path==='support/messages'&&method==='POST'){
    const content=text(body.message,'الرسالة',3000);await throttle('support:'+user.id,60);
    await q('INSERT INTO support_messages (mosque_id,sender_id,body,created_at) VALUES (?,?,?,?)',mid,user.id,content,now()).run();return json({ok:true},201);
   }
   if(path==='support/seen'&&method==='POST'){
    const n=body.number;if(!Number.isSafeInteger(n)||n<0)fail(400,'رقم الرسالة غير صالح');
    if(n&&!await one('SELECT number FROM support_messages WHERE number=? AND mosque_id=?',n,mid))fail(400,'الرسالة غير موجودة في هذه الجهة');
    await q('INSERT INTO support_reads (user_id,mosque_id,last_number) VALUES (?,?,?) ON CONFLICT(user_id,mosque_id) DO UPDATE SET last_number=MAX(support_reads.last_number,excluded.last_number)',user.id,mid,n).run();return json({ok:true});
   }
   fail(404,'المسار غير موجود');
  }
  if(path==='calendar/seen'&&method==='POST'){
   const stamp=Date.now();await q('INSERT INTO community_reads (user_id,seen_at) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET seen_at=excluded.seen_at',user.id,stamp).run();return json({ok:true,seen_at:stamp});
  }
  if(path==='calendar/events'&&['POST','PATCH'].includes(method)){
   if(user.role!=='primary')fail(403,'نشر النشاطات من صلاحيات المشرف الأساسي');
   const mid=scope(body.mosque_id);const mosque=await one('SELECT id,name FROM mosques WHERE id=?',mid);if(!mosque)fail(404,'المسجد أو المركز غير موجود');
   if(method==='PATCH'){
    const existing=await one('SELECT id,source_id FROM calendar_events WHERE id=? AND mosque_id=?',text(body.id,'النشاط',180),mid);
    if(!existing)fail(404,'النشاط غير موجود في جهتك');if(existing.source_id)fail(403,'لا يمكن تعديل هذا النشاط المستورد من هنا');
    if(body.status!=='cancelled')fail(400,'حالة النشاط غير صالحة');
    await db.batch([q("UPDATE calendar_events SET status='cancelled',updated_at=? WHERE id=? AND mosque_id=?",Date.now(),existing.id,mid),audit(mid,'أُلغي نشاط من التقويم المشترك')]);return json({ok:true});
   }
   const title=text(body.title,'عنوان النشاط',250),day=date(body.date),description=text(body.description,'تفاصيل النشاط',2000,false),lecturer=text(body.lecturer,'مقدّم النشاط',150,false),time=text(body.time_label,'موعد النشاط',100,false);
   const kind=body.kind==='lecture'?'lecture':'activity',eid=id(),stamp=Date.now();
   await db.batch([q("INSERT INTO calendar_events (id,source_id,mosque_id,mosque_name,title,description,lecturer,kind,starts_on,ends_on,weekdays,time_label,source_url,status,content_hash,published_at,updated_at) VALUES (?,NULL,?,?,?,?,?,?,?,NULL,'',?,NULL,'active',?,?,?)",eid,mid,mosque.name,title,description,lecturer,kind,day,time,await digest(JSON.stringify({title,day,description,lecturer,time})),stamp,stamp),audit(mid,'نُشر نشاط «'+title+'» في التقويم المشترك')]);return json({ok:true,id:eid},201);
  }
  if((path==='data'||path==='export')&&method==='GET'){
   const mosques=isAdmin?await rows('SELECT * FROM mosques WHERE cancelled_at IS NULL ORDER BY created_at'):await rows('SELECT * FROM mosques WHERE id=?',user.mosque_id);
   const requested=params.get('mosque');
   const mid=isAdmin?(requested?scope(requested):null):scope(requested||user.mosque_id);if(mid)await mosqueExists(mid);
   const day=date(params.get('date')||new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Beirut'}));
   if(isAdmin){
    const accounts=await rows("SELECT u.id,u.name,u.english_name,u.username,u.role,u.phone,u.active,u.mosque_id,u.created_at,m.name AS mosque_name FROM users u LEFT JOIN mosques m ON m.id=u.mosque_id WHERE u.role!='student' AND u.cancelled_at IS NULL AND (u.mosque_id IS NULL OR m.cancelled_at IS NULL) ORDER BY u.created_at,u.id");
    const cancelled_mosques=await rows('SELECT id,name,kind,cancelled_at FROM mosques WHERE cancelled_at IS NOT NULL ORDER BY cancelled_at DESC');
    const cancelled_accounts=await rows("SELECT u.id,u.name,u.role,u.mosque_id,m.name AS mosque_name,u.cancelled_at FROM users u JOIN mosques m ON m.id=u.mosque_id WHERE u.cancelled_at IS NOT NULL AND m.cancelled_at IS NULL AND u.role!='student' ORDER BY u.cancelled_at DESC");
    return json({user,mosques,cancelled_mosques,cancelled_accounts,mosque_id:mid,accounts,circles:[],students:[],attendance:[],progress:[],staff:[],activity:[],date:day});
   }
   if(!mid)fail(400,'اختر المسجد أو المركز');
   if(isStudent){
    const self=await studentAccess(user.student_id||'',mid);
    const own=await one("SELECT s.id,s.name,s.age,s.status,s.nationality,s.quran_level,s.joined_on,s.created_at,s.circle_id,c.name AS circle_name,t.name AS teacher_name,t.phone AS teacher_phone,'SRG-'||n.number AS student_code FROM students s LEFT JOIN circles c ON c.id=s.circle_id LEFT JOIN users t ON t.id=c.teacher_id AND t.active=1 AND t.cancelled_at IS NULL LEFT JOIN student_codes n ON n.student_id=s.id WHERE s.id=?",self.id);
    return json({user,mosques,mosque_id:mid,students:[own],circles:[],staff:[],attendance:[],progress:[],activity:[],date:day});
   }
   const teacherWhere=isTeacher?' AND c.teacher_id=?':'';
   const cargs=isTeacher?[mid,user.id]:[mid];
   const cs=(await rows("SELECT c.*,u.name AS teacher_name FROM circles c LEFT JOIN users u ON c.teacher_id=u.id WHERE c.mosque_id=? AND c.status='active'"+teacherWhere+' ORDER BY c.created_at',...cargs)).map(c=>({...c,start_date:c.start_date||beirutDay(new Date(c.created_at))}));
   await q("UPDATE students SET status='active' WHERE mosque_id=? AND status='graduated'",mid).run();
   // Populate permanent numbers for existing students without changing applied migrations.
   await q('INSERT OR IGNORE INTO student_codes (student_id) SELECT s.id FROM students s WHERE s.mosque_id=? AND NOT EXISTS (SELECT 1 FROM student_codes n WHERE n.student_id=s.id)',mid).run();
   const studentSql=isTeacher?" AND EXISTS (SELECT 1 FROM circles tc WHERE tc.mosque_id=? AND tc.teacher_id=? AND tc.status='active' AND (tc.id=s.circle_id OR EXISTS (SELECT 1 FROM circle_enrollments ce WHERE ce.circle_id=tc.id AND ce.student_id=s.id)))":'';
   const sargs=isTeacher?[mid,mid,user.id]:[mid];
   const memberships=await rows("SELECT ce.circle_id,ce.student_id FROM circle_enrollments ce JOIN circles c ON c.id=ce.circle_id WHERE c.mosque_id=? AND c.status='active'",mid);
   const ss=(await rows("SELECT s.*,c.name AS circle_name,t.name AS teacher_name,t.phone AS teacher_phone,'SRG-'||n.number AS student_code FROM students s LEFT JOIN circles c ON c.id=s.circle_id LEFT JOIN users t ON t.id=c.teacher_id JOIN student_codes n ON n.student_id=s.id WHERE s.mosque_id=? AND s.status!='deleted'"+studentSql+' ORDER BY s.created_at DESC',...sargs)).map(s=>({...s,circle_ids:[...new Set([s.circle_id,...memberships.filter(e=>e.student_id===s.id).map(e=>e.circle_id)].filter(Boolean))],joined_on:s.joined_on||beirutDay(new Date(s.created_at))}));
   const visible=isTeacher?" AND student_id IN (SELECT s.id FROM students s JOIN circles c ON c.id=s.circle_id WHERE s.mosque_id=? AND c.teacher_id=? AND s.status!='deleted' AND c.status='active')":" AND student_id IN (SELECT id FROM students WHERE status!='deleted')";
   const vargs=isTeacher?[mid,mid,user.id]:[mid];
   const all=path==='export';
   const att=await rows('SELECT * FROM attendance WHERE mosque_id=?'+visible+(all?'':' AND day>=date(?,\'-45 days\')'),...vargs,...(all?[]:[day]));
   const circleAttendance=await rows("SELECT cr.session_id||':'||cr.student_id AS id,c.mosque_id,cr.student_id,cs.day,cr.status,cr.updated_by AS created_by,c.id AS circle_id,c.name AS circle_name FROM circle_records cr JOIN circle_sessions cs ON cs.id=cr.session_id JOIN circles c ON c.id=cs.circle_id JOIN students s ON s.id=cr.student_id WHERE c.mosque_id=? AND s.status!='deleted'"+(isTeacher?" AND c.teacher_id=? AND c.status='active'":'')+(all?'':" AND cs.day>=date(?,'-45 days')"),mid,...(isTeacher?[user.id]:[]),...(all?[]:[day]));
   att.push(...circleAttendance);
   const ps=await rows("SELECT p.*,s.name AS student_name,u.name AS teacher_name FROM progress p JOIN students s ON s.id=p.student_id LEFT JOIN users u ON u.id=p.created_by WHERE p.mosque_id=? AND s.status!='deleted'"+(isTeacher?" AND p.student_id IN (SELECT s.id FROM students s JOIN circles c ON c.id=s.circle_id WHERE s.mosque_id=? AND c.teacher_id=? AND c.status='active')":'')+' ORDER BY p.day DESC,p.created_at DESC'+(all?'':' LIMIT 150'),...vargs);
   const staff=await rows("SELECT id,name,english_name,username,role,phone,student_id,active,mosque_id,created_at FROM users WHERE mosque_id=? AND cancelled_at IS NULL AND role!='student' ORDER BY created_at",mid);
   const act:Row[]=[]; // Staff membership and administrative activity are never exposed to institution users.
   return json({user,mosques,mosque_id:mid,circles:cs,students:ss,attendance:att,progress:ps,staff,activity:act,date:day,exported_at:all?now():undefined});
  }
  if(path==='auth/password'&&method==='POST'){
   const old=loginPassword(body.current_password),next=password(body.new_password);
   const existing=await one('SELECT password_hash,student_id FROM users WHERE id=?',user.id);
   await throttle('password:'+user.id,10);
   if(!await verifyPassword(old,existing!.password_hash,pepper()))fail(400,'كلمة السر الحالية غير صحيحة');
   const nextHash=await hashPassword(next,pepper());
   const recovery=existing?.student_id?await sealStudentPassword(existing.student_id,nextHash,next,pepper()):null;
   await db.batch([q('UPDATE users SET password_hash=? WHERE id=?',nextHash,user.id),...(!existing?.student_id&&['primary','supervisor','teacher','platform_supervisor'].includes(user.role)?[q('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','staff-credential:'+user.id,await sealStudentPassword('staff:'+user.id,nextHash,next,pepper()))]:[]),...(recovery?[q('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','student-credential:'+existing!.student_id,recovery)]:[]),q('DELETE FROM sessions WHERE user_id=?',user.id)]);
   const t=await newSession(user.id);return json({ok:true},200,{'Set-Cookie':sessionCookie(req,t,issuedSessionAge)});
  }
  if(path==='mosques'&&method==='POST'){
   if(!isAdmin)fail(403,'إضافة المساجد والمراكز متاحة لمدير المنصّة');
   const mid=id(),name=text(body.name,'اسم المسجد أو المركز'),city=text(body.city,'المدينة',100,false),kind=entityKind(body.kind??'mosque');
   await db.batch([q('INSERT INTO mosques (id,name,kind,city,created_at) VALUES (?,?,?,?,?)',mid,name,kind,city,now()),audit(mid,'أُضيف '+name)]);return json({ok:true,id:mid},201);
  }
  if(path==='mosques'&&method==='PATCH'){
   if(!manager)fail(403,'تعديل بيانات الجهة متاح للمشرف الأساسي');const mid=scope(body.id);await mosqueExists(mid);
   const name=text(body.name,'اسم المسجد أو المركز'),city=text(body.city,'المدينة',100,false),kind=entityKind(body.kind??(await one('SELECT kind FROM mosques WHERE id=?',mid))!.kind);
   const logo=body.logo==null?null:text(body.logo,'الشعار',350000,false);
   if(logo&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo))fail(400,'الشعار يجب أن يكون صورة PNG أو JPG أو WebP');
   await db.batch([q('UPDATE mosques SET name=?,kind=?,city=?,logo=? WHERE id=?',name,kind,city,logo,mid),audit(mid,'حُدّثت إعدادات المسجد أو المركز')]);return json({ok:true});
  }
  if(path==='users'&&['POST','PATCH'].includes(method)){
   if(!manager)fail(403,'إدارة الحسابات متاحة للمشرف الأساسي ومدير المنصّة');
   const mid=scope(body.mosque_id);await mosqueExists(mid);
   const role=text(body.role,'الصلاحية',30);
   if(!['primary','supervisor','teacher'].includes(role))fail(403,'لا يمكنك منح هذه الصلاحية');
   const name=text(body.name,'الاسم');
   const automatic=method==='POST'&&(body.auto_credentials===true||!body.username||!body.password);
   let login=automatic?'':username(body.username);
   if(/^srg-\d+$/.test(login))fail(400,'هذه الصيغة محجوزة لأكواد الطلاب');
   const phone=text(body.phone,'رقم الهاتف',60,automatic);
   if(method==='POST'){
    const englishName=text(body.english_name,'الاسم بالإنجليزي',120,automatic);
    if(englishName&&!/^[A-Za-z][A-Za-z .'-]{1,119}$/.test(englishName))fail(400,'اكتب الاسم بالإنجليزي');
    const secret=automatic?readablePassword():password(body.password);
    if(automatic){
     const base='edu.'+englishName.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'').slice(0,25).replace(/\.$/,'');
     for(let attempt=0;attempt<100;attempt++){login=base+(attempt?String(attempt+1):'');if(!await one('SELECT id FROM users WHERE username=?',login))break;login='';}
     if(!login)fail(503,'تعذّر توليد اسم الدخول، حاول مجددًا');
    }
    const uid=id(),hashed=await hashPassword(secret,pepper());
    await db.batch([q('INSERT INTO users (id,mosque_id,name,english_name,username,password_hash,role,phone,active,created_at) VALUES (?,?,?,?,?,?,?,?,1,?)',uid,mid,name,englishName,login,hashed,role,phone,now()),q('INSERT INTO settings (key,value) VALUES (?,?)','staff-credential:'+uid,await sealStudentPassword('staff:'+uid,hashed,secret,pepper())),audit(mid,'أُضيف حساب '+name)]);
    return json({ok:true,id:uid,...(automatic?{credentials:{username:login,password:secret}}:{})},201);
   }
   const target=await one('SELECT * FROM users WHERE id=? AND mosque_id=? AND cancelled_at IS NULL',text(body.id,'الحساب',80),mid);
   if(!target||['admin','platform_supervisor','student'].includes(target.role))fail(403,'لا يمكنك تعديل هذا الحساب');
   if(target.id===user.id)fail(400,'يمكن تغيير كلمة سرك من إعدادات حسابك');
   const active=body.active===0?0:1;
   const englishName=body.english_name==null?target.english_name||'':text(body.english_name,'الاسم بالإنجليزي',120,false);
   if(englishName&&!/^[A-Za-z][A-Za-z .'-]{1,119}$/.test(englishName))fail(400,'اكتب الاسم بالإنجليزي');
   const statements=[q('UPDATE users SET name=?,english_name=?,username=?,role=?,phone=?,active=? WHERE id=?',name,englishName,login,role,phone,active,target.id)];
   if(body.password){const secret=password(body.password),hashed=await hashPassword(secret,pepper());statements.push(q('UPDATE users SET password_hash=? WHERE id=?',hashed,target.id),q('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','staff-credential:'+target.id,await sealStudentPassword('staff:'+target.id,hashed,secret,pepper())))}
   statements.push(q('DELETE FROM sessions WHERE user_id=?',target.id),audit(mid,'حُدّث حساب '+name));
   await db.batch(statements);return json({ok:true});
  }
  if(['circle-session','circle-enrollments','circle-schedule'].includes(path))return await circleSession({db,user,body,params,method,path,scope,circleAccess,mosqueExists,text,date,fail,json});
  if(path==='circles'&&['POST','PATCH'].includes(method)){
   if(!manager)fail(403,'إدارة الحلقات وتعيين مدرّسيها من صلاحيات المشرف الأساسي');
   const mid=scope(body.mosque_id);await mosqueExists(mid);
   if(method==='PATCH'&&body.status==='cancelled'){
    const existing=await circleAccess(text(body.id,'الحلقة',80),mid);
    await db.batch([q("UPDATE circles SET status='cancelled' WHERE id=? AND mosque_id=?",existing.id,mid),q("UPDATE students SET circle_id=NULL WHERE circle_id=? AND mosque_id=? AND status!='deleted'",existing.id,mid),audit(mid,'أُلغيت حلقة '+existing.name)]);return json({ok:true});
   }
   const teacher=body.teacher_id?text(body.teacher_id,'المدرّس',80):null;
   if(teacher&&!await one("SELECT id FROM users WHERE id=? AND mosque_id=? AND active=1 AND cancelled_at IS NULL AND role IN ('teacher','supervisor','primary')",teacher,mid))fail(400,'اختر مدرّسًا فعّالًا من الجهة نفسها');
   const name=text(body.name,'اسم الحلقة'),level=text(body.level,'المستوى',100,false),schedule=text(body.schedule,'الموعد',150,false),cid=method==='POST'?id():text(body.id,'الحلقة',80);
   if(method==='PATCH')await circleAccess(cid,mid);
   const statement=method==='POST'?q("INSERT INTO circles (id,mosque_id,name,teacher_id,level,schedule,status,start_date,created_at) VALUES (?,?,?,?,?,?,'active',?,?)",cid,mid,name,teacher,level,schedule,beirutDay(),now()):q('UPDATE circles SET name=?,teacher_id=?,level=?,schedule=? WHERE id=? AND mosque_id=?',name,teacher,level,schedule,cid,mid);
   await db.batch([statement,audit(mid,(method==='POST'?'أُنشئت حلقة ':'حُدّثت حلقة ')+name)]);return json({ok:true,id:cid},method==='POST'?201:200);
  }
  if(path==='students'&&['POST','PATCH'].includes(method)){
   const mid=scope(body.mosque_id);await mosqueExists(mid);
   if(method==='PATCH'&&body.status==='deleted'){
    if(!manager)fail(403,'إزالة ملفات الطلاب من صلاحيات المشرف الأساسي');
    const existing=await studentAccess(text(body.id,'الطالب',80),mid);
    await db.batch([q("UPDATE students SET status='deleted',circle_id=NULL WHERE id=? AND mosque_id=?",existing.id,mid),q("UPDATE users SET active=0 WHERE student_id=?",existing.id),q("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE student_id=?)",existing.id),audit(mid,'أُزيل ملف الطالب '+existing.name)]);return json({ok:true});
   }
   if(method==='POST'&&isTeacher)fail(403,'إضافة الطلاب وتوزيعهم تتم عبر إدارة المسجد أو المركز');
   const cid=body.circle_id?text(body.circle_id,'الحلقة',80):null;
   const sid=method==='POST'?id():text(body.id,'الطالب',80);
   const existing=method==='PATCH'?await studentAccess(sid,mid):null;
   if(cid&&(!isTeacher||cid!==existing?.circle_id))await circleAccess(cid,mid);
   if(!manager&&cid!==(existing?.circle_id||null))fail(403,'توزيع الطلاب على الحلقات والمدرّسين من صلاحيات المشرف الأساسي');
   const name=text(body.name,'اسم الطالب'),contact=text(body.contact,'رقم التواصل',60,false),notes=text(body.notes,'الملاحظات',2000,false);
   const age=body.age==null||body.age===''?null:Number(body.age);if(age!==null&&(!Number.isInteger(age)||age<3||age>100))fail(400,'العمر يجب أن يكون بين 3 و100');
   const status=body.status||existing?.status||'active';if(!['active','inactive'].includes(status))fail(400,'حالة الطالب غير صالحة');
   const englishName=body.english_name==null?(existing?.english_name||''):text(body.english_name,'اسم الطالب بالإنجليزي',120);
   if(englishName&&!/^[A-Za-z][A-Za-z .'-]{1,119}$/.test(englishName))fail(400,'اكتب اسم الطالب بالإنجليزي');
   if(method==='POST'&&!englishName)fail(400,'أضف اسم الطالب بالإنجليزي لإنشاء حسابه');
   const nationality=body.nationality==null?(existing?.nationality||''):text(body.nationality,'الجنسية',80,false);
   const quranLevel=body.quran_level==null?(existing?.quran_level||''):text(body.quran_level,'مستوى الطالب بالقرآن',120,false);
   const joined=body.joined_on?date(body.joined_on):(existing?.joined_on|| (existing?beirutDay(new Date(existing.created_at)):beirutDay()));
   const contactMode=body.contact_mode??existing?.contact_mode??'parent';if(!['parent','student'].includes(contactMode))fail(400,'اختر جهة التواصل');
   const statement=method==='POST'?q('INSERT INTO students (id,mosque_id,circle_id,name,age,contact,notes,status,english_name,nationality,quran_level,joined_on,contact_mode,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',sid,mid,cid,name,age,contact,notes,status,englishName,nationality,quranLevel,joined,contactMode,now()):q('UPDATE students SET circle_id=?,name=?,age=?,contact=?,notes=?,status=?,english_name=?,nationality=?,quran_level=?,joined_on=?,contact_mode=? WHERE id=? AND mosque_id=?',cid,name,age,contact,notes,status,englishName,nationality,quranLevel,joined,contactMode,sid,mid);
   let credentials:Row|undefined;
   if(method==='POST'){
    // Hash before mutation. Student code allocation, profile and account commit atomically.
    const secret=studentPassword(englishName),hashed=await hashPassword(secret,pepper()),uid=id(),vault=await sealStudentPassword(sid,hashed,secret,pepper());
    await db.batch([statement,q('INSERT INTO settings (key,value) VALUES (?,?)','student-credential:'+sid,vault),q('INSERT INTO student_codes (student_id) VALUES (?)',sid),q("INSERT INTO users (id,mosque_id,name,username,password_hash,role,student_id,active,created_at) SELECT ?,?,?,lower('SRG-'||number),?,'student',?,?,? FROM student_codes WHERE student_id=?",uid,mid,name,hashed,sid,status==='active'?1:0,now(),sid),audit(mid,'انضم الطالب '+name)]);
    const code=await one('SELECT username FROM users WHERE id=?',uid);credentials={username:code!.username.toUpperCase(),password:secret};
   }else{
    await db.batch([statement,q("UPDATE users SET name=?,active=? WHERE student_id=?",name,status==='active'?1:0,sid),...(status==='inactive'?[q('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE student_id=?)',sid)]:[]),audit(mid,'حُدّث ملف الطالب '+name)]);
   }
   return json({ok:true,id:sid,credentials},method==='POST'?201:200);
  }
  if(path==='student-account'&&method==='POST'){
   if(isAdmin||!['primary','supervisor','teacher'].includes(user.role))fail(403,'بيانات دخول الطالب من صلاحيات فريق تعليم الجهة');
   if(body.action!=='reveal'&&!manager)fail(403,'تجديد بيانات الطالب من صلاحيات المشرف الأساسي');
   const mid=scope(body.mosque_id),sid=text(body.student_id,'الطالب',80),student=await studentAccess(sid,mid);
   if(body.action==='reveal'){
    await throttle('student-recovery:'+user.id,30);
    const account=await one("SELECT username,password_hash FROM users WHERE student_id=? AND role='student'",sid),saved=await one('SELECT value FROM settings WHERE key=?','student-credential:'+sid);
    if(!account||!saved)fail(409,'هذا الحساب قديم؛ جدّد كلمة السر مرة واحدة لتفعيل الاسترجاع المحمي');
    let secret='';try{secret=await openStudentPassword(sid,account!.password_hash,saved!.value,pepper())}catch{fail(409,'تغيّرت بيانات الحساب أو تعذّر فك الحفظ؛ جدّد كلمة السر')}
    await audit(mid,'استُرجعت بيانات دخول الطالب '+student.name).run();
    return json({ok:true,credentials:{username:account!.username.toUpperCase(),password:secret}});
   }
   const englishName=body.english_name?text(body.english_name,'الاسم بالإنجليزي',120):student.english_name;
   if(!englishName||!/^[A-Za-z][A-Za-z .'-]{1,119}$/.test(englishName))fail(400,'أضف اسم الطالب بالإنجليزي أولًا');
   const secret=studentPassword(englishName),hashed=await hashPassword(secret,pepper()),vault=await sealStudentPassword(sid,hashed,secret,pepper());
   await q('INSERT OR IGNORE INTO student_codes (student_id) VALUES (?)',sid).run();
   const n=await one('SELECT number FROM student_codes WHERE student_id=?',sid),login='srg-'+String(n!.number);
   const target=await one('SELECT id FROM users WHERE student_id=?',sid);
   const change=target?q('UPDATE users SET username=?,password_hash=?,active=? WHERE id=?',login,hashed,student.status==='active'?1:0,target.id):q("INSERT INTO users (id,mosque_id,name,username,password_hash,role,student_id,active,created_at) VALUES (?,?,?,?,?,'student',?,?,?)",id(),mid,student.name,login,hashed,sid,student.status==='active'?1:0,now());
   await db.batch([change,q('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','student-credential:'+sid,vault),q('UPDATE students SET english_name=? WHERE id=?',englishName,sid),q('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE student_id=?)',sid),audit(mid,'جُدّدت بيانات دخول الطالب '+student.name)]);
   return json({ok:true,credentials:{username:login.toUpperCase(),password:secret}});
  }
  if(path==='platform-achievements'&&['GET','POST'].includes(method)){
   if(!isAdmin)fail(403,'إنجازات التهنئة خاصة بفريق المنصّة');
   if(method==='POST'){
    if(!Number.isSafeInteger(body.number)||body.number<1)fail(400,'التنبيه غير صالح');
    const changed=await q('UPDATE platform_achievements SET seen_by=?,seen_at=? WHERE number=? AND seen_at IS NULL',user.id,now(),body.number).run();
    return json({ok:true,changed:changed.meta.changes});
   }
   const before=params.get('before');if(before&&!/^[1-9]\d*$/.test(before))fail(400,'صفحة غير صالحة');
   const count=await one("SELECT COUNT(*) AS count FROM platform_achievements a JOIN students s ON s.id=a.student_id JOIN mosques m ON m.id=s.mosque_id WHERE a.seen_at IS NULL AND a.created_at>? AND s.status!='deleted' AND m.cancelled_at IS NULL",notificationSince(user.created_at));
   if(params.get('summary')==='1')return json({unread_count:count?.count||0});
   const items=await rows("SELECT a.*,c.name AS encounter_circle_name,s.name AS student_name,m.name AS mosque_name,u.name AS reviewed_by,(SELECT COALESCE(SUM(points),0) FROM motivational_scores WHERE student_id=a.student_id) AS current_points,ms.conduct AS current_conduct,(ms.attendance+ms.quran+ms.religion+ms.conduct+ms.activity) AS current_score FROM platform_achievements a JOIN students s ON s.id=a.student_id JOIN mosques m ON m.id=s.mosque_id LEFT JOIN users u ON u.id=a.seen_by LEFT JOIN circles c ON a.meeting='circle:'||c.id LEFT JOIN motivational_scores ms ON ms.student_id=a.student_id AND ms.day=a.day AND ms.meeting=a.meeting WHERE s.status!='deleted' AND m.cancelled_at IS NULL AND a.created_at>?"+(before?' AND a.number<?':'')+' ORDER BY a.number DESC LIMIT 51',notificationSince(user.created_at),...(before?[Number(before)]:[]));
   return json({items:items.slice(0,50).map(a=>({...a,meeting:a.encounter_circle_name?'لقاء '+a.encounter_circle_name:a.meeting,eligible:Number(a.current_points)>=a.rank*35&&Number(a.current_conduct)>=4&&Number(a.current_score)>=20,marks:JSON.parse(a.marks),rank:rankFor(a.rank*35)})),has_more:items.length>50,unread_count:count?.count||0});
  }
  if(path==='leaderboards'&&method==='GET'){
   const period=params.get('period')||'all',currentDay=beirutDay();let start='0001-01-01',end=currentDay;
   if(!['all','week','fortnight','month'].includes(period))fail(400,'الفترة غير صالحة');
   if(period==='week'||period==='fortnight'){const from=new Date(currentDay+'T12:00:00Z');from.setUTCDate(from.getUTCDate()-(period==='fortnight'?13:(from.getUTCDay()+6)%7));start=from.toISOString().slice(0,10);}
   if(period==='month'){const month=params.get('month')||currentDay.slice(0,7);start=date(month+'-01');const last=new Date(start+'T12:00:00Z');last.setUTCMonth(last.getUTCMonth()+1);last.setUTCDate(0);end=last.toISOString().slice(0,10);}
   const leaders=await rows("SELECT s.id,s.name,s.mosque_id,c.name AS circle_name,m.name AS mosque_name,COALESCE(SUM(ms.points),0) AS total_points,COALESCE(SUM(CASE WHEN ms.day>=? AND ms.day<=? THEN ms.points ELSE 0 END),0) AS points FROM students s JOIN mosques m ON m.id=s.mosque_id LEFT JOIN circles c ON c.id=s.circle_id LEFT JOIN motivational_scores ms ON ms.student_id=s.id WHERE s.status='active' AND m.cancelled_at IS NULL GROUP BY s.id,c.name,m.name ORDER BY points DESC,s.name,s.id",start,end);
   const institutions=await rows('SELECT id,name FROM mosques WHERE cancelled_at IS NULL ORDER BY name,id');
   const ranked:Row[]=leaders.map(a=>({...a,rank:rankFor(Number(a.total_points))}));
   const institutionsRanked=institutions.map(m=>{const students=ranked.filter(a=>a.mosque_id===m.id);const top=students.filter(a=>a.points>0).slice(0,3);return {...m,points:top.reduce((n,a)=>n+Number(a.points),0),top,students:m.id===user.mosque_id?students:[]}}).sort((a:Row,b:Row)=>b.points-a.points||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
   const rewardRow=user.mosque_id?await one('SELECT value FROM settings WHERE key=?','rank-rewards:'+user.mosque_id):null;
   return json({period,start,end,institutions:institutionsRanked,rewards:rewardRow?JSON.parse(rewardRow.value):Array(7).fill(''),mosque_id:user.mosque_id});
  }
  if(path==='rank-rewards'&&method==='POST'){
   if(user.role!=='primary')fail(403,'تحديد المكافآت من صلاحيات المشرف الأساسي');
   const mid=scope(body.mosque_id);await mosqueExists(mid);
   if(!Array.isArray(body.rewards)||body.rewards.length!==7)fail(400,'حدّد مكافآت الرتب السبع');
   const rewards=body.rewards.map((v:unknown)=>text(v,'المكافأة',200,false));
   await db.batch([q('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','rank-rewards:'+mid,JSON.stringify(rewards)),audit(mid,'حُدّثت مكافآت الرتب')]);return json({ok:true});
  }
  if(path==='motivation'&&['GET','POST'].includes(method)){
   const mid=scope(method==='GET'?params.get('mosque'):body.mosque_id),sid=text(method==='GET'?params.get('student_id'):body.student_id,'الطالب',80);await studentAccess(sid,mid);await mosqueExists(mid);
   if(method==='GET'){
    const records:Row[]=(await rows("SELECT ms.*,u.name AS teacher_name,cs.circle_id,c.name AS circle_name,cr.status AS attendance_status FROM motivational_scores ms LEFT JOIN users u ON u.id=ms.updated_by LEFT JOIN circle_sessions cs ON ms.meeting='circle:'||cs.circle_id AND ms.day=cs.day LEFT JOIN circle_records cr ON cr.session_id=cs.id AND cr.student_id=ms.student_id LEFT JOIN circles c ON c.id=cs.circle_id WHERE ms.student_id=? ORDER BY ms.day DESC,ms.meeting",sid)).map(r=>({...r,meeting:r.circle_name?'لقاء '+r.circle_name:r.meeting}));
    const points=records.reduce((n,r)=>n+Number(r.points),0);return json({records,points,rank:rankFor(points),student:await one('SELECT id,name FROM students WHERE id=?',sid),mosque:await one('SELECT name,logo FROM mosques WHERE id=?',mid)});
   }
   fail(400,'سجّل التقييم من لقاء الحلقة في قسم حلقاتي؛ ملف الطالب يعرض سجله فقط');
  }
  if(path==='student-profile'&&method==='GET'){
   const mid=scope(params.get('mosque')||user.mosque_id),sid=text(params.get('student_id'),'الطالب',80);await studentAccess(sid,mid);
   const memory=await rows('SELECT surah,ranges,revision,updated_at FROM memorization WHERE student_id=? ORDER BY surah',sid);
   const evaluations=await rows('SELECT a.*,u.name AS teacher_name FROM assessments a LEFT JOIN users u ON u.id=a.created_by WHERE a.student_id=? ORDER BY a.day DESC,a.created_at DESC',sid);
   return json({memory:memory.map(m=>({...m,ranges:JSON.parse(m.ranges)})),assessments:evaluations});
  }
  if(path==='memorization'&&method==='POST'){
   const mid=scope(body.mosque_id),sid=text(body.student_id,'الطالب',80);await studentAccess(sid,mid);
   const surah=Number(body.surah),meta=SURAHS.find(s=>s.id===surah);if(!meta)fail(400,'السورة غير صالحة');
   let ranges;try{ranges=normalizeRanges(body.ranges,meta!.count)}catch(e){fail(400,(e as Error).message)}
   const revision=body.revision;if(!Number.isInteger(revision)||revision<0)fail(400,'نسخة الحفظ غير صالحة');
   await q("INSERT OR IGNORE INTO memorization (student_id,surah,ranges,revision,updated_by,updated_at) VALUES (?,?,'[]',0,?,?)",sid,surah,user.id,now()).run();
   const result=await q('UPDATE memorization SET ranges=?,revision=revision+1,updated_by=?,updated_at=? WHERE student_id=? AND surah=? AND revision=?',JSON.stringify(ranges),user.id,now(),sid,surah,revision).run();
   if(!result.meta.changes)fail(409,'تغيّر الحفظ من مستخدم آخر. حدّث الملف وحاول مجددًا');
   await audit(mid,'حُدّث حفظ سورة '+meta!.name).run();return json({ok:true,revision:revision+1});
  }
  if(path==='assessments'&&method==='POST'){
   const mid=scope(body.mosque_id),sid=text(body.student_id,'الطالب',80);await studentAccess(sid,mid);
   const surah=Number(body.surah);if(!SURAHS.some(s=>s.id===surah))fail(400,'اختر سورة للتقييم');
   const scoreKeys=['memorization','retention','tajweed','performance'];if(['maximum',...scoreKeys].some(k=>body[k]==null||body[k]===''))fail(400,'أدخل العلامات الأربع والحد الأعلى');
   const maximum=Number(body.maximum),scores=scoreKeys.map(k=>Number(body[k]));
   if(!Number.isInteger(maximum)||maximum<1||maximum>100||scores.some(n=>!Number.isInteger(n)||n<0||n>maximum))fail(400,'العلامات أعداد صحيحة بين صفر والحد الأعلى (١ إلى ١٠٠)');
   await db.batch([q('INSERT INTO assessments (id,student_id,day,surah,memorization,retention,tajweed,performance,maximum,notes,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',id(),sid,date(body.date),surah,...scores,maximum,text(body.notes,'ملاحظات التقييم',2000,false),user.id,now()),audit(mid,'سُجّل تقييم أداء الطالب')]);return json({ok:true},201);
  }

  if(path==='attendance'&&method==='POST'){
   const mid=scope(body.mosque_id),day=date(body.date);await mosqueExists(mid);
   if(!Array.isArray(body.records)||!body.records.length||body.records.length>250)fail(400,'اختر من 1 إلى 250 طالبًا');
   const statements=[];const seen=new Set<string>();
   for(const r of body.records){const sid=text(r.student_id,'الطالب',80);if(seen.has(sid))fail(400,'الطالب مكرر');seen.add(sid);await studentAccess(sid,mid);if(!['present','absent','late','excused'].includes(r.status))fail(400,'حالة حضور غير صالحة');statements.push(q('INSERT INTO attendance (id,mosque_id,student_id,day,status,created_by) VALUES (?,?,?,?,?,?) ON CONFLICT(student_id,day) DO UPDATE SET status=excluded.status,created_by=excluded.created_by',id(),mid,sid,day,r.status,user.id));}
   statements.push(audit(mid,'سُجّل حضور '+body.records.length+' طالبًا ليوم '+day));await db.batch(statements);return json({ok:true});
  }
  if(path==='progress'&&method==='POST'){
   const mid=scope(body.mosque_id),sid=text(body.student_id,'الطالب',80);const student=await studentAccess(sid,mid);
   const kind=text(body.kind,'نوع المتابعة',20);if(!['حفظ','مراجعة','درس'].includes(kind))fail(400,'نوع المتابعة غير صالح');
   const topic=text(body.topic,'موضوع المتابعة',250),score=Number(body.score);if(!Number.isInteger(score)||score<1||score>5)fail(400,'التقييم بين 1 و5');
   await db.batch([q('INSERT INTO progress (id,mosque_id,student_id,day,kind,topic,score,notes,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',id(),mid,sid,date(body.date),kind,topic,score,text(body.notes,'الملاحظات',2000,false),user.id,now()),audit(mid,'سُجّلت متابعة '+kind+' للطالب '+student.name)]);return json({ok:true},201);
  }
  fail(404,'المسار المطلوب غير موجود');
 }catch(e){
  if(e instanceof APIError)return json({error:e.message},e.status);
  const message=e instanceof Error?e.message:'';
  if(message.includes('UNIQUE constraint')||(e as {code?:string})?.code==='23505')return json({error:'هذا الاسم أو السجل مستخدم مسبقًا. حدّث الصفحة وحاول مجددًا.'},409);
  console.error('Siraj request failed',message.replace(/data:image[^ ]+/g,'[image]'));
  return json({error:'تعذّر إتمام العملية. حاول مجددًا.'},500);
 }
}
