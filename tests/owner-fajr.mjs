import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.resolve('wrangler/package.json'));const {build}=require('esbuild');
await build({entryPoints:['app/api/owner-fajr/route.ts'],outfile:'outputs/owner-fajr-test.mjs',format:'esm',platform:'node',bundle:true,plugins:[{name:'auth-fixture',setup(b){b.onResolve({filter:/lib\/api-dispatch$/},()=>({path:'auth-fixture',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export async function dispatch(){return Response.json(globalThis.fixture,{status:globalThis.fixtureStatus||200})}',loader:'js'}))}}]});
const {GET}=await import('../outputs/owner-fajr-test.mjs');const request=new Request('https://siraj.example/api/owner-fajr');
globalThis.fixture={user:null};assert.equal((await GET(request)).status,401);
for(const role of ['platform_supervisor','primary','supervisor','teacher','student']){globalThis.fixture={user:{id:'fixture',role}};assert.equal((await GET(request)).status,403)}
globalThis.fixture={user:{id:'owner-fixture',role:'admin'}};const r=await GET(request);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');const d=await r.json();assert.equal(d.owner,'owner-fixture');assert.equal(d.automatic_time_available,false);assert.match(d.hadith.url,/muslim:657a/);
globalThis.fixtureStatus=503;assert.equal((await GET(request)).status,503);
console.log('PASS: Fajr experiment allows owner only, rejects anonymous and all other roles, disables automatic time, and prevents caching.');
