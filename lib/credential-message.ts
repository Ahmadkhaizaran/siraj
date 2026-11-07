export function credentialMessage(value:{name?:string;username:string;password:string},origin:string){
 return `السلام عليكم ورحمة الله وبركاته\n\n${value.name?value.name+'،\n':''}هذه بيانات حسابك على سِراج:\n\nرابط المنصة: ${origin}\nاسم المستخدم: ${value.username}\nكلمة السر: ${value.password}\n\nيمكنك تغيير كلمة السر من الإعدادات.`;
}
