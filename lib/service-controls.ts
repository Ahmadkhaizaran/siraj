export const SERVICES=[
 ['competition','سباق الاجتهاد','إظهار السباق والمشاركة في الترتيب.'],
 ['quran','المصحف الشريف','قراءة المصحف من الأدوات.'],
 ['adhkar','الأذكار','أذكار اليوم والأدعية من الأدوات.'],
 ['calendar','التقويم والنشاطات','المواعيد والنشاطات المشتركة.'],
 ['learning','الحفظ والتقييم','ملف التعلّم وتسجيل الحفظ والعلامات.'],
 ['circles','الحلقات ولقاءاتها','عرض الحلقات وإدارة اللقاءات.'],
 ['students','دليل الطلاب','قائمة الطلاب وملفاتهم.'],
 ['team','فريق التعليم','عرض الفريق وإدارة حساباته.'],
 ['reports','التقارير الإشرافية','الحضور والغياب والحفظ والمتابعة والتصدير.'],
 ['certificates','الشهادات','إصدار الشهادات وعرض الشهادات الممنوحة.'],
 ['support','المراسلات','التواصل بين الجهات وإدارة المنصة.'],
 ['hadith','حديث اليوم','بطاقة الحديث في النظرة العامة. موقوفة حتى تشغّلها من هنا.'],
 ['individual','التسميع الفردي','مواعيد التسميع الفردي وتأكيد الحضور والتقييم.'],
] as const;
export type Service=typeof SERVICES[number][0];
export type ServiceFlags=Partial<Record<Service,boolean>>;
export type ServiceConfig={global:ServiceFlags;institutionDefaults?:ServiceFlags;mosques:Record<string,{all:ServiceFlags;students:ServiceFlags;roles?:Record<string,ServiceFlags>;users?:Record<string,ServiceFlags>}>};
export const CONTROL_KEY='service-controls:v1';
// Services listed here stay off until the owner switches them on globally.
export const DEFAULT_OFF:ReadonlySet<string>=new Set(['hadith']);
export const globalOn=(config:ServiceConfig,key:Service)=>DEFAULT_OFF.has(key)?config.global[key]===true:config.global[key]!==false;
export const emptyControls=():ServiceConfig=>({global:{},mosques:{}});
export function institutionOn(config:ServiceConfig,key:Service,mid?:string|null){
 return (mid?config.mosques[mid]?.all[key]:undefined)??config.institutionDefaults?.[key]??true;
}
export function setInstitutionDefaults(config:ServiceConfig,key:Service,value:boolean):ServiceConfig{
 const mosques=Object.fromEntries(Object.entries(config.mosques).map(([id,settings])=>{
  const all={...settings.all};delete all[key];
  return [id,{...settings,all}];
 }));
 return {...config,institutionDefaults:{...config.institutionDefaults,[key]:value},mosques};
}
export function enabled(config:ServiceConfig,key:Service,mid?:string|null,student=false,role?:string,uid?:string){
 if(role==='admin'&&(key==='quran'||key==='adhkar'))return true;
 const local=mid?config.mosques[mid]:undefined;
 return globalOn(config,key)&&(!mid||institutionOn(config,key,mid))&&(!student||local?.students?.[key]!==false)&&(!role||local?.roles?.[role]?.[key]!==false)&&(!uid||local?.users?.[uid]?.[key]!==false);
}
export function effective(config:ServiceConfig,mid?:string|null,student=false,role?:string,uid?:string):ServiceFlags{return Object.fromEntries(SERVICES.map(([key])=>[key,enabled(config,key,mid,student,role,uid)]));}
export function serviceForPage(page:string):Service|undefined{return ({race:'competition',quran:'quran',calendar:'calendar',learning:'learning',achievement:'learning',circles:'circles','my-circles':'circles',students:'students',team:'team',attendance:'reports',progress:'reports',reports:'reports',support:'support',broadcast:'support','individual-recitation':'individual'} as Record<string,Service>)[page];}
export function serviceForRoute(path:string):Service|undefined{
 if(path.startsWith('calendar'))return 'calendar';if(path.startsWith('support'))return 'support';
 return ({leaderboards:'competition','rank-rewards':'competition',motivation:'competition','student-profile':'learning',memorization:'learning','memorization-batch':'learning',assessments:'learning',progress:'learning',circles:'circles','circle-session':'circles','circle-enrollments':'circles','circle-schedule':'circles','circle-weekly-report':'circles','circle-lesson-pdf':'circles',students:'students','student-account':'students','student-credentials':'students',users:'team','staff-credentials':'team','supervision-report':'reports',attendance:'reports',export:'reports','student-certificates':'certificates','individual-recitation':'individual'} as Record<string,Service>)[path];
}
