import type {CSSProperties} from 'react';
const palettes=[
 ['#15803d','#0f766e','#e5faed','#164e36'],
 ['#0f766e','#0891b2','#e1f8f7','#11515a'],
 ['#2563eb','#4f46e5','#e9efff','#253d80'],
 ['#9333ea','#db2777','#f7eaff','#72236d'],
 ['#0284c7','#0d9488','#e0f6ff','#155466'],
 ['#c2410c','#db2777','#fff0e4','#84341e'],
 ['#a16207','#7c3aed','#fff4cf','#69420c'],
] as const;
export function rankAppearance(index:number):CSSProperties{
 const p=palettes[index]||palettes[0];
 return {'--rank-from':p[0],'--rank-to':p[1],'--rank-wash':p[2],'--rank-ink':p[3]} as CSSProperties;
}
