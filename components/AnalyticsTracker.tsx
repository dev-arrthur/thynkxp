'use client';

import { useEffect } from 'react';

type TrackExtra = {
  section?: string;
  element?: string;
  durationMs?: number;
};

function getCookie(name: string) {
  if (typeof document === 'undefined') return '';
  const entry = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return entry ? entry.substring(name.length + 1) : '';
}

function analyticsAllowed() {
  return getCookie('thynkxp_consent') === 'analytics';
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AnalyticsTracker() {
  useEffect(() => {
    let started = false;
    let startedAt = Date.now();
    let heartbeat: number | null = null;
    let cleanupObservers: Array<() => void> = [];
    const sentSections = new Set<string>();

    const getVisitorId = () => {
      let id = localStorage.getItem('thynkxp_visitor_id');
      if (!id) {
        id = createId();
        localStorage.setItem('thynkxp_visitor_id', id);
      }
      return id;
    };

    const getSessionId = () => {
      let id = sessionStorage.getItem('thynkxp_session_id');
      if (!id) {
        id = createId();
        sessionStorage.setItem('thynkxp_session_id', id);
      }
      return id;
    };

    const send = (event: string, extra: TrackExtra = {}, keepalive = false) => {
      if (!analyticsAllowed()) return;
      const params = new URLSearchParams(window.location.search);
      const payload = {
        event,
        consent: true,
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        path: window.location.pathname,
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
        ...extra,
      };

      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive,
      }).catch(() => undefined);
    };

    const stopObservers = () => {
      cleanupObservers.forEach((fn) => fn());
      cleanupObservers = [];
    };

    const start = () => {
      if (started || !analyticsAllowed()) return;
      started = true;
      startedAt = Date.now();
      send('page_view');

      document.querySelectorAll<HTMLElement>('section[id]').forEach((section) => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.intersectionRatio >= 0.42 && section.id && !sentSections.has(section.id)) {
                sentSections.add(section.id);
                send('section_view', { section: section.id });
              }
            });
          },
          { threshold: [0.42] },
        );
        observer.observe(section);
        cleanupObservers.push(() => observer.disconnect());
      });

      heartbeat = window.setInterval(() => {
        send('heartbeat', { durationMs: Date.now() - startedAt });
      }, 30000);
    };

    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<{ analytics?: boolean }>).detail;
      if (detail?.analytics) start();
    };

    const onClick = (event: MouseEvent) => {
      if (!started) return;
      const node = event.target as Element | null;
      const target = node?.closest('a,button');
      if (!target) return;
      const text = (target.textContent || target.getAttribute('aria-label') || '').trim().slice(0, 180);
      send('click', { element: text, section: target.closest('section[id]')?.id || '' });
    };

    const onPageHide = () => {
      if (!started) return;
      send('heartbeat', { durationMs: Date.now() - startedAt }, true);
    };

    window.addEventListener('thynkxp:consent', onConsent);
    document.addEventListener('click', onClick, { passive: true });
    window.addEventListener('pagehide', onPageHide);

    if (analyticsAllowed()) start();

    return () => {
      window.removeEventListener('thynkxp:consent', onConsent);
      document.removeEventListener('click', onClick);
      window.removeEventListener('pagehide', onPageHide);
      if (heartbeat) window.clearInterval(heartbeat);
      stopObservers();
    };
  }, []);

  return null;
}
