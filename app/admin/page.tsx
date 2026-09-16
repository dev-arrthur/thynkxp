'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon, { type IconName } from '../../components/Icon';
import { useWorkspaceEvents } from '../../lib/use-workspace-events';

type Overview = {
  metrics: { clients: number; monthly: number; projects: number; tickets: number; urgent: number; overdue: number; domains: number; leads: number };
  tickets: { _id: string; number: string; title: string; clientName: string; priority: string; status: string; updatedAt: string }[];
  projects: { _id: string; name: string; clientName: string; dueAt: string; progress: number; status: string }[];
  followups: { _id: string; name?: string; company?: string; nextActionAt: string; owner?: string; interest?: string }[];
  pipeline: { _id: string; count: number; value: number }[];
  updatedAt: string;
};
const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
const date = (value: string, dateOnly = false) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', ...(dateOnly ? { timeZone: 'UTC' } : {}) }).format(new Date(value));
const stages = [['novo', 'Novos'], ['qualificado', 'Qualificados'], ['em_contato', 'Em contato'], ['proposta', 'Proposta'], ['negociacao', 'Negociação']] as const;
const ticketStatus: Record<string, string> = { aberto: 'Aberto', em_andamento: 'Em andamento', aguardando_cliente: 'Aguardando cliente', resolvido: 'Resolvido', fechado: 'Fechado' };
const priorities: Record<string, string> = { baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };

