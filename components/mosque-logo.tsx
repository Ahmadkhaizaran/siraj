'use client';
import { useEffect,useState } from 'react';
import { Landmark } from 'lucide-react';
import { officialMosqueLogo } from '../lib/mosque-branding';
export default function MosqueLogo({name,sourceId,customLogo,size=22}:{name?:string|null;sourceId?:number|null;customLogo?:string|null;size?:number}){
 const src=customLogo||officialMosqueLogo(name,sourceId),[failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[src]);
 return src&&!failed?<img className="original-mosque-logo" src={src} alt={'شعار '+(name||'المسجد')} onError={()=>setFailed(true)}/>:<Landmark size={size}/>;
}
