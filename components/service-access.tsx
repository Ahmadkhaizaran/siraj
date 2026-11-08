'use client';
import {fetchWithDeadline} from '../lib/client-request';
import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
import {type Service,type ServiceFlags,serviceForPage} from '../lib/service-controls';
const Access=createContext<ServiceFlags>({});
const SetAccess=createContext<(flags:ServiceFlags)=>void>(()=>{});
export function useServiceSnapshot(flags?:ServiceFlags){const set=useContext(SetAccess);useEffect(()=>{if(flags)set(flags)},[flags,set]);}
export function ServiceProvider({children}:{children:ReactNode}){
 const [flags,setFlags]=useState<ServiceFlags>({});
 useEffect(()=>{let live=true;async function refresh(){try{const r=await fetchWithDeadline('/api/service-status',{cache:'no-store'});if(r.ok){const d:any=await r.json();if(live)setFlags(d.services)}}catch{}}
 refresh();const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);return()=>{live=false;clearInterval(timer);window.removeEventListener('focus',refresh)}},[]);
 return <SetAccess.Provider value={setFlags}><Access.Provider value={flags}>{children}</Access.Provider></SetAccess.Provider>;
}
export function useServiceAccess(){const flags=useContext(Access);return useCallback((key:Service)=>flags[key]!==false,[flags]);}
export function usePageAccess(){const allowed=useServiceAccess();return useCallback((page:string)=>{const key=serviceForPage(page);return !key||allowed(key)},[allowed])}
export function ServiceBoundary({service,children}:{service:Service;children:ReactNode}){const allowed=useServiceAccess();return allowed(service)?<>{children}</>:null;}
