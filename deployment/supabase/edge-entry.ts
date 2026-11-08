// Bundled by build-edge.mjs. Backend credentials never enter client assets.
// @ts-nocheck -- Deno's runtime types are supplied when deployed to Supabase.
import postgres from 'npm:postgres@3.4.7';
import {databaseNumber} from '../../lib/database-number';
import { handle } from '../../lib/server';
import { postgresDatabase } from '../../lib/postgres-adapter';
import { digest,equal } from '../../lib/auth-crypto';

const keyHash='__SIRAJ_BRIDGE_KEY_HASH__';
const client=postgres(Deno.env.get('SUPABASE_DB_URL'),{
  prepare:false,max:3,idle_timeout:20,connect_timeout:10,
  connection:{search_path:'siraj,pg_catalog',statement_timeout:20000},
});
function executor(connection){return {
  async query(sql,args){
    const result=await connection.unsafe(sql,args);
    const numeric=result.columns.filter(c=>[20,21,23,700,701,1700].includes(c.type));
    const rows=result.map(row=>{
      const value={...row};for(const column of numeric){if(value[column.name]!==null){value[column.name]=databaseNumber(value[column.name],column.type);}}
      return value;
    });
    return {rows,changes:result.count};
  },
  transaction:fn=>connection.begin(tx=>fn(executor(tx))),
};}
const DB=postgresDatabase(executor(client));
Deno.serve(async request=>{
  const bearer=request.headers.get('authorization')||'';
  if(!bearer.startsWith('Bearer ')||!equal(await digest(bearer.slice(7)),keyHash))return Response.json({error:'Unauthorized'},{status:401});
  try{
    const url=new URL(request.headers.get('x-siraj-url')||'');
    if(!['http:','https:'].includes(url.protocol)||!url.pathname.startsWith('/api/'))return new Response(null,{status:400});
    const headers=new Headers();
    for(const name of ['cookie','content-type','origin']){const value=request.headers.get(name);if(value)headers.set(name,value);}
    headers.set('cf-connecting-ip',request.headers.get('x-siraj-client-ip')||'unknown');
    const write=!['GET','HEAD'].includes(request.method);
    const body=write?await request.text():undefined;
    if(body&&body.length>450000)return new Response(null,{status:413});
    return await handle(new Request(url,{method:request.method,headers,body}),{
      DB,SIRAJ_PASSWORD_PEPPER:request.headers.get('x-siraj-password-pepper')||'',
      SIRAJ_SETUP_TOKEN_HASH:request.headers.get('x-siraj-setup-hash')||'',
      SIRAJ_LEGACY_AUTH_URL:'https://siraj.ahmadkh28.chatgpt.site',
    });
  }catch{return Response.json({error:'Invalid request'},{status:400});}
});
