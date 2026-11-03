// Public deployment checks only. No credentials or user records are required.
import assert from 'node:assert/strict';

const input=process.argv[2];
if(!input)throw new Error('Usage: node scripts/verify-deployment.mjs https://your-siraj-domain');
const base=new URL(input);
if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||base.pathname!=='/')throw new Error('Use an HTTPS origin without credentials, a path or query parameters.');

async function get(path){
 const response=await fetch(new URL(path,base),{redirect:'error',signal:AbortSignal.timeout(25000)});
 return response;
}
const checks=[
 ['home',async()=>{
  const r=await get('/');assert.equal(r.status,200);assert.match(r.headers.get('content-type')||'',/text\/html/);
  assert.match(await r.text(),/سِ?راج/);
 }],
 ['about',async()=>{assert.equal((await get('/about')).status,200);}],
 ['calendar',async()=>{assert.equal((await get('/calendar')).status,200);}],
 ['database connection and anonymous session',async()=>{
  const r=await get('/api/auth/status');assert.equal(r.status,200);assert.match(r.headers.get('cache-control')||'',/no-store/);
  const status=await r.json();assert.equal(status.initialized,true);assert.equal(status.user,null);
 }],
 ['private data requires login',async()=>{
  const r=await get('/api/data');assert.equal(r.status,401);assert.match(r.headers.get('cache-control')||'',/no-store/);
  assert.equal(typeof (await r.json()).error,'string');
 }],
 ['web app manifest',async()=>{
  const r=await get('/manifest.webmanifest');assert.equal(r.status,200);
  assert.match((await r.json()).name,/سِ?راج|Siraj/i);
 }],
 ['brand asset',async()=>{
  const r=await get('/favicon.svg');assert.equal(r.status,200);assert.match(await r.text(),/<svg\b/);
 }],
 ['Arabic font',async()=>{
  const r=await get('/fonts/noto-arabic-400.ttf');assert.equal(r.status,200);assert.ok((await r.arrayBuffer()).byteLength>1000);
 }],
];
const results=await Promise.allSettled(checks.map(async([name,check])=>{await check();return name;}));
let failures=0;
for(let i=0;i<results.length;i++){
 const result=results[i];
 if(result.status==='fulfilled')console.log('PASS: '+result.value);
 else {failures++;console.error('FAIL: '+checks[i][0]+' — '+result.reason.message);}
}
if(failures)process.exitCode=1;
else console.log('PASS: all 8 public deployment checks. Authenticated account flows still require a real sign-in.');
