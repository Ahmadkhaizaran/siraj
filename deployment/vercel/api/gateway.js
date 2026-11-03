const UPSTREAM='https://siraj.ahmatoooooo.chatgpt.site';
export default async function handler(req,res){
 const host=req.headers['x-forwarded-host']||req.headers.host;
 if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!=='https://'+host){res.statusCode=403;res.end('Forbidden origin');return;}
 const incoming=new URL(req.url,'https://'+host);
 const path=incoming.searchParams.get('path')||'';
 if(path.includes('..')||path.startsWith('/')){res.statusCode=400;res.end('Invalid path');return;}
 incoming.searchParams.delete('path');
 const target=new URL('/'+path,UPSTREAM);target.search=incoming.searchParams.toString();
 const headers=new Headers();
 for(const key of ['accept','content-type','cookie','rsc','next-router-state-tree','next-router-prefetch'])if(req.headers[key])headers.set(key,key==='cookie'?req.headers[key].split(';').map(s=>s.trim()).filter(s=>s.startsWith('__Host-siraj_session=')||s.startsWith('siraj_session=')).join('; '):req.headers[key]);
 if(!['GET','HEAD'].includes(req.method))headers.set('origin',UPSTREAM);
 try{
  const chunks=[];let length=0;
  if(!['GET','HEAD'].includes(req.method)&&req.body!==undefined){const b=Buffer.isBuffer(req.body)?req.body:Buffer.from(typeof req.body==='string'?req.body:JSON.stringify(req.body));if(b.length>450000){res.statusCode=413;res.end('Request too large');return;}chunks.push(b);}
  else if(!['GET','HEAD'].includes(req.method)){for await(const c of req){length+=c.length;if(length>450000){res.statusCode=413;res.end('Request too large');return;}chunks.push(c);}}
  const response=await fetch(target,{method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined,redirect:'manual',signal:AbortSignal.timeout(55000)});
  res.statusCode=response.status;
  for(const [key,value]of response.headers){if(!['content-encoding','content-length','transfer-encoding','connection','set-cookie'].includes(key))res.setHeader(key,value);}
  const cookies=response.headers.getSetCookie().filter(s=>s.startsWith('__Host-siraj_session=')||s.startsWith('siraj_session='));if(cookies.length)res.setHeader('set-cookie',cookies);
  if(response.headers.has('location')){const location=response.headers.get('location');if(location.startsWith(UPSTREAM))res.setHeader('location',location.slice(UPSTREAM.length)||'/');}
  res.setHeader('cache-control','private, no-store');
  res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
 }catch{res.statusCode=502;res.setHeader('cache-control','no-store');res.end('Siraj service temporarily unavailable');}
}

