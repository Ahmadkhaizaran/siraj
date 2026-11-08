'use client';
import {useEffect,useRef,useState} from 'react';
export default function useConfirmation(){
 const [message,setMessage]=useState('');const pending=useRef<((value:boolean)=>void)|null>(null);
 useEffect(()=>()=>{pending.current?.(false);pending.current=null},[]);
 function finish(value:boolean){const resolve=pending.current;pending.current=null;setMessage('');resolve?.(value)}
 useEffect(()=>{if(!message||typeof document==='undefined')return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')finish(false)};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[message]);
 function ask(text:string){pending.current?.(false);return new Promise<boolean>(resolve=>{pending.current=resolve;setMessage(text)})}
 return {ask,dialog:message?<div className="overlay"><section className="modal" role="dialog" aria-modal="true" aria-label="تأكيد العملية"><header><h2>تأكيد العملية</h2></header><div className="modal-form"><p>{message}</p><div className="modal-footer"><button type="button" className="btn secondary" onClick={()=>finish(false)}>تراجع</button><button type="button" className="btn primary" onClick={()=>finish(true)}>تأكيد</button></div></div></section></div>:null};
}
