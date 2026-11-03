'use client';
import {useEffect,useState} from 'react';
import {RANKS,MARKS,rankFor} from '../lib/student-ranks';
import {officialMosqueLogo} from '../lib/mosque-branding';
type Row=Record<string,any>;
async function picture(src:string){const img=new Image();img.src=src;await img.decode();return img}
export async function achievementImage(data:Row,index:number):Promise<Blob>{
 await document.fonts.load('700 64px "Noto Sans Arabic"');await document.fonts.load('400 32px "Noto Sans Arabic"');
 const canvas=document.createElement('canvas');canvas.width=4200;canvas.height=2970;const c=canvas.getContext('2d')!;if(!c)throw Error('تعذّر إنشاء الصورة');
 c.scale(2,2);const r=RANKS[index],W=2100,H=1485;
 const theme=['#426b53','#28725e','#2e6893','#72529c','#276e86','#97562e','#927018'][index];
 const wash=c.createLinearGradient(0,0,W,H);wash.addColorStop(0,'#ffffff');wash.addColorStop(1,index===6?'#fcf3d9':'#f2f7f3');c.fillStyle=wash;c.fillRect(0,0,W,H);
 // Siraj's arch is repeated as a quiet watermark, preserving legibility for print.
 const siraj=await picture('/favicon.svg');c.save();c.globalAlpha=.035;c.drawImage(siraj,590,300,920,920);c.restore();
 c.fillStyle='#174e42';c.beginPath();c.moveTo(0,0);c.lineTo(430,0);c.lineTo(0,430);c.fill();c.beginPath();c.moveTo(W,H);c.lineTo(W-430,H);c.lineTo(W,H-430);c.fill();
 c.strokeStyle=index>=5?'#c6a24d':theme;c.lineWidth=index===6?18:10;c.strokeRect(48,48,W-96,H-96);
 if(index>=1){c.strokeStyle='#d7bd7e';c.lineWidth=3;c.strokeRect(72,72,W-144,H-144)}
 if(index>=2){for(let i=0;i<4;i++){c.save();c.translate(i%2?W-100:100,i<2?100:H-100);c.strokeStyle='#d7bd7e';c.lineWidth=4;for(let n=0;n<=index;n++){c.strokeRect(-n*7,-n*7,38+n*14,38+n*14)}c.restore()}}
 c.save();c.translate(W/2,245);
 if(index>=4){c.strokeStyle='#c6a24d';c.lineWidth=3;for(let i=0;i<32;i++){const a=i*Math.PI/16;c.beginPath();c.moveTo(Math.cos(a)*125,Math.sin(a)*125);c.lineTo(Math.cos(a)*(i%2?140:153),Math.sin(a)*(i%2?140:153));c.stroke()}}
 if(index>=5){c.fillStyle=theme;c.beginPath();c.moveTo(-80,40);c.lineTo(-115,185);c.lineTo(-50,150);c.lineTo(0,190);c.lineTo(35,45);c.fill();c.beginPath();c.moveTo(80,40);c.lineTo(115,185);c.lineTo(50,150);c.lineTo(0,190);c.lineTo(-35,45);c.fill()}
 const seal=c.createLinearGradient(-100,-100,100,100);seal.addColorStop(0,index===6?'#ebd494':theme);seal.addColorStop(1,index===6?'#a27c27':'#174e42');c.fillStyle=seal;c.beginPath();const corners=index+6;for(let i=0;i<corners*2;i++){const a=-Math.PI/2+i*Math.PI/corners,rr=i%2?98:112;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();c.fill();c.strokeStyle='#e2c787';c.lineWidth=3;c.stroke();
 c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';
 if(index===6){c.beginPath();c.moveTo(-62,28);c.lineTo(-72,-45);c.lineTo(-30,-10);c.lineTo(0,-65);c.lineTo(30,-10);c.lineTo(72,-45);c.lineTo(62,28);c.closePath();c.fill();c.fillRect(-62,39,124,12)}else{c.font='700 70px "Noto Sans Arabic"';c.fillText(String(index+1),0,4)}c.restore();
 c.direction='rtl';c.textAlign='center';c.textBaseline='middle';
 function text(value:string,y:number,size:number,color='#183c32',weight=700,max=1750){c.font=`${weight} ${size}px "Noto Sans Arabic"`;c.fillStyle=color;c.fillText(value,W/2,y,max)}
 c.drawImage(siraj,W-540,130,240,240);c.fillStyle='#174e42';c.font='700 48px "Noto Sans Arabic"';c.fillText('سِراج',W-420,420);
 const mosqueSrc=data.mosque.logo||officialMosqueLogo(data.mosque.name);if(mosqueSrc){try{const logo=await picture(mosqueSrc);const scale=Math.min(280/logo.width,240/logo.height);c.drawImage(logo,280+(280-logo.width*scale)/2,130+(240-logo.height*scale)/2,logo.width*scale,logo.height*scale)}catch{throw Error('تعذّر تحميل شعار المسجد؛ أعد المحاولة أو حدّث الشعار من الإعدادات')}}
 c.fillStyle='#183c32';c.font='700 30px "Noto Sans Arabic"';c.fillText(data.mosque.name,420,420,400);
 text(index>=5?'شهادة تميّز واجتهاد':'شهادة إنجاز واجتهاد',475,60,r.color);text('نحتفي باجتهاد الطالب',575,32,'#52695f',400);text(data.student.name,685,86);
 text('رتبة '+r.name,795,65,r.color);text('الرصيد التراكمي: '+data.points+' نقطة',875,44);
 const last=data.records[0];if(last){text('آخر تقييم معتمد: '+last.day+' — '+last.meeting,980,29,'#52695f',400);text(MARKS.map(([key,label,max])=>label+' '+last[key]+'/'+max).join('  •  '),1050,29,'#183c32',400,1840);text('نقاط اللقاء: '+last.points+' — تشمل مكافأة الإتقان عند استحقاقها',1120,27,'#52695f',400)}
 text(index===6?'رائد في الاجتهاد، وأمامك آفاق جديدة':'خطوة جديدة في رحلة العلم والمثابرة',1235,37,r.color);
 text('صادرة من سجل التقييم التحفيزي في سِراج · '+new Intl.DateTimeFormat('ar-LB',{timeZone:'Asia/Beirut',dateStyle:'long'}).format(new Date()),1365,25,'#52695f',400);
 return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('تعذّر تصدير الصورة')),'image/png'));
}
export default function AchievementCard({data}:{data:Row}){
 const current=rankFor(data.points),[chosen,setChosen]=useState(current.index),[preview,setPreview]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{setChosen(current.index);setPreview('')},[current.index,data.points]);useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 const logo=data.mosque.logo||officialMosqueLogo(data.mosque.name);
 function download(blob:Blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Siraj-Achievement-'+RANKS[chosen].name+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
 async function perform(action:'preview'|'download'|'share'|'print'){
  // Open synchronously so mobile browsers allow the print window.
  const printWindow=action==='print'?window.open('','_blank'):null;
  setBusy(true);setError('');setNotice('');try{if(action==='print'&&!printWindow)throw Error('اسمح بفتح نافذة الطباعة ثم حاول مجددًا');const blob=await achievementImage(data,chosen);
   if(action==='preview')setPreview(URL.createObjectURL(blob));
   if(action==='download')download(blob);
   if(action==='share'){const file=new File([blob],'Siraj-Achievement.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'إنجازي في سِراج',text:'رتبتي '+RANKS[chosen].name+' — '+data.points+' نقطة'})}catch(e){if((e as Error).name!=='AbortError'){download(blob);setNotice('تم تنزيل الصورة. يمكنك مشاركتها من معرض الصور.')}}}else{download(blob);setNotice('تم تنزيل الصورة. أرفقها برسالة واتساب أو انشرها من معرض الصور.')}}
   if(printWindow){const url=URL.createObjectURL(blob),style=printWindow.document.createElement('style');style.textContent='@page{size:A4 landscape;margin:0}body{margin:0}img{width:100%;display:block}';printWindow.document.head.appendChild(style);const img=printWindow.document.createElement('img');img.src=url;img.alt='بطاقة إنجاز';printWindow.document.body.appendChild(img);await img.decode();printWindow.onafterprint=()=>{URL.revokeObjectURL(url);printWindow.close()};printWindow.print()}
  }catch(e){printWindow?.close();if((e as Error).name!=='AbortError')setError((e as Error).message)}finally{setBusy(false)}
 }
 return <section className="achievement-tools"><h4>شارك إنجازك</h4><p>لكل رتبة تصميمها وألوانها. الصورة تتضمن اسمك، الرتبة، رصيدك، وعلامات آخر لقاء معتمد. المشاركة اختيارية، والطباعة متاحة بنفس التصميم.</p><label className="field"><span>الرتبة التي تريد الاحتفال بها</span><select value={chosen} onChange={e=>{setChosen(Number(e.target.value));setPreview('')}}>{RANKS.slice(0,current.index+1).map((r,i)=><option key={r.name} value={i}>{r.name}</option>)}</select></label>{!logo&&<p>لم يُرفع شعار لهذه الجهة بعد؛ سيظهر اسمها على البطاقة. يستطيع المشرف الأساسي رفع الشعار من إعدادات الجهة.</p>}<div className="heading-actions">{([['preview','معاينة البطاقة'],['download','تنزيل صورة PNG'],['share','مشاركة الإنجاز'],['print','طباعة A4']] as const).map(([key,label])=><button className="btn secondary" key={key} disabled={busy} onClick={()=>perform(key)}>{busy?'جارٍ التجهيز…':label}</button>)}</div>{preview&&<img className="achievement-preview" src={preview} alt={'بطاقة إنجاز '+data.student.name+' — '+RANKS[chosen].name}/>}<p role="status">{notice}</p>{error&&<p className="error" role="alert">{error}</p>}</section>
}
