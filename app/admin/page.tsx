'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon';

type Lead = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status?: string;
  createdAt?: string;
};

const LOGO = '/brand/thynkxp-logo.png';

function formatDate(value?: string, long = false) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', long ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'short' }).format(date);
}

function normalizeStatus(value?: string) {
  return (value || 'novo').toLowerCase().trim();
}

function statusLabel(value?: string) {
  const status = normalizeStatus(value);
  return ({ novo: 'Novo', qualificado: 'Qualificado', 'em contato': 'Em contato', contato: 'Em contato', convertido: 'Convertido' } as Record<string,string>)[status] || status.charAt(0).toUpperCase() + status.slice(1);
}

export default function Admin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('todos');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function load() {
    setError('');
    try {
      const session = await fetch('/api/admin/session', { cache: 'no-store' });
      if (!session.ok) { window.location.href = '/admin/login'; return; }
      const response = await fetch('/api/leads', { cache: 'no-store' });
      if (response.status === 401) { window.location.href = '/admin/login'; return; }
      if (!response.ok) throw new Error('leads_unavailable');
      const data = await response.json();
      setLeads(data.leads || []);
    } catch {
      setError('Não foi possível carregar os leads. Verifique a conexão com o MongoDB e tente novamente.');
    } finally {
      setReady(true);
    }
  }

  useEffect(() => { load(); }, []);

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    window.location.href = '/admin/login';
  }

  const counts = useMemo(() => {
    const total = leads.length;
    const novo = leads.filter(l => normalizeStatus(l.status) === 'novo').length;
    const contato = leads.filter(l => ['contato','em contato'].includes(normalizeStatus(l.status))).length;
    const convertido = leads.filter(l => normalizeStatus(l.status) === 'convertido').length;
    const today = leads.filter(l => {
      if (!l.createdAt) return false;
      const d = new Date(l.createdAt); const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    return { total, novo, contato, convertido, today };
  }, [leads]);

  const filtered = useMemo(() => {
    const text = query.toLowerCase().trim();
    return leads.filter((lead) => {
      const status = normalizeStatus(lead.status);
      const matchesFilter = filter === 'todos' || (filter === 'contato' ? ['contato','em contato'].includes(status) : status === filter);
      const haystack = [lead.name, lead.email, lead.phone, lead.company, lead.source, lead.status].filter(Boolean).join(' ').toLowerCase();
      return matchesFilter && (!text || haystack.includes(text));
    });
  }, [leads, query, filter]);

  if (!ready) {
    return <main className="admin-loading"><div className="admin-loader" /><img src={LOGO} alt="ThynkXP" /><p>Preparando seu CRM</p></main>;
  }

  return (
    <main className="admin-app">
      <div className={`admin-mobile-overlay ${sidebarOpen ? 'is-open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-sidebar-brand"><img src={LOGO} alt="ThynkXP" /><button onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><Icon name="x" /></button></div>
        <div className="admin-workspace"><span>Workspace</span><strong>ThynkXP CRM</strong><small>Administração comercial</small></div>
        <nav className="admin-nav">
          <button className="is-active"><Icon name="bar-chart" /><span>Visão geral</span></button>
          <button><Icon name="users" /><span>Leads</span><b>{counts.total}</b></button>
          <button><Icon name="activity" /><span>Analytics</span></button>
          <button><Icon name="message-square" /><span>Conversas</span></button>
          <button><Icon name="settings" /><span>Configurações</span></button>
        </nav>
        <div className="admin-sidebar-bottom">
          <a href="/" target="_blank"><Icon name="globe" /><span>Ver site</span><Icon name="external-link" size={15} /></a>
          <button onClick={logout}><Icon name="logout" /><span>Sair da conta</span></button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left"><button className="admin-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button><div><span>Administração</span><strong>Visão geral</strong></div></div>
          <div className="admin-topbar-actions"><button className="admin-icon-button" aria-label="Notificações"><Icon name="bell" /></button><div className="admin-profile"><span>AF</span><div><strong>Arthur Ferreira</strong><small>Administrador</small></div></div></div>
        </header>

        <div className="admin-content">
          <section className="admin-welcome">
            <div><span className="admin-eyebrow">CRM / PAINEL COMERCIAL</span><h1>Leads que viram<br/><em>oportunidades.</em></h1><p>Acompanhe entradas, contatos e evolução comercial a partir de uma visão única.</p></div>
            <div className="admin-welcome-actions"><button onClick={load}><Icon name="activity" /> Atualizar dados</button><a href="/" target="_blank">Abrir site <Icon name="arrow-up-right" /></a></div>
          </section>

          {error && <div className="admin-alert"><Icon name="shield" /><div><strong>Falha ao carregar dados</strong><p>{error}</p></div><button onClick={load}>Tentar novamente</button></div>}

          <section className="admin-metrics">
            <article><div><span>Total de leads</span><strong>{counts.total}</strong><small>base acumulada</small></div><i><Icon name="users" /></i></article>
            <article><div><span>Novos</span><strong>{counts.novo}</strong><small>aguardando contato</small></div><i><Icon name="sparkles" /></i></article>
            <article><div><span>Em contato</span><strong>{counts.contato}</strong><small>em andamento</small></div><i><Icon name="message-square" /></i></article>
            <article><div><span>Hoje</span><strong>{counts.today}</strong><small>novas entradas</small></div><i><Icon name="calendar" /></i></article>
          </section>

          <section className="admin-grid-main">
            <div className="admin-pipeline-card">
              <div className="admin-card-head"><div><span>Pipeline</span><h2>Distribuição dos leads</h2></div><Icon name="trending-up" /></div>
              <div className="admin-pipeline-bars">
                {[['Novos',counts.novo,'novo'],['Em contato',counts.contato,'contato'],['Convertidos',counts.convertido,'convertido']].map(([label,count,key]) => {
                  const n = Number(count); const pct = counts.total ? Math.max(5, Math.round((n / counts.total) * 100)) : 0;
                  return <div key={String(key)}><div><span>{label}</span><strong>{n}</strong></div><i><b style={{width:`${pct}%`}} /></i></div>;
                })}
              </div>
              <div className="admin-conversion"><span><Icon name="check-circle" /> Conversão registrada</span><strong>{counts.total ? Math.round((counts.convertido / counts.total) * 100) : 0}%</strong></div>
            </div>

            <div className="admin-quick-card">
              <div className="admin-card-head"><div><span>Acesso rápido</span><h2>Ferramentas</h2></div><Icon name="zap" /></div>
              <div className="admin-quick-links"><a href="/" target="_blank"><i><Icon name="globe" /></i><span><strong>Site público</strong><small>Abrir home da ThynkXP</small></span><Icon name="arrow-up-right" /></a><a href="/cliente" target="_blank"><i><Icon name="briefcase" /></i><span><strong>Área do cliente</strong><small>Visualizar portal</small></span><Icon name="arrow-up-right" /></a><a href="/privacidade" target="_blank"><i><Icon name="shield" /></i><span><strong>Privacidade</strong><small>Política de dados</small></span><Icon name="arrow-up-right" /></a></div>
            </div>
          </section>

          <section className="admin-leads-card">
            <div className="admin-leads-head"><div><span>Base comercial</span><h2>Leads recebidos</h2><p>{filtered.length} resultado{filtered.length === 1 ? '' : 's'} exibido{filtered.length === 1 ? '' : 's'}</p></div><div className="admin-lead-tools"><label><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar lead, e-mail ou empresa" /></label><button><Icon name="filter" /> Filtros</button></div></div>
            <div className="admin-filter-tabs">{[['todos','Todos'],['novo','Novos'],['contato','Em contato'],['convertido','Convertidos']].map(([key,label])=><button className={filter===key?'is-active':''} onClick={()=>setFilter(key)} key={key}>{label}</button>)}</div>

            <div className="admin-table-wrap">
              <div className="admin-table-head"><span>Lead</span><span>Empresa</span><span>Origem</span><span>Status</span><span>Entrada</span><span /></div>
              {filtered.length ? filtered.map(lead => <button className="admin-lead-row" key={String(lead._id)} onClick={()=>setSelected(lead)}>
                <span className="admin-lead-person"><i>{(lead.name || lead.email || '?').slice(0,1).toUpperCase()}</i><b><strong>{lead.name || 'Sem nome'}</strong><small>{lead.email || 'Sem e-mail'}</small></b></span>
                <span>{lead.company || 'Não informado'}</span><span>{lead.source || 'Direto'}</span><span><em className={`status-${normalizeStatus(lead.status).replace(' ','-')}`}>{statusLabel(lead.status)}</em></span><span>{formatDate(lead.createdAt)}</span><span><Icon name="chevron-right" /></span>
              </button>) : <div className="admin-empty"><div><Icon name="users" size={28} /></div><h3>Nenhum lead encontrado</h3><p>Ajuste os filtros ou aguarde novas entradas pelo site.</p></div>}
            </div>
          </section>
        </div>
      </section>

      <aside className={`admin-detail ${selected ? 'is-open' : ''}`} aria-hidden={!selected}>
        {selected && <><div className="admin-detail-head"><div><span>Detalhes do lead</span><strong>{selected.name || 'Sem nome'}</strong></div><button onClick={()=>setSelected(null)}><Icon name="x" /></button></div><div className="admin-detail-avatar">{(selected.name || selected.email || '?').slice(0,1).toUpperCase()}</div><div className="admin-detail-status"><em className={`status-${normalizeStatus(selected.status).replace(' ','-')}`}>{statusLabel(selected.status)}</em><span>Entrada em {formatDate(selected.createdAt,true)}</span></div><div className="admin-detail-list"><div><i><Icon name="mail" /></i><span><small>E-mail</small>{selected.email ? <a href={`mailto:${selected.email}`}>{selected.email}</a> : <strong>Não informado</strong>}</span></div><div><i><Icon name="phone" /></i><span><small>Telefone</small>{selected.phone ? <a href={`tel:${selected.phone}`}>{selected.phone}</a> : <strong>Não informado</strong>}</span></div><div><i><Icon name="briefcase" /></i><span><small>Empresa</small><strong>{selected.company || 'Não informado'}</strong></span></div><div><i><Icon name="globe" /></i><span><small>Origem</small><strong>{selected.source || 'Direto'}</strong></span></div></div><div className="admin-detail-actions">{selected.email && <a href={`mailto:${selected.email}`}><Icon name="mail" /> Enviar e-mail</a>}{selected.phone && <a href={`https://wa.me/${selected.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> WhatsApp</a>}</div></>}
      </aside>
    </main>
  );
}
