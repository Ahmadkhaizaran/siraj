import {dispatch} from '../../../lib/api-dispatch';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const status=await dispatch(new Request(new URL('/api/auth/status',req.url),{headers:req.headers}));
 if(!status.ok)return Response.json({error:'تعذّر التحقق من الحساب'},{status:503});
 const {user}=await status.json();
 if(!user)return Response.json({error:'سجّل الدخول'},{status:401});
 if(user.role!=='admin')return Response.json({error:'تجربة خاصة بصاحب المنصّة'},{status:403});
 return Response.json({owner:user.id,server_time:Date.now(),source:'https://tv.masjidi.app/67',automatic_time_available:false,hadith:{text:'مَنْ صَلَّى الصُّبْحَ فَهُوَ فِي ذِمَّةِ اللَّهِ',reference:'صحيح مسلم · 657a · من حديث',url:'https://sunnah.com/muslim:657a'}},{headers:{'Cache-Control':'private, no-store'}});
}
