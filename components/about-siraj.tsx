import {BookOpen,Users,ChartNoAxesCombined,MessagesSquare,Landmark,ShieldCheck,Phone,ArrowUpLeft} from 'lucide-react';

const services=[
 {icon:BookOpen,title:'تنظيم الحلقات',text:'مساعدة المساجد والمراكز على إدارة حلقاتها ومساراتها التعليمية، وتوزيع المدرّسين والطلاب بوضوح.'},
 {icon:Users,title:'رعاية الطلاب',text:'جمع بيانات الطالب ومستواه وسجل حضوره في ملف منظّم، ليتمكّن فريق التعليم من متابعة رحلته خطوةً بخطوة.'},
 {icon:ChartNoAxesCombined,title:'متابعة الحفظ والتقييم',text:'توثيق ما أنجزه الطالب في حفظ القرآن، وتقييم الحفظ والثبات وأحكام التجويد وجودة الأداء، بما يساعد على معرفة نقاط القوة وما يحتاج إلى متابعة.'},
 {icon:MessagesSquare,title:'تسهيل التواصل',text:'إتاحة بيانات التواصل مع المدرّس المسؤول، ومراسلات إدارة المنصّة مع إدارات الجهات، وجمع النشاطات والمواعيد في تقويم مشترك.'},
];

export default function AboutSiraj(){
 return <article className="about-siraj" aria-label="التعريف بمنصّة سِراج">
  <section className="about-intro panel">
   <div className="about-symbol" aria-hidden="true"><img src="/favicon.svg" alt=""/></div>
   <div><span className="eyebrow">منصّة سِراج التعليمية</span><h2>نساند المعلّم، ونرعى رحلة الطالب.</h2>
    <p>سِراج مبادرة مستقلة تهدف إلى مساعدة المساجد ومراكز تحفيظ القرآن والمراكز الدينية على تنظيم العمل التعليمي، وإدارة الحلقات والطلاب، وتسهيل المتابعة والتواصل والتقييم في مكان واحد.</p>
    <p>نسعى إلى تخفيف الأعباء الإدارية عن المشرفين والمدرّسين، حتى يمنحوا وقتًا أكبر للتعليم والتوجيه، وتبقى رحلة كل طالب واضحة أمامه وأمام المسؤولين عن متابعته.</p>
   </div>
  </section>
  <section className="about-services" aria-labelledby="about-goal"><div className="about-section-heading"><span className="eyebrow">هدفنا</span><h2 id="about-goal">تنظيم أوضح، ومتابعة أقرب.</h2><p>نطوّر أدوات عملية تُسهّل إدارة التعليم وتخدم احتياجات المراكز والمساجد وطلابها.</p></div>
   <div className="about-service-grid">{services.map(({icon:Icon,title,text})=><section key={title} className="panel about-service"><span className="about-service-icon"><Icon size={24} strokeWidth={1.6}/></span><h3>{title}</h3><p>{text}</p></section>)}</div>
  </section>
  <section className="panel about-community"><div><Landmark size={25} aria-hidden="true"/><h2>لمن صُمّمت سِراج؟</h2><p>لإدارات المساجد ومراكز تحفيظ القرآن والمراكز الدينية، وللمشرفين والمدرّسين والطلاب؛ لكلّ منهم مساحة تناسب دوره وتساعده على أداء مهمّته.</p></div><div><ShieldCheck size={25} aria-hidden="true"/><h2>وضوح في الأدوار</h2><p>نعتمد صلاحيات واضحة داخل كل جهة، لتبقى إدارة الطلاب والحلقات بيد فريقها، ويطّلع الطالب على حفظه ومستواه وتقييماته، مع إتاحة النشاطات المشتركة لجميع المستخدمين.</p></div></section>
  <footer className="panel about-contact"><div><span className="eyebrow">نتطوّر بملاحظاتكم</span><h2>تواصل مع إدارة سِراج</h2><p>نرحّب باقتراحاتكم واحتياجاتكم لتطوير المنصّة بما يخدم العمل التعليمي.</p></div><div className="about-contact-actions"><a className="btn secondary" href="tel:+96181358618"><Phone size={16}/><bdi>81 358 618</bdi></a><a className="btn primary" href="https://wa.me/96181358618" target="_blank" rel="noreferrer">التواصل عبر واتساب<ArrowUpLeft size={16}/></a></div></footer>
 </article>
}
