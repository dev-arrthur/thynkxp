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
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    if (/^\/(admin|cliente)(\/|$)/.test(window.location.pathname)) {
      setHidden(true);
      setReady(true);
      return;
    }
    const current = readConsent();
    setConsent(current);
    setAnalytics(current !== 'necessary');
    setOpen(!current);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setPrefs(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function save(value: Consent) {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE}=${value}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    setConsent(value);
    setOpen(false);
    setPrefs(false);
    setAnalytics(value === 'analytics');

    if (value === 'analytics') registerCookieLead();

    window.dispatchEvent(new CustomEvent('thynkxp:consent', {
      detail: { analytics: value === 'analytics' },
    }));
  }

  if (!ready || hidden) return null;

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
    <>
      <button className="cookie-backdrop" type="button" onClick={() => setOpen(false)} aria-label="Fechar preferências de cookies" />
      <section className="cookie-panel" role="dialog" aria-modal="true" aria-labelledby="cookie-title" aria-live="polite">
        <div className="cookie-accent" aria-hidden="true"><span /><span /><span /></div>
        <div className="cookie-panel-head">
          <span className="cookie-shield"><Icon name="shield" size={22} /></span>
          <div>
            <span className="cookie-kicker">SUA EXPERIÊNCIA, SUAS ESCOLHAS</span>
            <b id="cookie-title">Cookies, do seu jeito.</b>
            <p>
              Usamos o essencial para o site funcionar. Com sua permissão, os dados anônimos de navegação nos ajudam a melhorar cada experiência — sem GPS, nome, e-mail ou telefone.
            </p>
            <a href="/privacidade">Conhecer nossa política <Icon name="arrow-up-right" size={14} /></a>
          </div>
          <button className="cookie-panel-close" type="button" onClick={() => { setOpen(false); setPrefs(false); }} aria-label="Fechar cookies">
            <Icon name="x" size={17} />
          </button>
        </div>

        {prefs ? (
          <div className="cookie-prefs">
            <div className="cookie-pref-row is-locked">
              <span><strong>Cookies necessários</strong><small>Segurança, sessão e funcionamento básico.</small></span>
              <span className="cookie-switch is-on" aria-label="Sempre ativos"><i /></span>
            </div>
            <label className="cookie-pref-row">
              <span><strong>Analytics anônimo</strong><small>Origem, páginas e dados técnicos de navegação.</small></span>
              <input className="sr-only" type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
              <span className={`cookie-switch ${analytics ? 'is-on' : ''}`} aria-hidden="true"><i /></span>
            </label>
            <div className="cookie-prefs-actions">
              <button type="button" className="cookie-text-action" onClick={() => setPrefs(false)}><Icon name="arrow-right" size={15} /> Voltar</button>
              <button type="button" className="cookie-primary-action" onClick={() => save(analytics ? 'analytics' : 'necessary')}>Salvar escolhas <Icon name="check" size={16} /></button>
            </div>
          </div>
        ) : (
          <div className="cookie-actions">
            <button className="cookie-quiet-action" type="button" onClick={() => save('necessary')}>Só os necessários</button>
            <button className="cookie-settings-action" type="button" onClick={() => setPrefs(true)}>Personalizar</button>
            <button className="cookie-primary-action" type="button" onClick={() => save('analytics')}>Aceitar e continuar <Icon name="arrow-right" size={16} /></button>
          </div>
        )}
      </section>
    </>
  );
}
