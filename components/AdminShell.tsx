'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './Icon';

const ADMIN_LOGO = '/admin-assets/thynkxp-admin-logo.png';
type DashboardView = 'overview' | 'analytics' | 'clients' | 'opportunities';

type NavItem = {
  label: string;
  icon: IconName;
  href?: string;
  dashboardView?: DashboardView;
};

const DASHBOARD_LABELS: Record<DashboardView, string> = {
  overview: 'Visão geral',
  analytics: 'Analytics',
  clients: 'Clientes',
  opportunities: 'Possíveis clientes',
};

function pageMeta(pathname: string, view: DashboardView) {
  if (pathname === '/admin/equipe') return { eyebrow: 'Equipe', title: 'Gerenciar equipe' };
  if (pathname === '/admin/leads') return { eyebrow: 'Prospecção / Leads', title: 'Gerenciar Leads' };
  if (pathname === '/admin/radar') return { eyebrow: 'Prospecção / Leads', title: 'Buscar Leads' };
  if (pathname === '/admin/perfil') return { eyebrow: 'Conta', title: 'Meu Perfil' };
  if (pathname === '/admin/conquistas') return { eyebrow: 'Conta', title: 'Minhas Conquistas' };
  if (view === 'analytics') return { eyebrow: 'Navegação', title: 'Analytics' };
  if (view === 'clients') return { eyebrow: 'Clientes', title: 'Gerenciar clientes' };
  if (view === 'opportunities') return { eyebrow: 'Prospecção', title: 'Visão Geral' };
  return { eyebrow: 'Navegação', title: 'Início' };
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [leadsOpen, setLeadsOpen] = useState(pathname === '/admin/leads' || pathname === '/admin/radar');
  const [dashboardView, setDashboardView] = useState<DashboardView>('overview');
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname !== '/admin') return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('view') as DashboardView | null;
    const next: DashboardView = requested && requested in DASHBOARD_LABELS ? requested : 'overview';
    setDashboardView(next);

    let attempts = 0;
    const sync = () => {
      attempts += 1;
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.admin-app > .admin-sidebar .admin-nav button'));
      const legacy = buttons.find((button) => button.textContent?.includes(DASHBOARD_LABELS[next]));
      if (legacy) {
        legacy.click();
        return true;
      }
      return attempts >= 40;
    };
    if (sync()) return;
    const timer = window.setInterval(() => { if (sync()) window.clearInterval(timer); }, 100);
    return () => window.clearInterval(timer);
  }, [pathname]);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
    if (pathname === '/admin/leads' || pathname === '/admin/radar') setLeadsOpen(true);
  }, [pathname]);

  useEffect(() => {
    function closeProfile(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', closeProfile);
    return () => document.removeEventListener('mousedown', closeProfile);
  }, []);

  if (pathname === '/admin/login') return <>{children}</>;

  function activateLegacyDashboardSection(view: DashboardView, updateUrl = true) {
    setDashboardView(view);
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.admin-app > .admin-sidebar .admin-nav button'));
    const legacy = buttons.find((button) => button.textContent?.includes(DASHBOARD_LABELS[view]));
    legacy?.click();
    if (updateUrl && typeof window !== 'undefined') {
      const url = view === 'overview' ? '/admin' : `/admin?view=${view}`;
      window.history.replaceState({}, '', url);
    }
    setSidebarOpen(false);
  }

  function goDashboard(view: DashboardView) {
    if (pathname === '/admin') {
      activateLegacyDashboardSection(view);
      return;
    }
    window.location.href = view === 'overview' ? '/admin' : `/admin?view=${view}`;
  }

  async function switchAccount() {
    try { await fetch('/api/admin/login', { method: 'DELETE' }); } catch { /* redirect even if network response is unavailable */ }
    window.location.href = '/admin/login';
  }

  const meta = pageMeta(pathname, dashboardView);
  const groups: { label: string; items: NavItem[] }[] = [
    { label: 'Navegação', items: [
      { label: 'Início', icon: 'home', dashboardView: 'overview' },
      { label: 'Analytics', icon: 'bar-chart', dashboardView: 'analytics' },
    ] },
    { label: 'Equipe', items: [
      { label: 'Gerenciar', icon: 'users', href: '/admin/equipe' },
    ] },
    { label: 'Clientes', items: [
      { label: 'Gerenciar', icon: 'briefcase', dashboardView: 'clients' },
    ] },
    { label: 'Prospecção', items: [
      { label: 'Visão Geral', icon: 'trending-up', dashboardView: 'opportunities' },
    ] },
  ];

  function itemActive(item: NavItem) {
    if (item.dashboardView) return pathname === '/admin' && dashboardView === item.dashboardView;
    return Boolean(item.href && pathname === item.href);
  }

  return (
    <div className="admin-shell-v4">
      <button className={`admin-v4-overlay ${sidebarOpen ? 'is-open' : ''}`} aria-label="Fechar navegação" onClick={() => setSidebarOpen(false)} />
      <aside className={`admin-v4-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-v4-brand">
          <a href="/admin" aria-label="ThynkXP Admin"><img src={ADMIN_LOGO} alt="ThynkXP" /></a>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><Icon name="x" size={17} /></button>
        </div>

        <div className="admin-v4-workspace">
          <span>TX</span><div><small>PAINEL ADMIN</small><strong>ThynkXP</strong><em>Inteligência comercial</em></div>
        </div>

        <nav className="admin-v4-nav" aria-label="Navegação administrativa">
          {groups.map((group) => <section key={group.label} className="admin-v4-nav-group">
            <h3>{group.label}</h3>
            <div>{group.items.map((item) => item.href ? (
              <a key={`${group.label}-${item.label}`} href={item.href} className={itemActive(item) ? 'is-active' : ''}><Icon name={item.icon} size={17} /><span>{item.label}</span></a>
            ) : (
              <button key={`${group.label}-${item.label}`} type="button" className={itemActive(item) ? 'is-active' : ''} onClick={() => item.dashboardView && goDashboard(item.dashboardView)}><Icon name={item.icon} size={17} /><span>{item.label}</span></button>
            ))}</div>
          </section>)}

          <section className="admin-v4-nav-group admin-v4-leads-group">
            <h3>Leads</h3>
            <button type="button" className={`admin-v4-dropdown-trigger ${pathname === '/admin/leads' || pathname === '/admin/radar' ? 'is-active' : ''}`} onClick={() => setLeadsOpen((open) => !open)} aria-expanded={leadsOpen}>
              <Icon name="workflow" size={17} /><span>LEADS</span><Icon name="chevron-right" size={14} />
            </button>
            <div className={`admin-v4-subnav ${leadsOpen ? 'is-open' : ''}`}>
              <a href="/admin/leads" className={pathname === '/admin/leads' ? 'is-active' : ''}><span>Gerenciar</span></a>
              <a href="/admin/radar" className={pathname === '/admin/radar' ? 'is-active' : ''}><span>Buscar Leads</span></a>
            </div>
          </section>
        </nav>

        <div className="admin-v4-sidebar-footer">
          <a href="/" target="_blank" rel="noreferrer"><Icon name="globe" size={16} /><span>Ver site</span><Icon name="external-link" size={13} /></a>
          <div><Icon name="shield" size={14} /><span>Sessão administrativa protegida</span></div>
        </div>
      </aside>

      <div className="admin-v4-main">
        <header className="admin-v4-header">
          <div className="admin-v4-header-left">
            <button type="button" className="admin-v4-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir navegação"><Icon name="menu" size={19} /></button>
            <div><span>{meta.eyebrow}</span><strong>{meta.title}</strong></div>
          </div>

          <div className="admin-v4-header-right" ref={profileRef}>
            <button type="button" className={`admin-v4-profile ${profileOpen ? 'is-open' : ''}`} onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}>
              <span className="admin-v4-avatar">AF</span>
              <span className="admin-v4-profile-copy"><strong>Arthur Ferreira</strong><small>Administrador</small></span>
              <Icon name="chevron-right" size={14} />
            </button>
            <div className={`admin-v4-profile-menu ${profileOpen ? 'is-open' : ''}`}>
              <div className="admin-v4-profile-menu-head"><span>AF</span><div><strong>Arthur Ferreira</strong><small>Conta administrativa</small></div></div>
              <a href="/admin/perfil"><Icon name="settings" size={16} /><span><strong>Meu Perfil</strong><small>Dados e preferências da conta</small></span><Icon name="chevron-right" size={13} /></a>
              <a href="/admin/conquistas"><Icon name="sparkles" size={16} /><span><strong>Minhas Conquistas</strong><small>Marcos da operação comercial</small></span><Icon name="chevron-right" size={13} /></a>
              <button type="button" onClick={switchAccount}><Icon name="logout" size={16} /><span><strong>Trocar de conta</strong><small>Encerrar esta sessão e entrar novamente</small></span><Icon name="chevron-right" size={13} /></button>
            </div>
          </div>
        </header>
        <div className="admin-v4-page">{children}</div>
      </div>
    </div>
  );
}
