export async function dispatch(req:Request){
  const backend=process.env.SIRAJ_BACKEND_URL;
  if(!backend){
    if(process.env.VERCEL)return Response.json({error:'إعداد الخادم غير مكتمل'},{status:503});
    return (await import('./server')).handle(req);
  }
  const key=process.env.SIRAJ_BACKEND_KEY,pepper=process.env.SIRAJ_PASSWORD_PEPPER;
  if(!key||!pepper)return Response.json({error:'إعداد الخادم غير مكتمل'},{status:503});
  const headers=new Headers({
    'authorization':'Bearer '+key,
    'x-siraj-url':req.url,
    'x-siraj-password-pepper':pepper,
    'x-siraj-setup-hash':process.env.SIRAJ_SETUP_TOKEN_HASH||'',
    // Vercel overwrites x-real-ip; never trust arbitrary client cf-connecting-ip.
    'x-siraj-client-ip':req.headers.get('x-real-ip')||'unknown',
  });
  for(const name of ['cookie','content-type','origin']){
    const value=req.headers.get(name);if(value)headers.set(name,value);
  }
  const write=!['GET','HEAD'].includes(req.method);
  if(write&&Number(req.headers.get('content-length')||0)>450000)return Response.json({error:'حجم الطلب كبير جدًا'},{status:413});
  const body=write?await req.text():undefined;
  if(body&&body.length>450000)return Response.json({error:'حجم الطلب كبير جدًا'},{status:413});
  try{
    const result=await fetch(backend,{method:req.method,headers,body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(55000)});
    const out=new Headers({'cache-control':'no-store','x-content-type-options':'nosniff'});
    for(const name of ['content-type','set-cookie','referrer-policy']){const value=result.headers.get(name);if(value)out.set(name,value);}
    return new Response(result.body,{status:result.status,headers:out});
  }catch{return Response.json({error:'تعذّر الاتصال بالخادم. حاول مجددًا.'},{status:502,headers:{'cache-control':'no-store'}});}
}
