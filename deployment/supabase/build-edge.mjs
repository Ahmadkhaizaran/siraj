import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {build}=require('esbuild');
const hash=process.env.SIRAJ_BACKEND_KEY_HASH;
if(!/^[0-9a-f]{64}$/.test(hash||''))throw new Error('Set SIRAJ_BACKEND_KEY_HASH to the SHA256 hash of the backend key.');
await mkdir('outputs/supabase-edge',{recursive:true});
const entry=(await readFile('deployment/supabase/edge-entry.ts','utf8')).replace('__SIRAJ_BRIDGE_KEY_HASH__',hash);
await build({stdin:{contents:entry,resolveDir:new URL('.',import.meta.url).pathname,loader:'ts'},bundle:true,format:'esm',platform:'neutral',external:['npm:postgres@3.4.7'],outfile:'outputs/supabase-edge/index.js',plugins:[{
  name:'no-cloudflare-runtime',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'cloudflare',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export const env={}',loader:'js'}));},
}]});
console.log('Built Supabase backend. Only the key hash is embedded.');
