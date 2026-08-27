import type { Metadata } from 'next';
import './globals.css';
import CookieConsent from '../components/CookieConsent';

export const metadata: Metadata = { title: 'thynkXP — Tecnologia que pensa além', description: 'Produtos digitais, automação e experiências digitais.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}<CookieConsent /></body></html>; }