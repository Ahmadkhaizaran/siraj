import {Sprout,Leaf,Shield,Star,Diamond,Medal,Crown} from 'lucide-react';
const icons=[Sprout,Leaf,Shield,Star,Diamond,Medal,Crown] as const;
/** Rank text supplies the accessible name; the adjacent symbol is decorative. */
export default function RankIcon({index,size=22}:{index:number;size?:number}){
 const Icon=icons[Math.max(0,Math.min(6,index))]||Sprout;
 return <Icon className="rank-icon" size={size} strokeWidth={1.8} aria-hidden="true"/>;
}
