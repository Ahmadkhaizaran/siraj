/** Deterministic logo-only palette. Ignore transparency, paper white and grey text. */
export function logoColor(pixels:ArrayLike<number>):string|null{
 const buckets=new Map<string,{n:number;r:number;g:number;b:number}>();
 for(let i=0;i+3<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b),light=(hi+lo)/510;
  if(pixels[i+3]<180||hi-lo<32||light<.1||light>.72)continue;
  const k=[r,g,b].map(v=>Math.round(v/16)).join(',');const v=buckets.get(k)||{n:0,r:0,g:0,b:0};v.n++;v.r+=r;v.g+=g;v.b+=b;buckets.set(k,v);
 }
 const best=[...buckets.values()].sort((a,b)=>b.n-a.n)[0];
 return best?'#'+[best.r,best.g,best.b].map(v=>Math.round(v/best.n).toString(16).padStart(2,'0')).join(''):null;
}
export function paletteTokens(hex:string){
 const [r,g,b]=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;
 let h=d===0?0:max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4;h*=60;
 const s=Math.max(25,Math.min(65,d===0?0:d/(1-Math.abs(2*l-1))*100));
 const tone=(light:number,sat=s)=>`hsl(${h.toFixed(1)} ${sat.toFixed(1)}% ${light}%)`;
 return {'--mosque-primary':tone(29),'--mosque-hover':tone(23),'--mosque-bright':tone(79),'--mosque-soft':tone(94,Math.min(s,30)),'--mosque-page':tone(98,20),'--mosque-line':tone(88,20),'--mosque-night':tone(8,20),'--mosque-surface':tone(12,20),'--mosque-night-soft':tone(18,25),'--mosque-night-line':tone(28,20),'--mosque-ink':tone(16,25),'--mosque-muted':tone(37,15),'--mosque-logo':hex};
}
