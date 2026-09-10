'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Icon, { type IconName } from '../../components/Icon';

type Stage = 'novo' | 'qualificado' | 'em_contato' | 'proposta' | 'negociacao' | 'cliente' | 'ativo' | 'pausado' | 'perdido';
type Section = 'overview' | 'opportunities' | 'clients' | 'analytics';
type Lead = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  interest?: string;
  source?: string;
  status?: string;
  estimatedValue?: number;
  nextActionAt?: string | null;
  notes?: string;
  owner?: string;
  anonymous?: boolean;
  leadType?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  company: string;
  interest: string;
  source: string;
  status: Stage;
  estimatedValue: string;
  nextActionAt: string;
  notes: string;
  owner: string;
};

const LOGO = '/brand/thynkxp-logo.png';
const EMPTY_DRAFT: ContactDraft = { name: '', email: '', phone: '', company: '', interest: '', source: 'Cadastro manual', status: 'novo', estimatedValue: '', nextActionAt: '', notes: '', owner: 'Arthur Ferreira' };
const STAGE_META: Record<Stage, { label: string; short: string }> = {
  novo: { label: 'Novo lead', short: 'Novo' },
  qualificado: { label: 'Qualificado', short: 'Qualificado' },
  em_contato: { label: 'Em contato', short: 'Contato' },
  proposta: { label: 'Proposta enviada', short: 'Proposta' },
  negociacao: { label: 'Em negociação', short: 'Negociação' },
  cliente: { label: 'Novo cliente', short: 'Novo cliente' },
  ativo: { label: 'Cliente ativo', short: 'Ativo' },
  pausado: { label: 'Cliente pausado', short: 'Pausado' },
  perdido: { label: 'Oportunidade perdida', short: 'Perdido' },
};
const PIPELINE: Stage[] = ['novo', 'qualificado', 'em_contato', 'proposta', 'negociacao', 'cliente', 'ativo'];
const OPPORTUNITY_STAGES: Stage[] = ['novo', 'qualificado', 'em_contato', 'proposta', 'negociacao', 'perdido'];
const CLIENT_STAGES: Stage[] = ['cliente', 'ativo', 'pausado'];

function normalizeStatus(value?: string): Stage {
  const normalized = (value || 'novo').toLowerCase().trim().replaceAll(' ', '_');
  if (normalized === 'contato') return 'em_contato';
  if (normalized === 'convertido') return 'cliente';
  return normalized in STAGE_META ? normalized as Stage : 'novo';
}

