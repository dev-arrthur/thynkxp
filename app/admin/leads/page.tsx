'use client';

import { useEffect, useMemo, useState } from 'react';
import LeadKanban, { type KanbanLead, type LeadStage } from '../../../components/LeadKanban';
import Icon from '../../../components/Icon';

const LOGO = '/brand/thynkxp-logo.png';

type Lead = KanbanLead & {
  legalName?: string;
  address?: string;
  cnae?: string;
  cnaeDescription?: string;
  companySize?: string;
  legalNature?: string;
  capitalSocial?: number;
  taxSummary?: string;
  simples?: boolean | null;
  mei?: boolean | null;
  partners?: { name?: string; qualification?: string; joinedAt?: string }[];
  taxRegime?: { year?: number; form?: string; filings?: number }[];
  facebook?: string;
  googleMapsUrl?: string;
  qualification?: string;
  createdAt?: string;
};

function currency(value?: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function normalizedStatus(value?: string) {
  const status = (value || 'novo').toLowerCase().trim().replaceAll(' ', '_');
  if (status === 'contato') return 'em_contato';
  if (status === 'convertido') return 'cliente';
  return status;
}

function leadTitle(lead: Lead) {
  return lead.company || lead.name || lead.email || 'Lead sem nome';
}

export default function AdminLeadsPage() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const session = await fetch('/api/admin/session', { cache: 'no-store' });
      if (!session.ok) { window.location.href = '/admin/login'; return; }
      const response = await fetch('/api/leads', { cache: 'no-store' });
      if (response.status === 401) { window.location.href = '/admin/login'; return; }
      if (!response.ok) throw new Error('leads_unavailable');
      const data = await response.json() as { leads?: Lead[] };
      const identified = (Array.isArray(data.leads) ? data.leads : []).filter((lead) => !('anonymous' in lead) || !(lead as Lead & { anonymous?: boolean }).anonymous);
      setLeads(identified);
    } catch {
      setError('Não foi possível carregar o funil comercial agora.');
    } finally {
      setLoading(false);
      setReady(true);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selected]);

  const pipelineLeads = useMemo(() => leads.filter((lead) => {
    const status = normalizedStatus(lead.status);
    return ['novo', 'qualificado', 'em_contato', 'proposta', 'negociacao', 'cliente', 'ativo', 'pausado', 'perdido'].includes(status);
  }), [leads]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return pipelineLeads;
    return pipelineLeads.filter((lead) => [lead.name, lead.company, lead.email, lead.phone, lead.interest, lead.source, lead.cnpj, lead.website, lead.instagram]
      .filter(Boolean).join(' ').toLowerCase().includes(text));
  }, [pipelineLeads, query]);

  const converted = pipelineLeads.filter((lead) => ['cliente', 'ativo'].includes(normalizedStatus(lead.status))).length;
  const lost = pipelineLeads.filter((lead) => normalizedStatus(lead.status) === 'perdido').length;
  const open = pipelineLeads.filter((lead) => !['cliente', 'ativo', 'perdido'].includes(normalizedStatus(lead.status))).length;
  const totalValue = pipelineLeads.filter((lead) => !['cliente', 'ativo', 'perdido'].includes(normalizedStatus(lead.status))).reduce((sum, lead) => sum + (Number(lead.estimatedValue) || 0), 0);

  function moved(id: string, status: LeadStage) {
    setLeads((current) => current.map((lead) => String(lead._id) === id ? { ...lead, status, updatedAt: new Date().toISOString() } : lead));
    setSelected((current) => current && String(current._id) === id ? { ...current, status } : current);
    setToast(status === 'cliente' ? 'Lead marcado como convertido.' : status === 'perdido' ? 'Oportunidade marcada como não convertida.' : 'Etapa atualizada.');
  }

  if (!ready) return <main className="admin-loading"><div className="admin-loader" /><img src={LOGO} alt="ThynkXP" /><p>Organizando o Kanban comercial</p></main>;

  return (
    <main className="admin-radar-page admin-leads-page">
      <header className="admin-radar-header">
        <a className="admin-radar-brand" href="/admin"><img src={LOGO} alt="ThynkXP" /></a>
        <div className="admin-radar-breadcrumb"><span>Administração</span><Icon name="chevron-right" size={14} /><strong>Leads</strong></div>
        <div className="admin-leads-header-actions"><a href="/admin/radar"><Icon name="search" size={15} /> Prospectar</a><a className="admin-radar-back" href="/admin"><Icon name="arrow-right" size={15} /> Voltar ao painel</a></div>
      </header>

      <div className="admin-radar-shell admin-leads-shell">
        <section className="admin-radar-title admin-leads-title">
          <div><span>THYNKXP / FUNIL COMERCIAL</span><h1>Leads</h1><p>Arraste cada oportunidade entre as etapas e acompanhe quem avançou, converteu ou saiu do funil.</p></div>
          <div className="admin-radar-badge"><Icon name="workflow" /><span><strong>Kanban comercial</strong><small>{open} oportunidade{open === 1 ? '' : 's'} em andamento</small></span></div>
        </section>

        {error && <div className="prospector-message is-error"><Icon name="shield" /><span>{error}</span><button type="button" onClick={() => void load()}>Tentar novamente</button></div>}

        <section className="admin-lead-kpis">
          <article><span>Em andamento</span><strong>{open}</strong><small>leads ativos no funil</small></article>
          <article><span>Convertidos</span><strong>{converted}</strong><small>viraram cliente</small></article>
          <article><span>Não converteram</span><strong>{lost}</strong><small>oportunidades encerradas</small></article>
          <article><span>Pipeline estimado</span><strong>{currency(totalValue)}</strong><small>valor das oportunidades abertas</small></article>
        </section>

        <section className="admin-lead-kanban-shell">
          <div className="admin-lead-kanban-toolbar">
            <div><span>PIPELINE</span><h2>Acompanhamento de conversão</h2><p>{visible.length} lead{visible.length === 1 ? '' : 's'} no quadro.</p></div>
            <label><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, contato, CNPJ..." /><button type="button" onClick={() => setQuery('')} aria-label="Limpar busca" disabled={!query}><Icon name="x" size={13} /></button></label>
          </div>
          <LeadKanban leads={visible} onOpen={(lead) => setSelected(lead as Lead)} onMoved={moved} />
        </section>
      </div>

      {selected && <button className="lead-detail-backdrop" onClick={() => setSelected(null)} aria-label="Fechar detalhes do lead" />}
      <aside className={`lead-detail-drawer ${selected ? 'is-open' : ''}`} aria-hidden={!selected}>
        {selected && <>
          <header><div><span>INTELIGÊNCIA DO LEAD</span><h2>{leadTitle(selected)}</h2><p>{selected.legalName && selected.legalName !== leadTitle(selected) ? selected.legalName : selected.interest || 'Oportunidade comercial'}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Fechar"><Icon name="x" /></button></header>
          <div className="lead-detail-score"><span><small>Score comercial</small><strong>{Math.round(Number(selected.qualificationScore) || 0)}<em>/100</em></strong></span><span><small>Etapa atual</small><strong>{normalizedStatus(selected.status).replaceAll('_', ' ')}</strong></span></div>
          <section className="lead-detail-section"><h3>Contato</h3><div className="lead-detail-links">{selected.phone && <a href={`https://wa.me/${selected.phone.replace(/\D/g, '').replace(/^(\d{10,11})$/, '55$1')}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> WhatsApp</a>}{selected.email && <a href={`mailto:${selected.email}`}><Icon name="mail" /> E-mail</a>}{selected.website && <a href={selected.website} target="_blank" rel="noreferrer"><Icon name="globe" /> Site</a>}{selected.instagram && <a href={selected.instagram} target="_blank" rel="noreferrer"><Icon name="instagram" /> Instagram</a>}{selected.googleMapsUrl && <a href={selected.googleMapsUrl} target="_blank" rel="noreferrer"><Icon name="location" /> Maps</a>}</div></section>
          <section className="lead-detail-section"><h3>Empresa</h3><dl><div><dt>CNPJ</dt><dd>{selected.cnpj || 'Não informado'}</dd></div><div><dt>CNAE</dt><dd>{selected.cnae ? `${selected.cnae} · ${selected.cnaeDescription || ''}` : 'Não informado'}</dd></div><div><dt>Porte</dt><dd>{selected.companySize || 'Não informado'}</dd></div><div><dt>Capital social</dt><dd>{selected.capitalSocial ? currency(selected.capitalSocial) : 'Não informado'}</dd></div><div><dt>Tributação</dt><dd>{selected.taxSummary || 'Não identificada'}</dd></div><div><dt>Natureza jurídica</dt><dd>{selected.legalNature || 'Não informada'}</dd></div><div className="is-wide"><dt>Endereço</dt><dd>{selected.address || 'Não informado'}</dd></div></dl></section>
          {Array.isArray(selected.partners) && selected.partners.length > 0 && <section className="lead-detail-section"><h3>Sócios públicos</h3><div className="lead-partner-list">{selected.partners.map((partner, index) => <div key={`${partner.name}-${index}`}><strong>{partner.name}</strong><span>{partner.qualification || 'Qualificação não informada'}</span></div>)}</div></section>}
          {selected.notes && <section className="lead-detail-section"><h3>Contexto comercial</h3><pre>{selected.notes}</pre></section>}
        </>}
      </aside>

      {toast && <div className="admin-toast lead-kanban-toast" role="status"><Icon name="check-circle" /> {toast}</div>}
      {loading && <span className="admin-refreshing" aria-label="Atualizando"><i /></span>}
    </main>
  );
}
