import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {postgresHarness} from './postgres-harness.mjs';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {build}=require('esbuild');
await mkdir('outputs',{recursive:true});
await build({stdin:{contents:"export {hashPassword,verifyPassword} from './lib/auth-crypto.ts'",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'neutral',outfile:'outputs/qa-crypto.mjs'});
const {hashPassword,verifyPassword}=await import('../outputs/qa-crypto.mjs');
const harness=await postgresHarness(build),{database,handle,runtime}=harness;
const originalFetch=globalThis.fetch;
try{
 for(const points of [0,30,35,60,70,90,209,210]){
  const rank=await database.prepare('SELECT MIN(6,CAST(SUM(points)/35 AS INTEGER)) AS rank FROM (SELECT CAST(? AS BIGINT) AS points) AS score').bind(points).first();
  assert.equal(rank.rank,Math.min(6,Math.floor(points/35)),'PostgreSQL must not round rank points upward');
 }
 const origin='https://migration-test.local';
 const call=async(path,body)=>handle(new Request(origin+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)}),runtime);
 assert.equal((await call('auth/setup',{setup_key:'local-setup-token',name:'Test',username:'test.owner',password:'OriginalOwnerPass123!'})).status,201);
 const user=await database.prepare("SELECT * FROM users WHERE username='test.owner'").first();
 const imported=await hashPassword('LegacyPassword123!','old-host-pepper');
 await database.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(imported,user.id).run();
 await database.prepare('INSERT INTO settings (key,value) VALUES (?,?)').bind('migration:legacy-password:'+user.id,imported).run();
 runtime.SIRAJ_LEGACY_AUTH_URL='https://original-test.local';
 let upstream=0;
 const ordinaryReply=body=>Response.json({ok:true},{status:body.password==='LegacyPassword123!'?200:401});
 let reply=ordinaryReply;
 globalThis.fetch=async(url,init)=>{upstream++;assert.equal(String(url),'https://original-test.local/api/auth/login');assert.equal(init.headers.Origin,'https://original-test.local');return reply(JSON.parse(init.body));};
 assert.equal((await call('auth/login',{username:'test.owner',password:'WrongPassword123!'})).status,401);
 // Gateways and unavailable hosts can return HTTP 200 without authenticating anyone.
 const sessions=async()=>Number((await database.prepare('SELECT COUNT(*) AS count FROM sessions').first()).count);
 const beforeUnexpected=await sessions();
 for(const unexpected of [
  ()=>new Response('<html>Sign in to continue</html>',{headers:{'Content-Type':'text/html'}}),
  ()=>Response.json({ok:false}),
  ()=>Response.json({ok:'true'}),
  ()=>Response.json(null),
  ()=>new Response('Unavailable',{status:503}),
 ]){
  reply=unexpected;
  assert.equal((await call('auth/login',{username:'test.owner',password:'LegacyPassword123!'})).status,503,'An unexpected upstream response must not authenticate or report a bad password');
  assert.equal((await database.prepare('SELECT password_hash FROM users WHERE id=?').bind(user.id).first()).password_hash,imported);
  assert.equal((await database.prepare('SELECT value FROM settings WHERE key=?').bind('migration:legacy-password:'+user.id).first()).value,imported);
  assert.equal(await sessions(),beforeUnexpected,'Failed verification must not issue a session');
 }
 reply=ordinaryReply;
 const beforeSuccess=upstream;
 assert.equal((await call('auth/login',{username:'test.owner',password:'LegacyPassword123!'})).status,200);
 assert.equal(upstream,beforeSuccess+1);
 const current=await database.prepare('SELECT password_hash FROM users WHERE id=?').bind(user.id).first();
 assert.ok(await verifyPassword('LegacyPassword123!',current.password_hash,runtime.SIRAJ_PASSWORD_PEPPER));
 assert.equal(await database.prepare('SELECT * FROM settings WHERE key=?').bind('migration:legacy-password:'+user.id).first(),null);
 const afterUpgrade=upstream;
 assert.equal((await call('auth/login',{username:'test.owner',password:'LegacyPassword123!'})).status,200);assert.equal(upstream,afterUpgrade);
 // A password reset must invalidate an outstanding legacy marker.
 await database.prepare('INSERT INTO settings (key,value) VALUES (?,?)').bind('migration:legacy-password:'+user.id,imported).run();
 await database.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(await hashPassword('ResetPassword123!',runtime.SIRAJ_PASSWORD_PEPPER),user.id).run();
 assert.equal((await call('auth/login',{username:'test.owner',password:'LegacyPassword123!'})).status,401);assert.equal(upstream,afterUpgrade);
 assert.equal((await call('auth/login',{username:'test.owner',password:'ResetPassword123!'})).status,200);
 // A reset while the legacy host is replying must also invalidate the old password.
 await database.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(imported,user.id).run();
 const resetDuringVerification=await hashPassword('ResetDuringVerification123!',runtime.SIRAJ_PASSWORD_PEPPER);
 reply=async()=>{await database.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(resetDuringVerification,user.id).run();return Response.json({ok:true});};
 const beforeRace=await sessions();
 assert.equal((await call('auth/login',{username:'test.owner',password:'LegacyPassword123!'})).status,401);
 assert.equal((await database.prepare('SELECT password_hash FROM users WHERE id=?').bind(user.id).first()).password_hash,resetDuringVerification);
 assert.equal((await database.prepare('SELECT value FROM settings WHERE key=?').bind('migration:legacy-password:'+user.id).first()).value,imported);
 assert.equal(await sessions(),beforeRace,'A password reset during verification must not issue a session');
 assert.equal((await call('auth/login',{username:'test.owner',password:'ResetDuringVerification123!'})).status,200);
 const afterRace=upstream;
 await database.prepare('UPDATE users SET password_hash=?,active=0 WHERE id=?').bind(imported,user.id).run();
 assert.equal((await call('auth/login',{username:'test.owner',password:'LegacyPassword123!'})).status,401);assert.equal(upstream,afterRace);
 console.log('PASS: migration requires explicit upstream success; HTML/errors, wrong passwords, concurrent resets and disabled accounts cannot issue sessions.');
}finally{globalThis.fetch=originalFetch;await harness.mf.dispose();}