function Empty({ icon, title, description, href, action }: { icon: IconName; title: string; description: string; href: string; action: string }) {
  return <div className="ws-empty"><span><Icon name={icon} size={25} /></span><h3>{title}</h3><p>{description}</p><Link href={href}>{action}<Icon name="arrow-right" size={15} /></Link></div>;
}

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const active = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    try {
      const response = await fetch('/api/workspace/overview', { cache: 'no-store', signal: controller.signal });
      if (response.status === 401) { window.location.href = '/admin/login'; return; }
      if (!response.ok) throw new Error('unavailable');
      setData(await response.json()); setError('');
    } catch {
      if (!controller.signal.aborted) setError('Não foi possível atualizar sua operação. Tente novamente em instantes.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const legacy = new URLSearchParams(window.location.search).get('view');
    if (legacy === 'clients') { window.location.replace('/admin/clientes'); return; }
    if (legacy === 'opportunities') { window.location.replace('/admin/leads'); return; }
    if (legacy === 'analytics') { window.location.replace('/admin/analytics'); return; }
    void load(); return () => active.current?.abort();
  }, [load]);
  const connection = useWorkspaceEvents(load, Boolean(data));
  const m = data?.metrics;
  const maxStage = Math.max(1, ...stages.map(([id]) => data?.pipeline.find(item => item._id === id)?.count || 0));
  const pipelineValue = stages.reduce((sum, [id]) => sum + (data?.pipeline.find(item => item._id === id)?.value || 0), 0);
  return <main className="ws-page">
    <div className="ws-heading"><div><span className="ws-eyebrow">THYNKXP / CENTRAL DE OPERAÇÕES</span><h1>Seu próximo passo começa aqui.</h1><p>Clientes, entregas e conversas. Tudo conectado ao que importa hoje.</p></div><Link className="ws-button ws-primary" href="/admin/clientes?new=1"><Icon name="plus" size={17} />Novo cliente</Link></div>
    <div className="ws-toolbar"><span className={`ws-live ${connection === 'live' ? 'is-live' : ''}`}><i />{connection === 'live' ? 'Atualizações ao vivo' : connection === 'reconnecting' ? 'Reconectando…' : 'Conectando…'}</span><span>{data ? `Atualizado às ${new Date(data.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Carregando sua operação'}</span><button onClick={() => void load()} className="ws-text-button" aria-label="Atualizar visão geral"><Icon name="activity" size={15} />Atualizar</button></div>
    {error && <div className="ws-alert" role="alert"><Icon name="activity" size={18} /><span>{error}</span><button onClick={() => void load()}>Tentar novamente</button></div>}
    <section className="ws-kpis" aria-label="Resumo da operação" aria-busy={loading}>
      {([
        ['Clientes na carteira', m?.clients, `${m?.domains ?? '—'} domínios cadastrados`, 'users', '/admin/clientes'],
        ['Projetos em andamento', m?.projects, 'Da descoberta à entrega', 'layers', '/admin/projetos'],
        ['Chamados abertos', m?.tickets, m?.urgent ? `${m.urgent} urgentes · ${m.overdue} fora do prazo` : 'Conversas que precisam de você', 'ticket', '/admin/chamados'],
        ['Recorrência contratada', m ? currency(m.monthly) : undefined, 'Mensalidades dos clientes ativos', 'trending-up', '/admin/clientes'],
      ] as const).map(([title, value, detail, icon, href], index) => <Link href={href} className={`ws-kpi ws-kpi-${index}`} key={title}><div><span>{title}</span><Icon name={icon} size={19} /></div><strong>{value ?? '—'}</strong><p>{detail}<Icon name="arrow-up-right" size={14} /></p></Link>)}
    </section>
    <div className="ws-main-grid">
      <section className="ws-panel ws-inbox"><header><div><span className="ws-eyebrow">ATENDIMENTO</span><h2>Conversas em movimento <b>{m?.tickets ?? '—'}</b></h2></div><Link href="/admin/chamados">Abrir central<Icon name="arrow-up-right" size={15} /></Link></header>
        {data?.tickets.length ? <div className="ws-ticket-list">{data.tickets.map(ticket => <Link href={`/admin/chamados?id=${ticket._id}`} key={ticket._id} className="ws-ticket-row"><span className={`ws-ticket-icon ${ticket.priority}`}><Icon name="message-square" size={18} /></span><span className="ws-ticket-copy"><small>{ticket.number} <i>·</i> {ticket.clientName}</small><strong>{ticket.title}</strong><span>{ticketStatus[ticket.status] || ticket.status}</span></span><span className={`ws-badge ${ticket.priority}`}>{priorities[ticket.priority]}</span><Icon name="chevron-right" size={16} /></Link>)}</div> : loading ? <div className="ws-loading">Carregando chamados…</div> : <Empty icon="message-square" title="Espaço para boas conversas" description="As solicitações dos clientes aparecem aqui, com contexto e histórico." href="/admin/chamados" action="Ir para chamados" />}
        <footer><Icon name="shield" size={15} /> Cada cliente acompanha apenas suas próprias solicitações.</footer>
      </section>
      <section className="ws-panel ws-pipeline"><header><div><span className="ws-eyebrow">COMERCIAL</span><h2>Próximas oportunidades</h2></div><Link href="/admin/leads" aria-label="Abrir CRM"><Icon name="arrow-up-right" size={19} /></Link></header><div className="ws-pipeline-value"><strong>{data ? currency(pipelineValue) : '—'}</strong><span>valor estimado em negociação</span></div><div className="ws-funnel">{stages.map(([id, label]) => { const count = data?.pipeline.find(stage => stage._id === id)?.count || 0; return <Link key={id} href={`/admin/leads?status=${id}`}><div><span>{label}</span><b>{loading ? '—' : count}</b></div><span className="ws-track"><i style={{ width: `${count / maxStage * 100}%` }} /></span></Link>; })}</div><Link href="/admin/radar" className="ws-radar-link"><Icon name="search" size={17} /><span>Encontre seu próximo cliente<small>Explore empresas no Radar de leads</small></span><Icon name="arrow-right" size={18} /></Link></section>
      <section className="ws-panel"><header><div><span className="ws-eyebrow">ENTREGAS</span><h2>No horizonte</h2></div><Link href="/admin/projetos">Ver projetos<Icon name="arrow-up-right" size={15} /></Link></header>{data?.projects.length ? <div className="ws-project-list">{data.projects.map(project => <Link href={`/admin/projetos?id=${project._id}`} key={project._id}><div className="ws-project-top"><span><strong>{project.name}</strong><small>{project.clientName}</small></span><time className={new Date(project.dueAt).getTime() + 86_400_000 < Date.now() ? 'ws-overdue' : ''}>{date(project.dueAt, true)}</time></div><div className="ws-progress"><span className="ws-track"><i style={{ width: `${project.progress}%` }} /></span><b>{project.progress}%</b></div></Link>)}</div> : loading ? <div className="ws-loading">Carregando entregas…</div> : <Empty icon="layers" title="Planeje a próxima entrega" description="Projetos com prazo definido aparecem aqui, ordenados pela data de entrega." href="/admin/projetos?new=1" action="Criar projeto" />}</section>
      <section className="ws-panel"><header><div><span className="ws-eyebrow">RELACIONAMENTO</span><h2>Agenda comercial</h2></div><Link href="/admin/leads">Ir para CRM<Icon name="arrow-up-right" size={15} /></Link></header>{data?.followups.length ? <div className="ws-agenda">{data.followups.map(lead => <Link key={lead._id} href={`/admin/leads?id=${lead._id}`}><time className={new Date(lead.nextActionAt).getTime() < Date.now() ? 'ws-overdue' : ''}>{date(lead.nextActionAt)}</time><span><strong>{lead.company || lead.name || 'Contato comercial'}</strong><small>{lead.interest || 'Retomar contato'} · {lead.owner || 'Sem responsável'}</small></span><Icon name="chevron-right" size={14} /></Link>)}</div> : loading ? <div className="ws-loading">Carregando agenda…</div> : <Empty icon="calendar" title="Nenhum próximo contato agendado" description="Defina a próxima ação no CRM para manter as oportunidades em movimento." href="/admin/leads" action="Organizar meus leads" />}</section>
    </div>
    <section className="ws-shortcuts" aria-label="Ações rápidas">{([
      ['users', 'Clientes e domínios', 'Um lugar para cada relacionamento', '/admin/clientes'],
      ['search', 'Radar de leads', 'Descubra novas oportunidades', '/admin/radar'],
      ['layers', 'Gestão de projetos', 'Etapas, prazos e entregas', '/admin/projetos'],
      ['monitor', 'Portal do cliente', 'A experiência do outro lado', '/cliente'],
    ] as const).map(([icon, title, description, href]) => <Link href={href} key={title}><Icon name={icon} size={22} /><span><strong>{title}</strong><small>{description}</small></span><Icon name="arrow-up-right" size={16} /></Link>)}</section>
    <p className="ws-footnote">Uma operação conectada. Uma experiência ThynkXP.</p>
  </main>;
}
