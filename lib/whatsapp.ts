export function whatsappLink(phone:unknown){
 if(typeof phone!=='string')return null;
 const raw=phone.trim();
 if(!/^[+\d\s().-]+$/.test(raw))return null;
 let digits=raw.replace(/\D/g,'');
 if(raw.startsWith('00'))digits=digits.slice(2);
 else if(!raw.startsWith('+')&&digits.length<=8)digits='961'+digits.replace(/^0/,'');
 return /^[1-9]\d{7,14}$/.test(digits)?'https://wa.me/'+digits:null;
}