function formatDate(value?: string | null, long = false) {
  if (!value) return 'Não agendada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não agendada';
  return new Intl.DateTimeFormat('pt-BR', long ? { dateStyle: 'medium', timeStyle: 'short' } : { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function dateInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function draftFromLead(lead: Lead): ContactDraft {
  return {
    name: lead.name || '', email: lead.email || '', phone: lead.phone || '', company: lead.company || '',
    interest: lead.interest || '', source: lead.source || 'Direto', status: normalizeStatus(lead.status),
    estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : '', nextActionAt: dateInput(lead.nextActionAt),
    notes: lead.notes || '', owner: lead.owner || 'Arthur Ferreira',
  };
}

function initials(lead: Lead) {
  return (lead.name || lead.company || lead.email || '?').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function contactTitle(lead: Lead) {
  return lead.name || lead.company || (lead.anonymous ? 'Visitante anônimo' : 'Sem nome');
}

function ContactTable({ rows, onSelect, emptyText }: { rows: Lead[]; onSelect: (lead: Lead) => void; emptyText: string }) {
  return (
    <div className="admin-table-wrap">
      <div className="admin-table-head"><span>Contato</span><span>Etapa</span><span>Interesse / origem</span><span>Próxima ação</span><span>Valor</span><span /></div>
      {rows.length ? rows.map(lead => {
        const stage = normalizeStatus(lead.status);
        const overdue = lead.nextActionAt ? new Date(lead.nextActionAt).getTime() < Date.now() : false;
        return <button className="admin-lead-row" key={String(lead._id)} onClick={() => onSelect(lead)}>
          <span className="admin-lead-person"><i>{initials(lead)}</i><b><strong>{contactTitle(lead)}</strong><small>{lead.company || lead.email || 'Cadastro sem empresa'}</small></b></span>
          <span><em className={`status-${stage}`}>{STAGE_META[stage].short}</em></span>
          <span className="admin-row-context"><strong>{lead.interest || 'Interesse não definido'}</strong><small>{lead.source || 'Direto'}</small></span>
          <span className={overdue ? 'is-overdue' : ''}>{lead.nextActionAt ? formatDate(lead.nextActionAt) : 'A definir'}</span>
          <span className="admin-row-value">{formatCurrency(lead.estimatedValue)}</span>
          <span><Icon name="chevron-right" /></span>
        </button>;
      }) : <div className="admin-empty"><div><Icon name="users" size={28} /></div><h3>Nada por aqui ainda</h3><p>{emptyText}</p></div>}
    </div>
  );
}

export default function Admin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('todos');
  const [section, setSection] = useState<Section>('overview');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(EMPTY_DRAFT);
  const [createDraft, setCreateDraft] = useState<ContactDraft>(EMPTY_DRAFT);
  const [createOpen, setCreateOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function load() {
    setError('');
    setLoading(true);
    try {
      const session = await fetch('/api/admin/session', { cache: 'no-store' });
      if (!session.ok) { window.location.href = '/admin/login'; return; }
      const response = await fetch('/api/leads', { cache: 'no-store' });
      if (response.status === 401) { window.location.href = '/admin/login'; return; }
      if (!response.ok) throw new Error('leads_unavailable');
      const data = await response.json();
      setLeads(data.leads || []);
    } catch {
      setError('Não foi possível carregar a base comercial. Confira a conexão com o banco de dados e tente novamente.');
    } finally {
      setLoading(false);
      setReady(true);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selected) setDraft(draftFromLead(selected)); }, [selected]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const locked = Boolean(selected || createOpen);
    document.body.style.overflow = locked ? 'hidden' : '';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelected(null);
      setCreateOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selected, createOpen]);

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    window.location.href = '/admin/login';
  }

  function changeSection(next: Section) {
    setSection(next);
    setFilter('todos');
    setQuery('');
    setSidebarOpen(false);
  }

  async function submitContact(payload: ContactDraft, id?: string) {
    const response = await fetch('/api/leads', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, id, estimatedValue: Number(payload.estimatedValue || 0), nextActionAt: payload.nextActionAt || null }),
    });
    if (response.status === 401) { window.location.href = '/admin/login'; throw new Error('unauthorized'); }
    if (!response.ok) throw new Error('save_failed');
    const data = await response.json();
    return data.lead as Lead;
  }

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await submitContact(createDraft);
      setLeads(current => [created, ...current]);
      setCreateDraft(EMPTY_DRAFT);
      setCreateOpen(false);
      setToast('Contato adicionado ao CRM.');
    } catch (saveError) {
      if ((saveError as Error).message !== 'unauthorized') setToast('Não foi possível cadastrar o contato.');
    } finally { setSaving(false); }
  }

  async function saveSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await submitContact(draft, String(selected._id));
      setLeads(current => current.map(item => String(item._id) === String(updated._id) ? updated : item));
      setSelected(updated);
      setToast('Contato atualizado com sucesso.');
    } catch (saveError) {
      if ((saveError as Error).message !== 'unauthorized') setToast('Não foi possível salvar as alterações.');
    } finally { setSaving(false); }
  }

  const identified = useMemo(() => leads.filter(lead => !lead.anonymous && lead.leadType !== 'cookie_consent'), [leads]);
  const visitors = useMemo(() => leads.filter(lead => lead.anonymous || lead.leadType === 'cookie_consent'), [leads]);
  const opportunities = useMemo(() => identified.filter(lead => OPPORTUNITY_STAGES.includes(normalizeStatus(lead.status))), [identified]);
  const clients = useMemo(() => identified.filter(lead => CLIENT_STAGES.includes(normalizeStatus(lead.status))), [identified]);
  const activeClients = useMemo(() => clients.filter(lead => normalizeStatus(lead.status) === 'ativo'), [clients]);
  const newClients = useMemo(() => clients.filter(lead => normalizeStatus(lead.status) === 'cliente'), [clients]);
  const pipelineValue = useMemo(() => opportunities.filter(lead => normalizeStatus(lead.status) !== 'perdido').reduce((total, lead) => total + (Number(lead.estimatedValue) || 0), 0), [opportunities]);
  const scheduled = useMemo(() => identified.filter(lead => lead.nextActionAt).sort((a, b) => new Date(a.nextActionAt || 0).getTime() - new Date(b.nextActionAt || 0).getTime()).slice(0, 6), [identified]);
  const sources = useMemo(() => {
    const counts = new Map<string, number>();
    identified.forEach(lead => counts.set(lead.source || 'Direto', (counts.get(lead.source || 'Direto') || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [identified]);

  const baseRows = section === 'clients' ? clients : section === 'opportunities' ? opportunities : identified;
  const filtered = useMemo(() => {
    const text = query.toLowerCase().trim();
    return baseRows.filter(lead => {
      const stage = normalizeStatus(lead.status);
      const matchesFilter = filter === 'todos' || stage === filter;
      const haystack = [lead.name, lead.email, lead.phone, lead.company, lead.interest, lead.source, lead.status].filter(Boolean).join(' ').toLowerCase();
      return matchesFilter && (!text || haystack.includes(text));
    });
  }, [baseRows, query, filter]);

  function exportCsv() {
    const header = ['Nome', 'Empresa', 'E-mail', 'Telefone', 'Etapa', 'Interesse', 'Origem', 'Valor estimado', 'Próxima ação', 'Responsável'];
    const rows = filtered.map(lead => [lead.name, lead.company, lead.email, lead.phone, STAGE_META[normalizeStatus(lead.status)].label, lead.interest, lead.source, lead.estimatedValue || 0, lead.nextActionAt ? formatDate(lead.nextActionAt, true) : '', lead.owner]);
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `thynkxp-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const pageTitle = ({ overview: 'Visão geral', opportunities: 'Possíveis clientes', clients: 'Clientes', analytics: 'Analytics' } as const)[section];
  const tabs: { key: string; label: string }[] = section === 'clients'
    ? [{ key: 'todos', label: 'Todos' }, ...CLIENT_STAGES.map(stage => ({ key: stage, label: STAGE_META[stage].short }))]
    : [{ key: 'todos', label: 'Todos' }, ...OPPORTUNITY_STAGES.map(stage => ({ key: stage, label: STAGE_META[stage].short }))];

  if (!ready) return <main className="admin-loading"><div className="admin-loader" /><img src={LOGO} alt="ThynkXP" /><p>Organizando seu painel comercial</p></main>;

  return (
    <main className="admin-app">
      <div className={`admin-mobile-overlay ${sidebarOpen ? 'is-open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-sidebar-brand"><img src={LOGO} alt="ThynkXP" /><button onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><Icon name="x" /></button></div>
        <div className="admin-workspace"><span className="admin-workspace-mark">TX</span><span><small>Workspace</small><strong>ThynkXP</strong><em>CRM comercial</em></span></div>
        <nav className="admin-nav" aria-label="Navegação administrativa">
          {([
            ['overview', 'bar-chart', 'Visão geral', ''],
            ['opportunities', 'trending-up', 'Possíveis clientes', String(opportunities.length)],
            ['clients', 'briefcase', 'Clientes', String(clients.length)],
            ['analytics', 'activity', 'Analytics', ''],
          ] as [Section, IconName, string, string][]).map(([key, icon, label, count]) => <button className={section === key ? 'is-active' : ''} onClick={() => changeSection(key)} key={key}><Icon name={icon} /><span>{label}</span>{count && <b>{count}</b>}</button>)}
        </nav>
        <div className="admin-sidebar-insight"><span><Icon name="sparkles" /></span><div><small>VISÃO DA OPERAÇÃO</small><strong>{activeClients.length} cliente{activeClients.length === 1 ? '' : 's'} ativo{activeClients.length === 1 ? '' : 's'}</strong><p>{formatCurrency(pipelineValue)} em oportunidades abertas.</p></div></div>
        <div className="admin-sidebar-bottom"><a href="/" target="_blank"><Icon name="globe" /><span>Ver site</span><Icon name="external-link" size={15} /></a><button onClick={logout}><Icon name="logout" /><span>Sair da conta</span></button></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left"><button className="admin-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button><div><span>Administração</span><strong>{pageTitle}</strong></div></div>
          <div className="admin-topbar-actions"><button className="admin-icon-button" onClick={load} aria-label="Atualizar dados"><Icon name="activity" /></button><div className="admin-profile"><span>AF</span><div><strong>Arthur Ferreira</strong><small>Administrador</small></div></div></div>
        </header>

        <div className="admin-content">
          <section className="admin-page-heading">
            <div><span className="admin-eyebrow">THYNKXP / CONTROLE COMERCIAL</span><h1>{section === 'overview' ? <>Sua operação,<br/><em>em um só lugar.</em></> : pageTitle}</h1><p>{section === 'overview' ? 'Acompanhe oportunidades, próximos contatos e clientes ativos sem perder o contexto de cada relacionamento.' : section === 'opportunities' ? 'Organize o caminho entre o primeiro contato e a decisão de compra.' : section === 'clients' ? 'Acompanhe novos contratos, clientes ativos e relacionamentos pausados.' : 'Entenda de onde chegam os contatos e como eles avançam pelo funil.'}</p></div>
            <div className="admin-heading-actions"><button onClick={exportCsv} disabled={!filtered.length}><Icon name="download" /> Exportar CSV</button><button className="is-primary" onClick={() => setCreateOpen(true)}><Icon name="plus" /> Novo contato</button></div>
          </section>

          {error && <div className="admin-alert"><Icon name="shield" /><div><strong>Falha ao carregar os dados</strong><p>{error}</p></div><button onClick={load}>Tentar novamente</button></div>}

          {section === 'overview' && <>
            <section className="admin-metrics">
              <article><div><span>Possíveis clientes</span><strong>{opportunities.filter(lead => normalizeStatus(lead.status) !== 'perdido').length}</strong><small>oportunidades em aberto</small></div><i><Icon name="trending-up" /></i></article>
              <article><div><span>Novos clientes</span><strong>{newClients.length}</strong><small>em início de relacionamento</small></div><i><Icon name="sparkles" /></i></article>
              <article><div><span>Clientes ativos</span><strong>{activeClients.length}</strong><small>operações em andamento</small></div><i><Icon name="briefcase" /></i></article>
              <article className="is-value"><div><span>Pipeline estimado</span><strong>{formatCurrency(pipelineValue)}</strong><small>soma das oportunidades abertas</small></div><i><Icon name="bar-chart" /></i></article>
            </section>

            <section className="admin-pipeline-card admin-pipeline-full">
              <div className="admin-card-head"><div><span>Funil comercial</span><h2>Jornada completa</h2><p>Do primeiro contato ao cliente ativo.</p></div><Icon name="workflow" /></div>
              <div className="admin-stage-flow">{PIPELINE.map((stage, index) => {
                const total = identified.filter(lead => normalizeStatus(lead.status) === stage).length;
                return <button key={stage} onClick={() => { changeSection(CLIENT_STAGES.includes(stage) ? 'clients' : 'opportunities'); setFilter(stage); }}><span>0{index + 1}</span><i className={`status-dot status-${stage}`} /><strong>{total}</strong><small>{STAGE_META[stage].short}</small>{index < PIPELINE.length - 1 && <Icon name="chevron-right" size={15} />}</button>;
              })}</div>
            </section>

            <section className="admin-overview-grid">
              <div className="admin-next-card"><div className="admin-card-head"><div><span>Agenda comercial</span><h2>Próximas ações</h2></div><Icon name="calendar" /></div><div className="admin-next-list">{scheduled.length ? scheduled.map(lead => {
                const overdue = new Date(lead.nextActionAt || 0).getTime() < Date.now();
                return <button key={String(lead._id)} onClick={() => setSelected(lead)}><span className={overdue ? 'is-overdue' : ''}><Icon name={overdue ? 'bell' : 'clock'} /></span><div><strong>{contactTitle(lead)}</strong><small>{lead.company || STAGE_META[normalizeStatus(lead.status)].label}</small></div><time>{overdue ? 'Atrasada · ' : ''}{formatDate(lead.nextActionAt)}</time><Icon name="chevron-right" size={16} /></button>;
              }) : <div className="admin-inline-empty"><Icon name="calendar" /><span><strong>Nenhuma ação agendada</strong><small>Abra um contato para definir o próximo passo.</small></span></div>}</div></div>
              <div className="admin-health-card"><div className="admin-card-head"><div><span>Saúde comercial</span><h2>Resumo do funil</h2></div><Icon name="activity" /></div><div className="admin-health-score"><strong>{identified.length ? Math.round((clients.length / identified.length) * 100) : 0}%</strong><span>conversão para cliente</span></div><div className="admin-health-lines"><p><span>Contatos identificados</span><strong>{identified.length}</strong></p><p><span>Visitantes com analytics</span><strong>{visitors.length}</strong></p><p><span>Oportunidades perdidas</span><strong>{opportunities.filter(lead => normalizeStatus(lead.status) === 'perdido').length}</strong></p></div></div>
            </section>

            <section className="admin-leads-card"><div className="admin-leads-head"><div><span>Movimentações recentes</span><h2>Base comercial</h2><p>Os últimos contatos atualizados.</p></div><button className="admin-see-all" onClick={() => changeSection('opportunities')}>Ver todos <Icon name="arrow-right" /></button></div><ContactTable rows={identified.slice(0, 7)} onSelect={setSelected} emptyText="Cadastre o primeiro contato para começar seu acompanhamento." /></section>
          </>}

          {(section === 'opportunities' || section === 'clients') && <section className="admin-leads-card admin-directory">
            <div className="admin-leads-head"><div><span>{section === 'clients' ? 'Relacionamento' : 'Prospecção'}</span><h2>{section === 'clients' ? 'Carteira de clientes' : 'Pipeline de oportunidades'}</h2><p>{filtered.length} registro{filtered.length === 1 ? '' : 's'} encontrado{filtered.length === 1 ? '' : 's'}.</p></div><div className="admin-lead-tools"><label><Icon name="search" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nome, empresa ou interesse" /></label></div></div>
            <div className="admin-filter-tabs">{tabs.map(tab => <button className={filter === tab.key ? 'is-active' : ''} onClick={() => setFilter(tab.key)} key={tab.key}>{tab.label}</button>)}</div>
            <ContactTable rows={filtered} onSelect={setSelected} emptyText={section === 'clients' ? 'Quando uma oportunidade virar cliente, ela aparecerá aqui.' : 'Ajuste os filtros ou cadastre uma nova oportunidade.'} />
          </section>}

          {section === 'analytics' && <section className="admin-analytics-grid">
            <article className="admin-source-card"><div className="admin-card-head"><div><span>Aquisição</span><h2>Origem dos contatos</h2><p>Somente leads identificados.</p></div><Icon name="globe" /></div><div className="admin-source-list">{sources.length ? sources.map(([source, count], index) => <div key={source}><span><i>0{index + 1}</i><strong>{source}</strong></span><b>{count}</b><em><i style={{ width: `${Math.max(8, Math.round((count / Math.max(identified.length, 1)) * 100))}%` }} /></em></div>) : <div className="admin-inline-empty"><Icon name="activity" /><span><strong>Sem dados de origem</strong><small>As origens serão agrupadas quando os leads chegarem.</small></span></div>}</div></article>
            <article className="admin-funnel-card"><div className="admin-card-head"><div><span>Conversão</span><h2>Avanço do funil</h2><p>Percentual sobre contatos identificados.</p></div><Icon name="trending-up" /></div><div className="admin-funnel-visual">{[
              ['Contatos', identified.length], ['Qualificados', identified.filter(lead => normalizeStatus(lead.status) !== 'novo' && normalizeStatus(lead.status) !== 'perdido').length], ['Clientes', clients.length], ['Ativos', activeClients.length],
            ].map(([label, count], index) => <div key={String(label)} style={{ width: `${100 - index * 13}%` }}><span>{label}</span><strong>{count}</strong></div>)}</div></article>
            <article className="admin-signal-card"><span className="admin-signal-icon"><Icon name="activity" /></span><div><small>SINAIS DO SITE</small><strong>{visitors.length}</strong><p>visitantes anônimos aceitaram analytics e entraram na jornada.</p></div></article>
            <article className="admin-signal-card"><span className="admin-signal-icon"><Icon name="users" /></span><div><small>IDENTIFICAÇÃO</small><strong>{identified.length}</strong><p>contatos deixaram informações e podem ser acompanhados no CRM.</p></div></article>
          </section>}
        </div>
      </section>

      {selected && <button className="admin-detail-backdrop" aria-label="Fechar detalhes" onClick={() => setSelected(null)} />}
      <aside className={`admin-detail ${selected ? 'is-open' : ''}`} aria-hidden={!selected}>
        {selected && <form onSubmit={saveSelected}><div className="admin-detail-head"><div><span>Detalhes do relacionamento</span><strong>{contactTitle(selected)}</strong></div><button type="button" onClick={() => setSelected(null)} aria-label="Fechar"><Icon name="x" /></button></div><div className="admin-detail-identity"><span>{initials(selected)}</span><div><em className={`status-${normalizeStatus(selected.status)}`}>{STAGE_META[normalizeStatus(selected.status)].label}</em><small>Entrada em {formatDate(selected.createdAt, true)}</small></div></div>
          <div className="admin-form-grid"><label><span>Nome</span><input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label><label><span>Empresa</span><input value={draft.company} onChange={event => setDraft({ ...draft, company: event.target.value })} /></label><label><span>E-mail</span><input type="email" value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></label><label><span>Telefone</span><input value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} /></label><label className="is-full"><span>Etapa do relacionamento</span><select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as Stage })}>{Object.entries(STAGE_META).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}</select></label><label><span>Interesse</span><input value={draft.interest} onChange={event => setDraft({ ...draft, interest: event.target.value })} /></label><label><span>Origem</span><input value={draft.source} onChange={event => setDraft({ ...draft, source: event.target.value })} /></label><label><span>Valor estimado</span><input type="number" min="0" step="100" value={draft.estimatedValue} onChange={event => setDraft({ ...draft, estimatedValue: event.target.value })} /></label><label><span>Próxima ação</span><input type="datetime-local" value={draft.nextActionAt} onChange={event => setDraft({ ...draft, nextActionAt: event.target.value })} /></label><label className="is-full"><span>Responsável</span><input value={draft.owner} onChange={event => setDraft({ ...draft, owner: event.target.value })} /></label><label className="is-full"><span>Notas e contexto</span><textarea rows={5} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} placeholder="Registre o que foi conversado e o próximo passo." /></label></div>
          <div className="admin-detail-contact-actions">{draft.email && <a href={`mailto:${draft.email}`}><Icon name="mail" /> E-mail</a>}{draft.phone && <a href={`https://wa.me/${draft.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> WhatsApp</a>}</div><button className="admin-save-button" type="submit" disabled={saving}><Icon name="save" /> {saving ? 'Salvando...' : 'Salvar alterações'}</button></form>}
      </aside>

      {createOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setCreateOpen(false); }}><section className="admin-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-contact-title"><div className="admin-modal-head"><div><span>NOVO REGISTRO</span><h2 id="create-contact-title">Adicionar contato</h2><p>Comece como oportunidade ou cadastre um cliente diretamente.</p></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="Fechar"><Icon name="x" /></button></div><form onSubmit={createContact}><div className="admin-form-grid"><label><span>Nome</span><input autoFocus value={createDraft.name} onChange={event => setCreateDraft({ ...createDraft, name: event.target.value })} placeholder="Nome do contato" /></label><label><span>Empresa</span><input value={createDraft.company} onChange={event => setCreateDraft({ ...createDraft, company: event.target.value })} placeholder="Empresa ou marca" /></label><label><span>E-mail</span><input type="email" value={createDraft.email} onChange={event => setCreateDraft({ ...createDraft, email: event.target.value })} /></label><label><span>Telefone</span><input value={createDraft.phone} onChange={event => setCreateDraft({ ...createDraft, phone: event.target.value })} /></label><label><span>Etapa inicial</span><select value={createDraft.status} onChange={event => setCreateDraft({ ...createDraft, status: event.target.value as Stage })}>{Object.entries(STAGE_META).map(([key, meta]) => <option value={key} key={key}>{meta.label}</option>)}</select></label><label><span>Valor estimado</span><input type="number" min="0" step="100" value={createDraft.estimatedValue} onChange={event => setCreateDraft({ ...createDraft, estimatedValue: event.target.value })} /></label><label><span>Interesse</span><input value={createDraft.interest} onChange={event => setCreateDraft({ ...createDraft, interest: event.target.value })} placeholder="Site, sistema, automação..." /></label><label><span>Origem</span><input value={createDraft.source} onChange={event => setCreateDraft({ ...createDraft, source: event.target.value })} /></label><label className="is-full"><span>Próxima ação</span><input type="datetime-local" value={createDraft.nextActionAt} onChange={event => setCreateDraft({ ...createDraft, nextActionAt: event.target.value })} /></label><label className="is-full"><span>Notas</span><textarea rows={4} value={createDraft.notes} onChange={event => setCreateDraft({ ...createDraft, notes: event.target.value })} /></label></div><div className="admin-modal-actions"><button type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button className="is-primary" type="submit" disabled={saving || (!createDraft.name && !createDraft.company)}><Icon name="plus" /> {saving ? 'Adicionando...' : 'Adicionar ao CRM'}</button></div></form></section></div>}

      {toast && <div className="admin-toast" role="status"><Icon name="check-circle" /> {toast}</div>}
      {loading && ready && <span className="admin-refreshing" aria-label="Atualizando"><i /></span>}
    </main>
  );
}
