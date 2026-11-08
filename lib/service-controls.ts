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
 ['individual','التسميع الفردي','إيقاف التجربة للجهات المخوّلة؛ التشغيل لا يمنح صلاحية التجربة.'],
] as const;
export type Service=typeof SERVICES[number][0];
export type ServiceFlags=Partial<Record<Service,boolean>>;
export type ServiceConfig={global:ServiceFlags;mosques:Record<string,{all:ServiceFlags;students:ServiceFlags;roles?:Record<string,ServiceFlags>;users?:Record<string,ServiceFlags>}>};
export const CONTROL_KEY='service-controls:v1';
export const emptyControls=():ServiceConfig=>({global:{},mosques:{}});
export function enabled(config:ServiceConfig,key:Service,mid?:string|null,student=false,role?:string,uid?:string){const local=mid?config.mosques[mid]:undefined;return (!role||local?.roles?.[role]?.[key]!==false)&&(!uid||local?.users?.[uid]?.[key]!==false)&&config.global[key]!==false&&(!mid||config.mosques[mid]?.all?.[key]!==false&&(!student||config.mosques[mid]?.students?.[key]!==false));}
export function effective(config:ServiceConfig,mid?:string|null,student=false,role?:string,uid?:string):ServiceFlags{return Object.fromEntries(SERVICES.map(([key])=>[key,enabled(config,key,mid,student,role,uid)]));}
export function serviceForPage(page:string):Service|undefined{return ({race:'competition',quran:'quran',calendar:'calendar',learning:'learning',achievement:'learning',circles:'circles','my-circles':'circles',students:'students',team:'team',attendance:'reports',progress:'reports',reports:'reports',support:'support',broadcast:'support','individual-recitation':'individual'} as Record<string,Service>)[page];}
export function serviceForRoute(path:string):Service|undefined{
 if(path.startsWith('calendar'))return 'calendar';if(path.startsWith('support'))return 'support';
 return ({leaderboards:'competition','rank-rewards':'competition',motivation:'competition','student-profile':'learning',memorization:'learning','memorization-batch':'learning',assessments:'learning',progress:'learning',circles:'circles','circle-session':'circles','circle-enrollments':'circles','circle-schedule':'circles',students:'students','student-account':'students','student-credentials':'students',users:'team','staff-credentials':'team','supervision-report':'reports',attendance:'reports',export:'reports','student-certificates':'certificates','individual-recitation':'individual'} as Record<string,Service>)[path];
}
