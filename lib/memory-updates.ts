import {SURAHS,normalizeRanges,type Range} from './quran';
export type MemoryUpdate={surah:number;ranges:Range[];revision:number};
export function parseMemoryUpdates(value:unknown):MemoryUpdate[]{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>114)throw Error('تحديث الحفظ غير صالح');
 const seen=new Set<number>();return value.map(m=>{const meta=SURAHS.find(s=>s.id===m?.surah);if(!meta||seen.has(meta.id)||!Number.isSafeInteger(m.revision)||m.revision<0)throw Error('السورة أو نسخة الحفظ غير صالحة');seen.add(meta.id);return {surah:meta.id,ranges:normalizeRanges(m.ranges,meta.count),revision:m.revision}});
}
export function memoryDiff(before:any[],after:any[]):MemoryUpdate[]{return SURAHS.flatMap(s=>{const prior=before.find(m=>m.surah===s.id),ranges=after.find(m=>m.surah===s.id)?.ranges||[];return JSON.stringify(prior?.ranges||[])===JSON.stringify(ranges)?[]:[{surah:s.id,ranges,revision:prior?.revision||0}]})}
export function memoryStatement(q:any,sid:string,m:MemoryUpdate,uid:string,stamp:string,gate='1=1',gateArgs:any[]=[]){
 return q('INSERT INTO memorization (student_id,surah,ranges,revision,updated_by,updated_at) SELECT ?,?,?,1,?,? WHERE ('+gate+') AND (?=0 OR EXISTS (SELECT 1 FROM memorization WHERE student_id=? AND surah=? AND revision=?)) ON CONFLICT(student_id,surah) DO UPDATE SET ranges=excluded.ranges,revision=memorization.revision+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE memorization.revision=?',sid,m.surah,JSON.stringify(m.ranges),uid,stamp,...gateArgs,m.revision,sid,m.surah,m.revision,m.revision);
}
export async function checkedMemoryBatch(db:any,statements:any[],required:number[],fail:any){
 if(!db.batchChecked)fail(503,'حفظ تحديثات القرآن غير متاح في هذا الخادم');
 try{return await db.batchChecked(statements,required)}catch(e){if((e as Error).message==='SIRAJ_WRITE_CONFLICT')fail(409,'تغيّر سجل الحفظ أو اللقاء؛ حدّث الصفحة وأعد مراجعة التغييرات');throw e}
}
export function circleKind(circle:any){return circle.kind||(/قرآن|قران|تجويد|تحفيظ/.test(circle.level||'')?'quran':'other')}
