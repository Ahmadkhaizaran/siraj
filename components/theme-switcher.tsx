'use client';
import {useEffect,useState} from 'react';
import {useTheme} from 'next-themes';
import {Sun,Moon,Monitor} from 'lucide-react';
export default function ThemeSwitcher(){
 const {theme,setTheme}=useTheme(),[mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);
 const selected=mounted?theme||'system':'system',Icon=selected==='dark'?Moon:selected==='light'?Sun:Monitor;
 return <label className="theme-switcher"><Icon size={17} aria-hidden="true"/><select aria-label="مظهر سِراج" title="اختيار المظهر" value={selected} onChange={e=>setTheme(e.target.value)} disabled={!mounted}><option value="light">فاتح</option><option value="dark">داكن</option><option value="system">تلقائي</option></select></label>
}
