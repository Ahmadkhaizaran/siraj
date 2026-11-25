type Attendance={day:string;circle_name:string;status:string};
type Comparison={series:string;count:number;latest:number;change:number|null};
type Student={id:string;name:string;status:string;code?:string;joined_on?:string;circles:string[];counts:{present:number;late:number;absent:number;excused:number};attendance_rate:number|null;comparisons:Comparison[];verses:number;history:Attendance[]};
type Login={created_at:string;name:string;role:string;student_id:string|null};
type Report={institution:{name:string;city?:string};start:string;end:string;circles:{name:string;teacher?:string;schedule?:string}[];logins:Login[];learning:boolean;students:Student[]};
const digits=new Intl.NumberFormat('ar-LB',{maximumFractionDigits:1});
const dateTime=new Intl.DateTimeFormat('ar-LB',{timeZone:'Asia/Beirut',dateStyle:'short',timeStyle:'short'});
const roles:Record<string,string>={primary:'مشرف أساسي',supervisor:'مشرف',teacher:'مدرّس',student:'طالب'};
const statuses:Record<string,string>={present:'حاضر',late:'متأخر',absent:'غائب',excused:'بعذر'};
const percentage=(value:number|null)=>value===null?'غير محسوبة':digits.format(value)+'٪';
const width=1190,height=1684,margin=100;

