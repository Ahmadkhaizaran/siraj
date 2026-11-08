/** Bound requests and body reads; never retry a write automatically. */
export async function fetchWithDeadline(input:RequestInfo|URL,init:RequestInit={},timeout=45000){
 const controller=new AbortController();const relay=()=>controller.abort(init.signal?.reason);
 if(init.signal?.aborted)relay();else init.signal?.addEventListener('abort',relay,{once:true});
 let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort()},timeout);
 try{const response=await fetch(input,{...init,signal:controller.signal});const body=await response.arrayBuffer();return new Response([204,205,304].includes(response.status)?null:body,{status:response.status,statusText:response.statusText,headers:response.headers});}
 catch(e){if(timedOut)throw Error(['GET','HEAD'].includes((init.method||'GET').toUpperCase())?'تأخر رد الخادم. أعد تحميل البيانات وحاول مجددًا.':'تأخر رد الخادم. قد يكون الطلب قد حُفظ؛ تحقّق من السجل قبل إعادته.');throw e}
 finally{clearTimeout(timer);init.signal?.removeEventListener('abort',relay)}
}
