import assert from 'node:assert/strict';
import {logoColor,paletteTokens} from '../lib/mosque-palette.ts';
assert.equal(logoColor([255,255,255,255,50,60,70,0,140,140,140,255]),null);
assert.equal(logoColor([80,128,64,255,80,128,64,255,220,180,40,255]),'#508040');
assert.equal(logoColor([25,32,80,255,25,32,80,255,255,255,255,255]),'#192050');
const green=paletteTokens('#508040'),navy=paletteTokens('#192050');
assert.notEqual(green['--mosque-primary'],navy['--mosque-primary']);
function luminance(hsl){const [h,s,l]=hsl.match(/[\d.]+/g).map(Number);const a=s/100*Math.min(l/100,1-l/100);return [0,8,4].map(n=>{const k=(n+h/30)%12;const c=l/100-a*Math.max(-1,Math.min(k-3,9-k,1));return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0)}
for(const color of ['#508040','#192050','#ffcc00','#f02060','#2277dd']){const p=paletteTokens(color),base=luminance(p['--mosque-primary']);assert.ok(1.05/(base+.05)>=4.5,'White button labels meet AA');assert.ok((luminance(p['--mosque-bright'])+.05)/(luminance(p['--mosque-night-soft'])+.05)>=4.5,'Dark navigation labels meet AA')}
console.log('PASS: logo filtering, distinct organization palettes, light buttons and dark navigation contrast');
