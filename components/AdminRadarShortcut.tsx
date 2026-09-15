'use client';

import { usePathname } from 'next/navigation';
import Icon from './Icon';

export default function AdminRadarShortcut() {
  const pathname = usePathname();
  if (pathname !== '/admin') return null;

  return (
    <a className="admin-radar-shortcut" href="/admin/radar" aria-label="Abrir Radar de Leads">
      <span><Icon name="search" /></span>
      <strong>Radar de Leads</strong>
      <small>Prospectar empresas</small>
      <Icon name="arrow-right" size={15} />
    </a>
  );
}
