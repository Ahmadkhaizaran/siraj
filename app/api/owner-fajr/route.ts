import {dispatch} from '../../../lib/api-dispatch';
import {fetchPrayerSchedule} from '../../../lib/prayer-times';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const status=await dispatch(new Request(new URL('/api/auth/status',req.url),{headers:req.headers}));
 if(!status.ok)return Response.json({error:'تعذّر التحقق من الحساب'},{status:503});
 const {user}=await status.json();
 if(!user)return Response.json({error:'سجّل الدخول'},{status:401});
 if(user.role!=='admin')return Response.json({error:'تجربة خاصة بصاحب المنصّة'},{status:403});
 let schedule=null,schedule_error='';try{schedule=await fetchPrayerSchedule()}catch(e){schedule_error=(e as Error).message}
 return Response.json({schedule,schedule_error,owner:user.id,server_time:Date.now(),source:'https://tv.masjidi.app/67',automatic_time_available:!!schedule,hadith:{text:'مَنْ صَلَّى الصُّبْحَ فَهُوَ فِي ذِمَّةِ اللَّهِ',reference:'صحيح مسلم · 657a · من حديث',url:'https://sunnah.com/muslim:657a'}},{headers:{'Cache-Control':'private, no-store'}});
}
