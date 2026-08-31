import type { Metadata } from 'next';
import './globals.css';
import './home.css';
import CookieConsent from '../components/CookieConsent';

export const metadata: Metadata = {
  title: 'ThynkXP | Sites, Sistemas, Automação e Experiências Digitais',
  description: 'Estratégia, design, sites, sistemas, automações e soluções digitais sob medida para negócios que querem crescer.',
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
