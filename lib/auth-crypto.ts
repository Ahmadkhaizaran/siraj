const encoder = new TextEncoder();
export function hex(bytes: ArrayBuffer | Uint8Array) { return Array.from(new Uint8Array(bytes instanceof Uint8Array ? bytes : bytes)).map(x=>x.toString(16).padStart(2,'0')).join(''); }
export async function digest(value:string) { return hex(await crypto.subtle.digest('SHA-256',encoder.encode(value))); }
export function equal(a:string,b:string) { if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0; }
export async function hashPassword(password:string,pepper:string,salt=hex(crypto.getRandomValues(new Uint8Array(24)))) {
 const key=await crypto.subtle.importKey('raw',encoder.encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const prehash=await crypto.subtle.sign('HMAC',key,encoder.encode(password));
 const base=await crypto.subtle.importKey('raw',prehash,'PBKDF2',false,['deriveBits']);
 const result=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-512',iterations:100000,salt:encoder.encode(salt)},base,256);
 return `v1$${salt}$${hex(result)}`;
}
export async function verifyPassword(password:string,stored:string,pepper:string) { const p=stored.split('$');return p.length===3&&p[0]==='v1'&&equal(await hashPassword(password,pepper,p[1]),stored); }
export function token(){return hex(crypto.getRandomValues(new Uint8Array(32)));}
