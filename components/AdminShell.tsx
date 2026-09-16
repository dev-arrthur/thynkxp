'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import BrandWordmark from './BrandWordmark';
import Icon, { type IconName } from './Icon';

type NavItem = { label: string; icon: IconName; href: string };

function pageMeta(pathname: string) {
  if (pathname === '/admin/projetos') return { eyebrow: 'Operação', title: 'Projetos e entregas' };
  if (pathname === '/admin/chamados') return { eyebrow: 'Atendimento', title: 'Central de chamados' };
  if (pathname === '/admin/analytics') return { eyebrow: 'Inteligência', title: 'Analytics comercial' };
  if (pathname === '/admin/equipe') return { eyebrow: 'Equipe', title: 'Gerenciar equipe' };
  if (pathname === '/admin/clientes') return { eyebrow: 'Clientes', title: 'Gerenciar clientes' };
  if (pathname === '/admin/leads') return { eyebrow: 'Prospecção / Leads', title: 'Gerenciar Leads' };
  if (pathname === '/admin/radar') return { eyebrow: 'Prospecção / Leads', title: 'Buscar Leads' };
  if (pathname === '/admin/perfil') return { eyebrow: 'Conta', title: 'Meu Perfil' };
  if (pathname === '/admin/conquistas') return { eyebrow: 'Conta', title: 'Minhas Conquistas' };
  return { eyebrow: 'Navegação', title: 'Início' };
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function closeProfile(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setProfileOpen(false); setSidebarOpen(false); } };
    document.addEventListener('mousedown', closeProfile);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', closeProfile); document.removeEventListener('keydown', escape); };
  }, []);

  if (pathname === '/admin/login') return <>{children}</>;

  async function switchAccount() {
    try { await fetch('/api/admin/login', { method: 'DELETE' }); } catch { /* redirect even if request fails */ }
    window.location.href = '/admin/login';
  }

  const meta = pageMeta(pathname);
  const groups: { label: string; items: NavItem[] }[] = [
    { label: 'Workspace', items: [
      { label: 'Visão geral', icon: 'home', href: '/admin' },
      { label: 'Clientes e domínios', icon: 'users', href: '/admin/clientes' },
      { label: 'Projetos e entregas', icon: 'layers', href: '/admin/projetos' },
      { label: 'Central de chamados', icon: 'message-square', href: '/admin/chamados' },
    ] },
    { label: 'Comercial', items: [
      { label: 'CRM e pipeline', icon: 'workflow', href: '/admin/leads' },
      { label: 'Buscar leads', icon: 'search', href: '/admin/radar' },
      { label: 'Analytics', icon: 'bar-chart', href: '/admin/analytics' },
    ] },
    { label: 'Gestão', items: [
      { label: 'Equipe', icon: 'users', href: '/admin/equipe' },
      { label: 'Meu perfil', icon: 'settings', href: '/admin/perfil' },
    ] },
  ];

  function itemActive(item: NavItem) {
    return Boolean(item.href && pathname === item.href);
  }

  return (
    <div className="admin-shell-v4">
      <button className={`admin-v4-overlay ${sidebarOpen ? 'is-open' : ''}`} aria-label="Fechar navegação" onClick={() => setSidebarOpen(false)} />
      <aside className={`admin-v4-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-v4-brand">
          <a href="/admin" aria-label="ThynkXP Admin"><BrandWordmark /></a>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><Icon name="x" size={17} /></button>
        </div>
        <div className="admin-v4-workspace"><span>TX</span><div><small>PAINEL ADMIN</small><strong>ThynkXP</strong><em>Seu ecossistema de trabalho</em></div></div>
        <nav className="admin-v4-nav" aria-label="Navegação administrativa">
          {groups.map((group) => <section key={group.label} className="admin-v4-nav-group"><h3>{group.label}</h3><div>{group.items.map((item) => (
            <Link key={`${group.label}-${item.label}`} href={item.href} aria-current={itemActive(item) ? 'page' : undefined} className={itemActive(item) ? 'is-active' : ''}><Icon name={item.icon} size={17} /><span>{item.label}</span></Link>
          ))}</div></section>)}
        </nav>
        <div className="admin-v4-sidebar-footer"><a href="/" target="_blank" rel="noreferrer"><Icon name="globe" size={16} /><span>Ver site</span><Icon name="external-link" size={13} /></a><div><Icon name="shield" size={14} /><span>Sessão administrativa protegida</span></div></div>
      </aside>

      <div className="admin-v4-main">
        <header className="admin-v4-header">
          <div className="admin-v4-header-left"><button type="button" className="admin-v4-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir navegação"><Icon name="menu" size={19} /></button><div><span>{meta.eyebrow}</span><strong>{meta.title}</strong></div></div>
          <div className="admin-v4-header-right" ref={profileRef}>
            <button type="button" className={`admin-v4-profile ${profileOpen ? 'is-open' : ''}`} onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}><span className="admin-v4-avatar">AF</span><span className="admin-v4-profile-copy"><strong>Arthur Ferreira</strong><small>Administrador</small></span><Icon name="chevron-right" size={14} /></button>
            <div className={`admin-v4-profile-menu ${profileOpen ? 'is-open' : ''}`}><div className="admin-v4-profile-menu-head"><span>AF</span><div><strong>Arthur Ferreira</strong><small>Conta administrativa</small></div></div><a href="/admin/perfil"><Icon name="settings" size={16} /><span><strong>Meu Perfil</strong><small>Dados e preferências da conta</small></span><Icon name="chevron-right" size={13} /></a><a href="/admin/conquistas"><Icon name="sparkles" size={16} /><span><strong>Minhas Conquistas</strong><small>Marcos da operação comercial</small></span><Icon name="chevron-right" size={13} /></a><button type="button" onClick={switchAccount}><Icon name="logout" size={16} /><span><strong>Trocar de conta</strong><small>Encerrar esta sessão e entrar novamente</small></span><Icon name="chevron-right" size={13} /></button></div>
          </div>
        </header>
        <div className="admin-v4-page">{children}</div>
      </div>
    </div>
  );
}
