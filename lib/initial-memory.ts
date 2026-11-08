import {SURAHS,juzFor,normalizeRanges,type Range} from './quran';
export type InitialMemory={surah:number;ranges:Range[]}[];
export function parseInitialMemory(value:unknown):InitialMemory{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>114)throw Error('قائمة الحفظ السابق غير صالحة');
 const seen=new Set<number>();return value.map(item=>{
  const meta=SURAHS.find(s=>s.id===item?.surah);if(!meta||seen.has(meta.id))throw Error('السورة غير صالحة أو مكررة في الحفظ السابق');seen.add(meta.id);
  return {surah:meta.id,ranges:normalizeRanges(item.ranges,meta.count)};
 }).filter(item=>item.ranges.length).sort((a,b)=>a.surah-b.surah);
}
export const INITIAL_JUZ=Array.from({length:30},(_,index)=>({number:index+1,segments:SURAHS.flatMap(s=>{
 let from=0,to=0;for(let ayah=1;ayah<=s.count;ayah++)if(juzFor(s.id,ayah)===index+1){if(!from)from=ayah;to=ayah}
 return from?[{surah:s.id,name:s.name,from,to,whole:from===1&&to===s.count}]:[];
})}));
export type Segment={surah:number;from:number;to:number};
export function selectionCount(value:InitialMemory,segments:Segment[]){let selected=0,total=0;for(const s of segments){const ranges=value.find(m=>m.surah===s.surah)?.ranges||[];for(let ayah=s.from;ayah<=s.to;ayah++){total++;if(ranges.some(([a,b])=>ayah>=a&&ayah<=b))selected++}}return {selected,total}}
export function toggleInitialMemory(value:InitialMemory,segments:Segment[],on:boolean):InitialMemory{
 const maps=new Map<number,Set<number>>();for(const m of value){const verses=new Set<number>();for(const [a,b] of m.ranges)for(let n=a;n<=b;n++)verses.add(n);maps.set(m.surah,verses)}
 for(const s of segments){const verses=maps.get(s.surah)||new Set<number>();for(let n=s.from;n<=s.to;n++)on?verses.add(n):verses.delete(n);maps.set(s.surah,verses)}
 return [...maps].sort(([a],[b])=>a-b).flatMap(([surah,verses])=>{const ranges:Range[]=[];for(const ayah of [...verses].sort((a,b)=>a-b)){const last=ranges.at(-1);if(last&&last[1]+1===ayah)last[1]=ayah;else ranges.push([ayah,ayah])}return ranges.length?[{surah,ranges}]:[]});
}
