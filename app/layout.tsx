import type { Metadata } from 'next';
import './globals.css';
import './experience.css';
import './login-v3.css';
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
      </body>
    </html>
  );
}
