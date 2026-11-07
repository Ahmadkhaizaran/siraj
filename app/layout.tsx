import type { Metadata } from 'next';
import './globals.css';
import './dark-theme.css';
import './design-system.css';
import './typography.css';
import './mosque-theme.css';
import DialogAccessibility from '../components/dialog-accessibility';
import ThemeProvider from '../components/theme-provider';
export const metadata: Metadata = { title:'سِراج | إدارة تعليم المساجد والمراكز', description:'مساحة واحدة لرعاية رحلة التعلّم: إدارة المساجد والمراكز والحلقات والمدرّسين والطلاب.', robots:{index:false,follow:false},manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/favicon.svg'},appleWebApp:{capable:true,title:'سِراج',statusBarStyle:'default'} };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ar" dir="rtl" suppressHydrationWarning><body><ThemeProvider><a className="skip-link" href="#siraj-main">انتقل إلى المحتوى</a>{children}<DialogAccessibility/></ThemeProvider></body></html>}
