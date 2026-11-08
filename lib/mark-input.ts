/** Keep editable marks as strings: deleting the field must not insert a zero. */
export function normalizeMarkInput(raw:string){return raw.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/^0+(?=\d)/,'');}
export function validMarkInput(raw:unknown,max:number){return raw===''||raw==null||/^\d+$/.test(String(raw))&&Number.isInteger(Number(raw))&&Number(raw)>=0&&Number(raw)<=max;}
