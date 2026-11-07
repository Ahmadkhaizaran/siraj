'use client';
import {useEffect,type RefObject} from 'react';

/** Reserve the actual fixed footer height, including wrapped labels and safe areas. */
export default function useStudentNavigationSpace(home:RefObject<HTMLElement|null>,nav:RefObject<HTMLElement|null>){
 useEffect(()=>{
  const root=home.current,menu=nav.current;if(!root||!menu)return;
  const property='--student-nav-height',previous=root.style.getPropertyValue(property);
  let height=0;
  const measure=()=>{
   const next=Math.ceil(menu.getBoundingClientRect().height);
   if(next>0&&next!==height){height=next;root.style.setProperty(property,next+'px')}
  };
  measure();
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);
  observer?.observe(menu);window.addEventListener('resize',measure,{passive:true});
  return()=>{observer?.disconnect();window.removeEventListener('resize',measure);if(previous)root.style.setProperty(property,previous);else root.style.removeProperty(property)};
 },[home,nav]);
}
