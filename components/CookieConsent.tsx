'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';

const COOKIE = 'thynkxp_consent';
const MAX_AGE = 60 * 60 * 24 * 365;
type Consent = 'analytics' | 'necessary';

function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const row = document.cookie.split('; ').find((item) => item.startsWith(`${COOKIE}=`));
  const value = row?.split('=')[1];
  return value === 'analytics' || value === 'necessary' ? value : null;
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getVisitorId() {
  let id = localStorage.getItem('thynkxp_visitor_id');
  if (!id) {
    id = createId();
    localStorage.setItem('thynkxp_visitor_id', id);
  }
  return id;
}

function registerCookieLead() {
  const params = new URLSearchParams(window.location.search);
  const payload = {
    consent: true,
    visitorId: getVisitorId(),
    landingPath: window.location.pathname,
    referrer: document.referrer || '',
    utm: {
      source: params.get('utm_source') || '',
      medium: params.get('utm_medium') || '',
      campaign: params.get('utm_campaign') || '',
      term: params.get('utm_term') || '',
      content: params.get('utm_content') || '',
    },
    device: {
      language: navigator.language || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      screenWidth: window.screen?.width || null,
      screenHeight: window.screen?.height || null,
    },
  };

  fetch('/api/cookie-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    const current = readConsent();
    setConsent(current);
    setAnalytics(current !== 'necessary');
  }, []);

  function save(value: Consent) {
    document.cookie = `${COOKIE}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`;
    setConsent(value);
    setOpen(false);
    setPrefs(false);
    setAnalytics(value === 'analytics');

    if (value === 'analytics') registerCookieLead();

    window.dispatchEvent(new CustomEvent('thynkxp:consent', {
      detail: { analytics: value === 'analytics' },
    }));
  }

  if (!open) {
    return (
      <button
        className={`cookie-fab ${consent ? '' : 'has-pending-consent'}`.trim()}
        onClick={() => {
          const current = readConsent();
          setConsent(current);
          setAnalytics(current !== 'necessary');
          setOpen(true);
        }}
        aria-label="Abrir informações e preferências de cookies"
        title="Cookies e privacidade"
      >
        <Icon name="shield" size={20} />
      </button>
    );
  }

  return (
    <div className="cookie-panel" role="dialog" aria-label="Preferências de cookies" aria-live="polite">
      <div className="cookie-panel-head">
        <div>
          <b><Icon name="shield" size={19} /> Cookies e privacidade</b>
          <p>
            Usamos cookies necessários e, somente com sua autorização, analytics para entender como o site é usado.
            Ao aceitar analytics, registramos um visitante anônimo no painel comercial e dados técnicos como página,
            origem/UTM, idioma, fuso horário, tamanho da tela, navegador e localização aproximada fornecida pela
            infraestrutura da Vercel. Não usamos GPS e não coletamos nome, e-mail ou telefone por meio dos cookies.
          </p>
          <a href="/privacidade">Ler política de privacidade</a>
        </div>
        <button className="cookie-panel-close" type="button" onClick={() => { setOpen(false); setPrefs(false); }} aria-label="Fechar cookies">
          <Icon name="x" size={17} />
        </button>
      </div>

      {prefs ? (
        <div className="cookie-prefs">
          <label><input type="checkbox" checked readOnly /> Cookies necessários</label>
          <label><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /> Analytics e melhoria de experiência</label>
          <div className="cookie-prefs-actions"><button type="button" onClick={() => save(analytics ? 'analytics' : 'necessary')}>Salvar preferências</button></div>
        </div>
      ) : (
        <div className="cookie-actions">
          <button type="button" onClick={() => save('necessary')}>Somente necessários</button>
          <button type="button" onClick={() => setPrefs(true)}>Preferências</button>
          <button type="button" onClick={() => save('analytics')}>Aceitar analytics</button>
        </div>
      )}
    </div>
  );
}
