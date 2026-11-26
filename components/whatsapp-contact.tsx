import {whatsappLink} from '../lib/whatsapp';
export default function WhatsAppContact({phone,label}:{phone:unknown;label?:string}){
 const href=whatsappLink(phone);
 if(!href)return null;
 return <a className="text-button" href={href} target="_blank" rel="noopener noreferrer">{label||<bdi>{String(phone)}</bdi>}</a>;
}
