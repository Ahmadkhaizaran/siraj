'use client';
import {useEffect} from 'react';
import {officialMosqueLogo} from '../lib/mosque-branding';
import {logoColor,paletteTokens} from '../lib/mosque-palette';
const cache=new Map<string,string>();
export default function useMosqueTheme(name?:string,customLogo?:string|null,enabled=true){
 const src=enabled?(customLogo||officialMosqueLogo(name)):null;
 useEffect(()=>{
  const root=document.documentElement;let live=true;
  const clear=()=>{delete root.dataset.mosqueTheme;for(const key of Object.keys(paletteTokens('#174e42')))root.style.removeProperty(key)};
  clear();if(!src)return clear;
  const apply=(color:string)=>{if(!live)return;for(const [key,value]of Object.entries(paletteTokens(color)))root.style.setProperty(key,value);root.dataset.mosqueTheme='logo'};
  if(cache.has(src)){apply(cache.get(src)!);return()=>{live=false;clear()}};
  const image=new Image();image.crossOrigin='anonymous';
  image.onload=()=>{if(!live)return;try{const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return;ctx.drawImage(image,0,0,96,96);const color=logoColor(ctx.getImageData(0,0,96,96).data);if(color){cache.set(src,color);apply(color)}}catch{/* A blocked remote image must never interrupt the workspace. */}};
  image.src=src;
  return()=>{live=false;image.onload=null;clear()};
 },[src]);
}