function createPdf(images:Uint8Array[]){
 const encoder=new TextEncoder();
 const chunks:Uint8Array[]=[];
 const offsets:number[]=[0];let size=0;
 function append(input:string|Uint8Array){const bytes=typeof input==='string'?encoder.encode(input):input;chunks.push(bytes);size+=bytes.length;}
 function object(id:number,body:string,stream?:Uint8Array){
  offsets[id]=size;append(id+' 0 obj\n'+body);
  if(stream){append('\nstream\n');append(stream);append('\nendstream');}
  append('\nendobj\n');
 }
 append('%PDF-1.4\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Count '+images.length+' /Kids ['+images.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>');
 images.forEach((image,i)=>{
  const id=3+i*3;
  object(id,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /PageImage '+(id+1)+' 0 R >> >> /Contents '+(id+2)+' 0 R >>');
  object(id+1,'<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+image.length+' >>',image);
  const stream=encoder.encode('q 595 0 0 842 0 0 cm /PageImage Do Q');
  object(id+2,'<< /Length '+stream.length+' >>',stream);
 });
 const xref=size;
 append('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');
 for(const offset of offsets.slice(1))append(String(offset).padStart(10,'0')+' 00000 n \n');
 append('trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return new Blob(chunks.map(chunk=>new Uint8Array(chunk)),{type:'application/pdf'});
}
export async function downloadInstitutionReport(report:Report){
 await Promise.all([document.fonts.load('400 28px "Noto Sans Arabic"'),document.fonts.load('700 42px "Noto Sans Arabic"')]);
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');
 if(!context)throw Error('تعذّر تجهيز ملف PDF على هذا الجهاز.');
 const ctx=context;
 const images:Uint8Array[]=[];let y=0;
 function draw(text:string,size:number,bold=false,color='#243e35',x=width-margin){
  ctx.direction='rtl';ctx.textAlign='right';ctx.textBaseline='top';ctx.fillStyle=color;
  ctx.font=(bold?'700':'400')+' '+size+'px "Noto Sans Arabic", Arial, sans-serif';
  ctx.fillText(text,x,y,width-2*margin);
 }
 function flush(){
  y=height-78;draw('سراج   ·   صفحة '+digits.format(images.length+1),22,false,'#596c62');
  const data=canvas.toDataURL('image/jpeg',.90).split(',')[1];
  images.push(Uint8Array.from(atob(data),c=>c.charCodeAt(0)));
 }
 function startPage(){
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#174e42';ctx.fillRect(0,0,width,16);
  y=65;draw(report.institution.name,33,true,'#174e42');y=126;
 }
 function room(space:number){if(y+space>height-130){flush();startPage();}}
 function line(value:string,size=28,bold=false,color='#243e35'){
  const step=Math.ceil(size*1.65);
  ctx.font=(bold?'700':'400')+' '+size+'px "Noto Sans Arabic", Arial, sans-serif';
  const lines:string[]=[];
  for(const paragraph of value.split('\n')){
   let text='';
   for(const word of paragraph.trim().split(/\s+/)){
    const candidate=text?text+' '+word:word;
    if(text&&ctx.measureText(candidate).width>width-2*margin){lines.push(text);text=word}else text=candidate;
   }
   lines.push(text);
  }
  for(const text of lines){room(step);draw(text,size,bold,color);y+=step;}
 }
 function heading(value:string){room(142);y+=22;line(value,36,true,'#174e42');y+=8;}
 const {students,logins}=report;
 const active=students.filter(s=>s.status==='active').length;
 const regular=students.reduce((sum,s)=>sum+s.counts.present+s.counts.late,0);
 const records=students.reduce((sum,s)=>sum+s.history.length,0);
 const loginSummary=new Map<string,{count:number;last:string}>();
 for(const login of logins){
  if(!login.student_id)continue;
  const prior=loginSummary.get(login.student_id);
  loginSummary.set(login.student_id,{count:(prior?.count??0)+1,last:prior?.last??login.created_at});
 }
 startPage();
 line('التقرير الإداري والتعليمي',48,true,'#174e42');
 if(report.institution.city)line(report.institution.city);
 line('الفترة من '+report.start+' إلى '+report.end);
 line('للاستخدام الإداري الداخلي',23,false,'#596c62');
 heading('ملخّص الجهة');
 line('الطلاب: '+digits.format(students.length)+'   ·   منتظمون: '+digits.format(active)+'   ·   متوقفون: '+digits.format(students.length-active));
 line('الحلقات الفعّالة: '+digits.format(report.circles.length)+'   ·   سجلات الحضور: '+digits.format(records)+'   ·   نسبة الحضور: '+percentage(records?regular/records*100:null));
 line('عمليات الدخول الناجحة المسجّلة: '+digits.format(logins.length));
 heading('الحلقات الفعّالة');
 if(!report.circles.length)line('لا توجد حلقات فعّالة.');
 for(const circle of report.circles)line([circle.name,circle.teacher,circle.schedule].filter(Boolean).join(' · '));
 heading('ملخّصات الطلاب');
 if(!students.length)line('لا يوجد طلاب مسجّلون.');
 for(const student of students){
  room(270);heading(student.name+' · '+(student.status==='active'?'منتظم':'متوقف'));
  line([student.code,student.joined_on?'تاريخ الانضمام: '+student.joined_on:'',student.circles.length?'الحلقات: '+student.circles.join('، '):''].filter(Boolean).join(' · ')||'الحلقات: غير مسند');
  const counts=student.counts;
  line('الحضور: '+percentage(student.attendance_rate)+' · '+digits.format(counts.present)+' حاضر · '+digits.format(counts.late)+' متأخر · '+digits.format(counts.absent)+' غائب · '+digits.format(counts.excused)+' بعذر');
  if(report.learning){
   line('الحفظ المسجّل: '+digits.format(student.verses)+' آية');
   if(!student.comparisons.length)line('لا توجد تقييمات مسجّلة ضمن الفترة.',24);
   for(const item of student.comparisons)line(item.series+' · آخر تقييم '+percentage(item.latest)+' · '+digits.format(item.count)+' سجل'+(item.change===null?'':' · التغيّر '+digits.format(item.change)+' نقطة مئوية'),24);
  }
  const usage=loginSummary.get(student.id);
  line(usage?'الدخول المسجّل: '+digits.format(usage.count)+' · آخر دخول: '+dateTime.format(new Date(usage.last)):'لا توجد عملية دخول مسجّلة ضمن الفترة.',24);
  if(student.history.length){
   line('سجل الحضور ضمن الفترة',25,true);
   for(const item of student.history)line([item.day,item.circle_name,statuses[item.status]||item.status].filter(Boolean).join(' · '),24);
  }
 }
 heading('سجل تسجيل الدخول');
 line('يشمل عمليات الدخول الناجحة منذ تفعيل التسجيل، ضمن الفترة المحدّدة.',24,false,'#596c62');
 if(!logins.length)line('لا توجد عمليات دخول مسجّلة.');
 for(const login of logins)line(dateTime.format(new Date(login.created_at))+' · '+login.name+' · '+(roles[login.role]||login.role),24);
 flush();
 const url=URL.createObjectURL(createPdf(images));
 const link=document.createElement('a');link.href=url;link.download='Siraj-Report-'+report.end+'.pdf';link.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}
