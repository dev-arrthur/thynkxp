from pathlib import Path
import re

path = Path('index.html')
html = path.read_text(encoding='utf-8')

# Replace the current cookie block/script with a consent-aware version that persists for one year.
pattern = re.compile(r'\s*<div class="thynk-cookie-banner".*?<script>\s*\(\(\) => \{.*?</script>', re.S)
replacement = r'''
  <div class="thynk-cookie-banner" id="thynkCookieBanner" role="dialog" aria-label="Preferências de cookies" aria-live="polite">
    <div class="thynk-cookie-copy">
      <strong>🍪 Sua privacidade importa.</strong>
      <p>Usamos cookies necessários e, somente com sua autorização, cookies de análise para entender como o site é usado e melhorar sua experiência. <a href="politica-privacidade.html">Saiba mais</a>.</p>
    </div>
    <div class="thynk-cookie-actions">
      <button type="button" class="thynk-cookie-reject" id="thynkCookieReject">Recusar opcionais</button>
      <button type="button" class="thynk-cookie-preferences" id="thynkCookiePreferences">Preferências</button>
      <button type="button" class="thynk-cookie-accept" id="thynkCookieAccept">Aceitar cookies</button>
    </div>
  </div>
  <button class="thynk-cookie-settings" id="thynkCookieSettings" type="button" aria-label="Abrir preferências de cookies"><i class="fa-solid fa-cookie-bite"></i></button>

  <script>
    (() => {
      const CONSENT = 'thynkxp_consent_v2';
      const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
      const banner = document.getElementById('thynkCookieBanner');
      const settings = document.getElementById('thynkCookieSettings');
      const getCookie = name => document.cookie.split('; ').find(row => row.startsWith(name + '='))?.split('=')[1] || '';
      const getConsent = () => { try { return JSON.parse(decodeURIComponent(getCookie(CONSENT) || '')); } catch { return null; } };
      const setConsent = analytics => {
        const value = encodeURIComponent(JSON.stringify({ necessary: true, analytics: !!analytics, at: new Date().toISOString() }));
        document.cookie = `${CONSENT}=${value}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
        banner.classList.remove('is-visible');
        settings.classList.add('is-visible');
        window.dispatchEvent(new CustomEvent('thynkxp:consent', { detail: { analytics: !!analytics } }));
      };
      const show = () => { banner.classList.add('is-visible'); settings.classList.remove('is-visible'); };
      document.getElementById('thynkCookieAccept').addEventListener('click', () => setConsent(true));
      document.getElementById('thynkCookieReject').addEventListener('click', () => setConsent(false));
      document.getElementById('thynkCookiePreferences').addEventListener('click', () => setConsent(window.confirm('Permitir cookies opcionais de análise?\n\nOK = permitir\nCancelar = somente cookies necessários')));
      settings.addEventListener('click', show);
      const consent = getConsent();
      if (!consent) show(); else settings.classList.add('is-visible');
      window.thynkxpConsent = () => getConsent();
    })();
  </script>'''

if 'id="thynkCookieBanner"' in html:
    html = pattern.sub(replacement, html, count=1)

tracker = r'''
  <script>
    (() => {
      const getConsent = () => window.thynkxpConsent ? window.thynkxpConsent() : null;
      const KEY = 'thynkxp_visitor_id';
      let visitorId = localStorage.getItem(KEY);
      if (!visitorId) { visitorId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(); localStorage.setItem(KEY, visitorId); }
      const sessionId = sessionStorage.getItem('thynkxp_session_id') || (() => { const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(); sessionStorage.setItem('thynkxp_session_id', id); return id; })();
      const params = new URLSearchParams(location.search);
      const utm = { source: params.get('utm_source') || '', medium: params.get('utm_medium') || '', campaign: params.get('utm_campaign') || '', term: params.get('utm_term') || '', content: params.get('utm_content') || '' };
      const startedAt = Date.now();
      const sent = new Set();
      const send = (event, extra = {}, keepalive = false) => {
        const consent = getConsent();
        if (!consent?.analytics) return;
        const payload = { event, consent: true, visitorId, sessionId, path: location.pathname, referrer: document.referrer || '', utm, ...extra };
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive }).catch(() => {});
      };
      const sendWhenAllowed = () => send('page_view');
      if (getConsent()?.analytics) sendWhenAllowed();
      window.addEventListener('thynkxp:consent', e => { if (e.detail?.analytics) sendWhenAllowed(); });

      document.querySelectorAll('section[id]').forEach(section => {
        const observer = new IntersectionObserver(entries => entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= .45 && !sent.has(section.id)) {
            sent.add(section.id); send('section_view', { section: section.id });
          }
        }), { threshold: [.45] });
        observer.observe(section);
      });

      document.addEventListener('click', e => {
        const target = e.target.closest('a,button');
        if (!target) return;
        const label = (target.innerText || target.getAttribute('aria-label') || target.getAttribute('title') || '').trim().slice(0, 180);
        send('click', { element: label, section: target.closest('section[id]')?.id || '' });
      }, { passive: true });

      const heartbeat = () => send('heartbeat', { durationMs: Date.now() - startedAt });
      const timer = setInterval(heartbeat, 30000);
      window.addEventListener('pagehide', () => { clearInterval(timer); send('heartbeat', { durationMs: Date.now() - startedAt }, true); }, { once: true });
    })();
  </script>'''

if '/api/track' not in html:
    html = html.replace('</body>', tracker + '\n</body>', 1)

path.write_text(html, encoding='utf-8')
print('Consent and analytics tracking injected.')
