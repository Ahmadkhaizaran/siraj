export function credentialMessage(value:{name?:string;username:string;password:string;canChangePassword?:boolean},origin:string){
 return `السلام عليكم ورحمة الله وبركاته\n\n${value.name?value.name+'،\n':''}هذه بيانات حسابك على سِراج:\n\nرابط المنصة: ${origin}\nاسم المستخدم: ${value.username}\nكلمة السر: ${value.password}\n\n${value.canChangePassword===false?'لتغيير كلمة السر، تواصل مع المشرف أو المشرف الأساسي.':'يمكنك تغيير كلمة السر من الإعدادات.'}`;
}
