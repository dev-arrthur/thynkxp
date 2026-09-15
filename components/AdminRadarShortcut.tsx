'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

export default function AdminRadarShortcut() {
  const pathname = usePathname();
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (pathname !== '/admin') { setTarget(null); return; }
    let active = true;
    const resolve = () => {
      const nav = document.querySelector<HTMLElement>('.admin-nav');
      if (active && nav) setTarget(nav);
      return Boolean(nav);
    };
    if (resolve()) return () => { active = false; };
    const observer = new MutationObserver(() => { if (resolve()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { active = false; observer.disconnect(); };
  }, [pathname]);

  if (pathname !== '/admin' || !target) return null;

  return createPortal(
    <>
      <button className="admin-commercial-nav-button" type="button" onClick={() => { window.location.href = '/admin/leads'; }}>
        <Icon name="workflow" /><span>Leads</span>
      </button>
      <button className="admin-commercial-nav-button" type="button" onClick={() => { window.location.href = '/admin/radar'; }}>
        <Icon name="search" /><span>Radar de Leads</span>
      </button>
    </>,
    target,
  );
}
