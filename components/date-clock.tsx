'use client';
import { useState,useEffect } from 'react';
import { Clock,CalendarDays, Moon,MapPin } from 'lucide-react';
import { TIMEZONE } from '../lib/islamic-calendar';
const timeFormatter=new Intl.DateTimeFormat('ar-LB',{timeZone:TIMEZONE,hour:'numeric',minute:'2-digit',hour12:true});
export default function DateClock(){
 const [now,setNow]=useState<Date|null>(null);
 useEffect(()=>{setNow(new Date());const timer=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(timer)},[]);
 const parts=now?timeFormatter.formatToParts(now):[];
 const time=parts.filter(p=>p.type!=='dayPeriod').map(p=>p.value).join('').trim();
 const period=parts.find(p=>p.type==='dayPeriod')?.value;
 const periodLabel=period==='ص'?'صباحًا':period==='م'?'مساءً':period;
 return <div className="community-datebar" aria-label="الوقت والتاريخ في مدينة صيدا بتوقيت لبنان">
  <span className="community-time"><Clock size={22} aria-hidden="true"/><time dateTime={now?.toISOString()}><bdi>{time||'—'}</bdi>{periodLabel&&<small className="clock-period">{periodLabel}</small>}</time><span className="clock-city"><MapPin size={17} aria-hidden="true"/>صيدا، لبنان</span></span>
  <span><CalendarDays size={16} aria-hidden="true"/>{now?now.toLocaleDateString('ar-LB',{timeZone:TIMEZONE,weekday:'long',day:'numeric',month:'long',year:'numeric'}):'التاريخ الميلادي'}</span>
  <span><Moon size={16} aria-hidden="true"/>{now?now.toLocaleDateString('ar-LB-u-ca-islamic-umalqura',{timeZone:TIMEZONE,day:'numeric',month:'long',year:'numeric'}):'التاريخ الهجري'}<small className="clock-calculation">حسابي</small></span>
 </div>;
}
