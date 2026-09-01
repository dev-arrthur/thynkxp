import type { Metadata } from 'next';
import './globals.css';
import './experience.css';
import './motion-polish.css';
import './marquee-fix.css';
import './method-v4.css';
import './login-v3.css';
import './home-cleanup.css';
import './home-polish-v5.css';
import './home-polish-v7.css';
import './home-polish-v8.css';
import CookieConsent from '../components/CookieConsent';

export const metadata: Metadata = {
  title: 'ThynkXP | Estratégia, Design, Sites, Sistemas e Automação',
  description: 'Estratégia, design, sites, sistemas, automações e experiências digitais sob medida para negócios que querem crescer com clareza e performance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <CookieConsent />
        <style>{`
          .thx-testimonials{padding-bottom:92px!important}
          @media(max-width:680px){
            .thx-testimonials{padding-bottom:68px!important}
          }
        `}</style>
      </body>
    </html>
  );
}
