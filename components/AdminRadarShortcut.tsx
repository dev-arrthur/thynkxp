'use client';

import { usePathname } from 'next/navigation';
import Icon from './Icon';

export default function AdminRadarShortcut() {
  const pathname = usePathname();
  if (pathname !== '/admin') return null;

  return (
    <nav className="admin-workspace-shortcuts" aria-label="Acessos rápidos comerciais">
      <a className="admin-commercial-shortcut is-leads" href="/admin/leads" aria-label="Abrir Kanban de Leads">
        <span><Icon name="workflow" /></span>
        <strong>Leads</strong>
        <small>Kanban comercial</small>
        <Icon name="arrow-right" size={15} />
      </a>
      <a className="admin-commercial-shortcut is-radar" href="/admin/radar" aria-label="Abrir Radar de Leads">
        <span><Icon name="search" /></span>
        <strong>Radar de Leads</strong>
        <small>Prospectar empresas</small>
        <Icon name="arrow-right" size={15} />
      </a>
    </nav>
  );
}
