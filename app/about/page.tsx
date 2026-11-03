import type {Metadata} from 'next';
import {ArrowRight} from 'lucide-react';
import ThemeSwitcher from '../../components/theme-switcher';
import AboutSiraj from '../../components/about-siraj';
export const metadata:Metadata={title:'من نحن | سِراج',description:'تعرف على سِراج: مبادرة لمساندة المساجد والمراكز في تنظيم الحلقات والطلاب وتسهيل التواصل والمتابعة والتقييم.'};
export default function AboutPage(){return <div className="about-public"><header><a href="/" className="student-home-brand" aria-label="سِراج — الرئيسية">سِراج</a><div className="about-header-actions"><ThemeSwitcher/><a href="/" className="btn secondary"><ArrowRight size={16}/>العودة إلى المنصّة</a></div></header><main><div className="page-heading"><div><span className="eyebrow">تعرّف على سِراج</span><h1>من نحن</h1></div></div><AboutSiraj/></main></div>}
