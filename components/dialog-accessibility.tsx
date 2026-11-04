'use client';
import {useEffect} from 'react';
/** Includes legacy dialogs without changing their submit/cancel semantics. */
export default function DialogAccessibility(){
 useEffect(()=>{
  let active:HTMLElement|null=null,previous:HTMLElement|null=null,overflow='';
  const candidates=(root:HTMLElement)=>Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
  const sync=()=>{const dialogs=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'));const next=dialogs.at(-1)||null;if(next===active)return;if(!active&&next){previous=document.activeElement as HTMLElement;overflow=document.body.style.overflow;document.body.style.overflow='hidden'}active=next;if(active){active.tabIndex=-1;if(!active.contains(document.activeElement))(candidates(active)[0]||active).focus()}else{document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();previous=null}};
  const key=(e:KeyboardEvent)=>{if(e.key!=='Tab'||!active)return;const list=candidates(active),first=list[0],last=list.at(-1);if(!first){e.preventDefault();active.focus()}else if(e.shiftKey&&(document.activeElement===first||!active.contains(document.activeElement))){e.preventDefault();last?.focus()}else if(!e.shiftKey&&(document.activeElement===last||!active.contains(document.activeElement))){e.preventDefault();first.focus()}};
  const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});document.addEventListener('keydown',key);sync();return()=>{observer.disconnect();document.removeEventListener('keydown',key);if(active)document.body.style.overflow=overflow};
 },[]);return null;
}
