'use client';
import {useEffect,useState} from 'react';
export default function PlatformNotice({role,onOpen}:{role:string;onOpen:()=>void}){
 const [count,setCount]=useState(0);
 useEffect(()=>{if(!['primary','supervisor'].includes(role))return;let live=true;async function refresh(){if(document.hidden)return;try{const r=await fetch('/api/support/unread',{cache:'no-store'});if(r.ok){const d:any=await r.json();if(live)setCount(d.count||0)}}catch{}}
 refresh();const timer=setInterval(refresh,2000);document.addEventListener('visibilitychange',refresh);return()=>{live=false;clearInterval(timer);document.removeEventListener('visibilitychange',refresh)}},[role]);
 return count?<div className="platform-message-notice" role="status"><strong>رسائل جديدة من إدارة المنصّة ({count})</strong><button className="btn secondary" onClick={onOpen}>فتح المراسلات</button></div>:null;
}
