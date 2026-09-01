import type { Metadata } from 'next';
import './globals.css';
import './experience.css';
import './motion-polish.css';
import './marquee-fix.css';
import './method-v4.css';
import './login-v3.css';
import './home-cleanup.css';
import './home-polish-v5.css';
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
          .thx-trusted-window{overflow:hidden!important}
          .thx-trusted-track{
            gap:0!important;
            width:200vw!important;
            min-width:200vw!important;
            max-width:none!important;
            animation:thxTrustedSeamless 18s linear infinite!important;
          }
          .thx-trusted-track:hover{animation-play-state:running!important}
          .thx-trusted-track>div{
            flex:0 0 25vw!important;
            width:25vw!important;
            min-width:25vw!important;
            justify-content:center!important;
          }
          @keyframes thxTrustedSeamless{
            from{transform:translate3d(0,0,0)}
            to{transform:translate3d(-100vw,0,0)}
          }
          @media(max-width:680px){
            .thx-testimonials{padding-bottom:68px!important}
            .thx-trusted-track{animation-duration:14s!important}
          }
          @media(prefers-reduced-motion:reduce){
            .thx-trusted-track{animation:thxTrustedSeamless 18s linear infinite!important}
          }
        `}</style>
      </body>
    </html>
  );
}
