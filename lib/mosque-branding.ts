/** Original, unmodified PNGs from the public Masjidi directory, retrieved 2026-11-02. */
export const MOSQUE_BRANDS=[
 {sourceId:67,name:'مسجد الزيتونة',aliases:['مسجد الزيتونة','الزيتونة'],logo:'/mosques/zaytouna.png',source:'https://tv.masjidi.app/67',original:'https://tv.masjidi.app/upload/app_masjid/2025-02/app_masjid_logo_67.png'},
 {sourceId:111,name:'مسجد حبر الأمة عبدالله بن عباس',aliases:['مسجد حبر الأمة عبدالله بن عباس','حبر الأمة عبدالله بن عباس'],logo:'/mosques/hibr-al-ummah.png',source:'https://tv.masjidi.app/111',original:'https://tv.masjidi.app/upload/app_masjid/2025-09/app_masjid_logo_111.png'}
];
const normalize=(name:string)=>name.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/عبد\s+الله/g,'عبدالله').replace(/\s+/g,' ').trim();
export function officialMosqueLogo(name?:string|null,sourceId?:number|null){const brand=sourceId?MOSQUE_BRANDS.find(b=>b.sourceId===sourceId):MOSQUE_BRANDS.find(b=>b.aliases.some(a=>normalize(a)===normalize(name||'')));return brand?.logo||null;}

export function sameMosqueName(a:string,b:string){return normalize(a)===normalize(b);}
