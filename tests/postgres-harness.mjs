// Runs the same API/tenant suite on an isolated PostgreSQL WASM database.
// PGLITE_MODULE_PATH can point at a separately installed @electric-sql/pglite.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
export async function postgresHarness(build){
 const {PGlite}=await import(process.env.PGLITE_MODULE_PATH||'@electric-sql/pglite');
 const pg=new PGlite();
 const schema=(await Promise.all(['001_siraj_schema.sql','002_circle_sessions.sql','003_staff_english_name.sql'].map(name=>readFile('deployment/supabase/'+name,'utf8')))).join('\n').split(';').filter(s=>!/^\s*(?:REVOKE|GRANT|ALTER DEFAULT PRIVILEGES)\b/i.test(s)).join(';');
 await pg.exec(schema);
 await pg.exec('SET search_path TO siraj,pg_catalog');
 await build({stdin:{contents:"export {handle} from './lib/server.ts';export {syncMasjidi} from './lib/community-server.ts';export {postgresDatabase} from './lib/postgres-adapter.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,external:['cloudflare:workers'],format:'esm',platform:'neutral',outfile:'outputs/qa-postgres.mjs'});
 const {handle,syncMasjidi,postgresDatabase}=await import(pathToFileURL(process.cwd()+'/outputs/qa-postgres.mjs'));
 const execute=connection=>({
  async query(sql,args){const result=await connection.query(sql,args);const numeric=result.fields.filter(c=>[20,21,23,700,701,1700].includes(c.dataTypeID));return {rows:result.rows.map(row=>{for(const col of numeric)if(row[col.name]!==null)row[col.name]=Number(row[col.name]);return row;}),changes:result.affectedRows??result.rows.length};},
  transaction:fn=>connection.transaction(tx=>fn(execute(tx))),
 });
 const DB=postgresDatabase(execute(pg)),database=DB.withSession();
 const runtime={DB,SIRAJ_PASSWORD_PEPPER:'local-test-only-pepper-not-for-production',SIRAJ_SETUP_TOKEN_HASH:createHash('sha256').update('local-setup-token').digest('hex')};
 return {database,handle,runtime,mf:{dispose:()=>pg.close()},localFetch:async(url,init)=>{
  const request=new Request(url,init);
  if(new URL(url).pathname==='/__test/sync'){
   const payload=await request.json();await syncMasjidi(database,async url=>{const id=String(url).split('/').pop();return payload.fail?new Response('Unavailable',{status:503}):new Response(payload.pages[id]||'invalid page');});return Response.json({ok:true});
  }
  return handle(request,runtime);
 }};
}
