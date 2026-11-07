import data from './adhkar-data.json';
export type Dhikr={id:number;text:string;count:number;category:string;note?:string};
export const ADHKAR_SOURCE='https://athkari.masjidi.app/';
export const PRAYERS=[['fajr','الفجر'],['dhuhr','الظهر'],['asr','العصر'],['maghrib','المغرب'],['isha','العشاء']];
export const RUQYAH=[['general','الرقية العامة'],['hasad','الحسد'],['ayn','العين'],['sihr','السحر'],['mass','المس'],['anxiety','القلق والاكتئاب']];
export const UNLIMITED=[['subhanallah','سبحان الله'],['alhamdulillah','الحمدلله'],['la-ilaha-illa-allah','لا اله الا الله'],['allahu-akbar','الله أكبر'],['la-hawla-wala-quwwata-illa-billah','لا حول ولا قوة الا بالله'],['allahumma-salli-wa-sallim-ala-nabiyyina-muhammad','اللهم صلي وسلم على نبينا محمد']];
export const DHIKR_GROUPS=[['morning','أذكار الصباح'],['evening','أذكار المساء'],['prayer','أذكار الصلاة'],['bedtime','أذكار النوم'],['ruqyah','الرقية الشرعية'],['comprehensive-dua','جوامع الدعاء'],['unlimited','الأذكار المطلقة']];
export function adhkarFor(category:string):Dhikr[]{
 if(category.startsWith('prayer-'))return [...data.filter(d=>d.category==='prayer-general'),...data.filter(d=>d.category===category)];
 if(category.startsWith('unlimited-')){const item=UNLIMITED.find(([id])=>'unlimited-'+id===category);return item?[{id:1,text:item[1],count:0,category}]:[]}
 return data.filter(d=>d.category===category);
}
export function dhikrTitle(category:string){
 const group=DHIKR_GROUPS.find(([id])=>id===category);if(group)return group[1];
 const prayer=PRAYERS.find(([id])=>'prayer-'+id===category);if(prayer)return 'أذكار صلاة '+prayer[1];
 return RUQYAH.find(([id])=>'ruqyah-'+id===category)?.[1]||UNLIMITED.find(([id])=>'unlimited-'+id===category)?.[1]||'الأذكار';
}
