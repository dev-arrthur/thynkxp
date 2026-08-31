'use client';

import { useEffect, useState } from 'react';

const COOKIE = 'thynkxp_consent';
const MAX_AGE = 60 * 60 * 24 * 365;

type Consent = 'analytics' | 'necessary';

function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const row = document.cookie.split('; ').find((item) => item.startsWith(`${COOKIE}=`));
  const value = row?.split('=')[1];
  return value === 'analytics' || value === 'necessary' ? value : null;
}

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  useEffect(() => {
    const current = readConsent();
    setOpen(!current);
    setAnalytics(current !== 'necessary');
  }, []);

  function save(value: Consent) {
    document.cookie = `${COOKIE}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`;
    setOpen(false);
    setPrefs(false);
    setAnalytics(value === 'analytics');
    window.dispatchEvent(new CustomEvent('thynkxp:consent', { detail: { analytics: value === 'analytics' } }));
  }

  if (!open) {
    return <button className="cookie-fab" onClick={() => { setAnalytics(readConsent() !== 'necessary'); setOpen(true); }} aria-label="Abrir preferências de cookies" title="Preferências de cookies">🍪</button>;
  }

  return (
    <div className="cookie-panel" role="dialog" aria-label="Preferências de cookies" aria-live="polite">
      <div>
        <b>🍪 Sua privacidade importa.</b>
        <p>Usamos cookies necessários e, somente com sua autorização, analytics para entender como o site é usado. Ao aceitar, registramos informações de navegação como página visitada, origem/UTM, cliques, tempo de uso, idioma, fuso horário, tamanho da tela, navegador e localização aproximada fornecida pela infraestrutura da Vercel. Não solicitamos localização GPS.</p>
        <a href="/privacidade">Saiba mais sobre privacidade</a>
      </div>
      {prefs ? (
        <div className="cookie-prefs">
          <label><input type="checkbox" checked readOnly /> Cookies necessários</label>
          <label><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /> Analytics e melhoria de experiência</label>
          <div className="cookie-prefs-actions"><button type="button" onClick={() => save(analytics ? 'analytics' : 'necessary')}>Salvar preferências</button></div>
        </div>
      ) : (
        <div className="cookie-actions">
          <button type="button" onClick={() => save('necessary')}>Recusar opcionais</button>
          <button type="button" onClick={() => setPrefs(true)}>Preferências</button>
          <button type="button" onClick={() => save('analytics')}>Aceitar cookies</button>
        </div>
      )}
    </div>
  );
}
