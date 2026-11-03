'use client';
import {useEffect,type ReactNode} from 'react';
import {ThemeProvider as NextThemeProvider,useTheme} from 'next-themes';
function ThemeChrome(){
 const {resolvedTheme}=useTheme();
 useEffect(()=>{
  let meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta)}
  meta.content=resolvedTheme==='dark'?'#101a15':'#f7f8f5';
 },[resolvedTheme]);
 return null;
}
export default function ThemeProvider({children}:{children:ReactNode}){
 return <NextThemeProvider attribute="data-theme" storageKey="siraj-theme" defaultTheme="system" enableSystem enableColorScheme disableTransitionOnChange>
  <ThemeChrome/>{children}
 </NextThemeProvider>;
}
