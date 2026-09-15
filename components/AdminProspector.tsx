'use client';

import { FormEvent, useMemo, useState } from 'react';
import Icon from './Icon';

type Partner = { name: string; qualification: string; joinedAt: string };
type TaxRegime = { year: number; form: string; filings: number };
type ProviderStatus = { id: string; label: string; enabled: boolean; ok: boolean; detail: string };
type City = { id: number; name: string };
type StateOption = { uf: string; name: string; x: number; y: number };

export type Prospect = {
  id: string;
  cnpj: string;
  name: string;
  legalName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  uf: string;
  cnae: string;
  cnaeDescription: string;
  secondaryCnaes?: { code: string; description: string }[];
  capitalSocial: number;
  porte: string;
  legalNature?: string;
  openedAt: string;
  partners: Partner[];
  taxRegime: TaxRegime[];
  simples: boolean | null;
  mei: boolean | null;
  taxSummary: string;
  website: string;
  instagram: string;
  facebook: string;
  googleMapsUrl: string;
  googlePlaceId: string;
  googleRating: number;
  googleRatingCount: number;
  digitalSources: string[];
  score: number;
  qualification: 'quente' | 'morno' | 'explorar';
  reasons: string[];
};

type Criteria = {
  segment?: string;
  city?: string;
  uf?: string;
  cnaes?: { code: string; description: string }[];
};

type Props = { onLeadAdded?: () => void | Promise<void> };

type Filter = 'todos' | 'quente' | 'contato' | 'site' | 'instagram';

const STATES: StateOption[] = [
  { uf: 'RR', name: 'Roraima', x: 248, y: 70 }, { uf: 'AP', name: 'Amapá', x: 398, y: 78 },
  { uf: 'AM', name: 'Amazonas', x: 188, y: 154 }, { uf: 'PA', name: 'Pará', x: 350, y: 158 },
  { uf: 'AC', name: 'Acre', x: 82, y: 232 }, { uf: 'RO', name: 'Rondônia', x: 174, y: 250 },
  { uf: 'MT', name: 'Mato Grosso', x: 270, y: 286 }, { uf: 'TO', name: 'Tocantins', x: 370, y: 270 },
  { uf: 'MA', name: 'Maranhão', x: 438, y: 206 }, { uf: 'PI', name: 'Piauí', x: 460, y: 253 },
  { uf: 'CE', name: 'Ceará', x: 520, y: 225 }, { uf: 'RN', name: 'Rio Grande do Norte', x: 568, y: 240 },
  { uf: 'PB', name: 'Paraíba', x: 570, y: 266 }, { uf: 'PE', name: 'Pernambuco', x: 542, y: 290 },
  { uf: 'AL', name: 'Alagoas', x: 548, y: 316 }, { uf: 'SE', name: 'Sergipe', x: 532, y: 340 },
  { uf: 'BA', name: 'Bahia', x: 462, y: 340 }, { uf: 'GO', name: 'Goiás', x: 340, y: 360 },
  { uf: 'DF', name: 'Distrito Federal', x: 370, y: 350 }, { uf: 'MS', name: 'Mato Grosso do Sul', x: 258, y: 414 },
  { uf: 'MG', name: 'Minas Gerais', x: 408, y: 410 }, { uf: 'ES', name: 'Espírito Santo', x: 493, y: 414 },
  { uf: 'RJ', name: 'Rio de Janeiro', x: 450, y: 458 }, { uf: 'SP', name: 'São Paulo', x: 348, y: 463 },
  { uf: 'PR', name: 'Paraná', x: 318, y: 510 }, { uf: 'SC', name: 'Santa Catarina', x: 330, y: 548 },
  { uf: 'RS', name: 'Rio Grande do Sul', x: 295, y: 590 },
];

const NICHES = [
  ['barbearia', 'Barbearias'], ['clinica', 'Clínicas'], ['odontologia', 'Odontologia'], ['academia', 'Academias'],
  ['contabilidade', 'Contabilidade'], ['restaurante', 'Restaurantes'], ['petshop', 'Pet shops'], ['publicidade', 'Publicidade'], ['software', 'Software'],
];

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function date(value: string) {
  if (!value) return 'Não informada';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(parsed);
}

function whatsappNumber(phone: string) {
  const raw = phone.replace(/\D/g, '');
  if (raw.length === 10 || raw.length === 11) return `55${raw}`;
  return raw;
}

function errorMessage(code: string) {
  const messages: Record<string, string> = {
    segment_required: 'Informe o nicho ou um código CNAE.', city_required: 'Selecione uma cidade.', invalid_uf: 'Selecione um estado válido.',
    segment_not_found: 'Não consegui relacionar esse nicho a um CNAE. Tente um termo mais específico ou informe o código CNAE.',
    city_not_found: 'Cidade não encontrada nessa UF.', cities_unavailable: 'Não foi possível carregar as cidades desse estado agora.',
    too_many_requests: 'Muitas buscas em sequência. Aguarde um pouco antes de pesquisar novamente.',
    prospect_search_unavailable: 'As fontes de prospecção estão indisponíveis agora. Tente novamente em instantes.',
    lead_import_failed: 'Não foi possível enviar os leads para o CRM agora.',
  };
  return messages[code] || 'Não foi possível concluir essa operação.';
}

function BrazilStateMap({ selected, onSelect }: { selected: string; onSelect: (state: StateOption) => void }) {
  return (
    <div className="radar-map-wrap">
      <svg className="radar-brazil-map" viewBox="0 0 640 650" role="img" aria-label="Mapa interativo do Brasil para seleção de estado">
        <path className="radar-map-silhouette" d="M232 35 334 38 377 69 416 73 443 107 487 120 516 155 573 184 601 225 592 279 559 319 550 361 511 387 500 432 463 466 432 492 403 532 361 558 332 617 280 629 249 593 236 550 202 526 191 484 158 457 148 411 118 382 126 337 94 303 88 252 61 219 79 180 113 167 129 122 171 105 184 65Z" />
        {STATES.map((state) => <g key={state.uf} className={`radar-state-marker ${selected === state.uf ? 'is-selected' : ''}`} transform={`translate(${state.x} ${state.y})`} role="button" tabIndex={0} aria-label={`Selecionar ${state.name}`} onClick={() => onSelect(state)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(state); }}>
          <circle r={state.uf === 'DF' ? 17 : 19} /><text textAnchor="middle" dominantBaseline="central">{state.uf}</text><title>{state.name}</title>
        </g>)}
      </svg>
      <div className="radar-map-caption"><Icon name="location" size={16} /><span>{selected ? `${STATES.find((state) => state.uf === selected)?.name} selecionado` : 'Clique em um estado para continuar'}</span></div>
    </div>
  );
}

function StepHeader({ number, title, description }: { number: number; title: string; description: string }) {
  return <div className="radar-step-heading"><span>ETAPA {String(number).padStart(2, '0')}</span><h3>{title}</h3><p>{description}</p></div>;
}

export default function AdminProspector({ onLeadAdded }: Props) {
  const [step, setStep] = useState(1);
  const [uf, setUf] = useState('');
  const [city, setCity] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [segment, setSegment] = useState('');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [criteria, setCriteria] = useState<Criteria | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [cursor, setCursor] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');

  const filteredCities = useMemo(() => {
    const query = cityQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (!query) return cities.slice(0, 36);
    return cities.filter((item) => item.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query)).slice(0, 60);
  }, [cities, cityQuery]);

  const visible = useMemo(() => prospects.filter((prospect) => {
    if (filter === 'quente') return prospect.qualification === 'quente';
    if (filter === 'contato') return Boolean(prospect.phone || prospect.email);
    if (filter === 'site') return Boolean(prospect.website);
    if (filter === 'instagram') return Boolean(prospect.instagram);
    return true;
  }), [prospects, filter]);

  const selectedProspects = useMemo(() => prospects.filter((prospect) => selected.has(prospect.id)), [prospects, selected]);

  async function selectState(state: StateOption) {
    setUf(state.uf); setCity(''); setCityQuery(''); setCities([]); setError(''); setNotice(''); setStep(2); setCitiesLoading(true);
    try {
      const response = await fetch(`/api/prospects/cities?uf=${state.uf}`, { cache: 'no-store' });
      if (response.status === 401) { window.location.href = '/admin/login'; return; }
      const data = await response.json().catch(() => ({})) as { error?: string; cities?: City[] };
      if (!response.ok) throw new Error(data.error || 'cities_unavailable');
      setCities(Array.isArray(data.cities) ? data.cities : []);
    } catch (cityError) {
      setError(errorMessage(cityError instanceof Error ? cityError.message : 'cities_unavailable'));
    } finally { setCitiesLoading(false); }
  }

  function selectCity(item: City) {
    setCity(item.name); setCityQuery(item.name); setError(''); setNotice(''); setStep(3);
  }

  async function runSearch(event?: FormEvent<HTMLFormElement>, next = false) {
    event?.preventDefault();
    if (!uf || !city || segment.trim().length < 2) return;
    setError(''); setNotice(''); setLoading(true);
    if (!next) { setSelected(new Set()); setProviders([]); }
    try {
      const params = new URLSearchParams({ segment: segment.trim(), city, uf });
      if (next && cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/prospects?${params.toString()}`, { cache: 'no-store' });
      if (response.status === 401) { window.location.href = '/admin/login'; return; }
      const data = await response.json().catch(() => ({})) as { error?: string; prospects?: Prospect[]; cursor?: string | null; criteria?: Criteria; providers?: ProviderStatus[] };
      if (!response.ok) throw new Error(data.error || 'search_failed');
      const incoming = Array.isArray(data.prospects) ? data.prospects : [];
      setProspects((current) => next ? [...current, ...incoming.filter((item) => !current.some((existing) => existing.id === item.id))] : incoming);
      setCursor(data.cursor || ''); setCriteria(data.criteria || null); setProviders(data.providers || []); setStep(4);
      if (!next && incoming.length === 0) setNotice('Nenhuma empresa ativa encontrada para essa combinação de nicho e região.');
    } catch (searchError) {
      setError(errorMessage(searchError instanceof Error ? searchError.message : 'search_failed'));
    } finally { setLoading(false); }
  }

  function toggleProspect(id: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current); const allSelected = visible.length > 0 && visible.every((item) => next.has(item.id));
      visible.forEach((item) => allSelected ? next.delete(item.id) : next.add(item.id));
      return next;
    });
  }

  async function importSelected() {
    if (!selectedProspects.length) return;
    setImporting(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/leads/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: selectedProspects, criteria: criteria || { segment, city, uf } }),
      });
      if (response.status === 401) { window.location.href = '/admin/login'; return; }
      const data = await response.json().catch(() => ({})) as { error?: string; inserted?: number; existing?: number };
      if (!response.ok) throw new Error(data.error || 'lead_import_failed');
      setNotice(`${data.inserted || 0} lead${data.inserted === 1 ? '' : 's'} enviado${data.inserted === 1 ? '' : 's'} ao Kanban. ${data.existing || 0} já existia${data.existing === 1 ? '' : 'm'} no CRM.`);
      setSelected(new Set()); await onLeadAdded?.();
    } catch (importError) {
      setError(errorMessage(importError instanceof Error ? importError.message : 'lead_import_failed'));
    } finally { setImporting(false); }
  }

  function restart() {
    setStep(1); setUf(''); setCity(''); setCityQuery(''); setCities([]); setSegment(''); setProspects([]); setCriteria(null); setProviders([]); setCursor(''); setSelected(new Set()); setError(''); setNotice(''); setFilter('todos');
  }

  return (
    <section className="admin-prospector radar-wizard">
      <div className="radar-progress" aria-label={`Etapa ${step} de 4`}>
        {[1, 2, 3, 4].map((item) => <button type="button" key={item} className={`${step === item ? 'is-active' : ''} ${step > item ? 'is-complete' : ''}`} disabled={item > step || (item === 2 && !uf) || (item === 3 && !city) || (item === 4 && !prospects.length)} onClick={() => item < step && setStep(item)}><i>{step > item ? <Icon name="check" size={14} /> : item}</i><span>{['Estado', 'Cidade', 'Nicho', 'Resultados'][item - 1]}</span></button>)}
      </div>

      <div className="prospector-intro radar-wizard-intro">
        <div><span className="admin-eyebrow">PROSPECÇÃO B2B / INTELIGÊNCIA COMERCIAL</span><h2>Construa a busca em quatro passos.</h2><p>Escolha a região, defina o nicho e deixe o Radar cruzar cadastro empresarial, sinais digitais e presença local para priorizar oportunidades.</p></div>
        <div className="prospector-source"><Icon name="shield" /><span><strong>Dados empresariais + web</strong><small>Receita · IBGE · provedores configurados</small></span></div>
      </div>

      {error && <div className="prospector-message is-error"><Icon name="shield" /><span>{error}</span></div>}
      {notice && <div className="prospector-message"><Icon name="check-circle" /><span>{notice}</span>{step === 4 && <a href="/admin?section=leads">Abrir Kanban de Leads <Icon name="arrow-right" size={14} /></a>}</div>}

      {step === 1 && <section className="radar-step-card radar-state-step">
        <StepHeader number={1} title="Em qual estado vamos prospectar?" description="Selecione diretamente no mapa. A cidade será escolhida somente entre os municípios oficiais daquele estado." />
        <div className="radar-state-layout"><BrazilStateMap selected={uf} onSelect={selectState} /><div className="radar-state-list"><span>Ou escolha pela lista</span><div>{STATES.map((state) => <button type="button" className={uf === state.uf ? 'is-selected' : ''} onClick={() => selectState(state)} key={state.uf}><b>{state.uf}</b><span>{state.name}</span><Icon name="chevron-right" size={14} /></button>)}</div></div></div>
      </section>}

      {step === 2 && <section className="radar-step-card">
        <StepHeader number={2} title={`Qual cidade de ${STATES.find((state) => state.uf === uf)?.name || uf}?`} description="A lista vem do IBGE, evitando erros de escrita e garantindo que a busca use o município correto." />
        <div className="radar-selection-summary"><button type="button" onClick={() => setStep(1)}><Icon name="location" /><span><small>Estado</small><strong>{STATES.find((state) => state.uf === uf)?.name} · {uf}</strong></span><em>Alterar</em></button></div>
        <label className="radar-city-search"><Icon name="search" /><input value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} placeholder="Digite o nome da cidade" autoFocus /><span>{cities.length} municípios</span></label>
        {citiesLoading ? <div className="radar-step-loading"><i /><span>Carregando municípios do IBGE...</span></div> : <div className="radar-city-grid">{filteredCities.map((item) => <button type="button" key={item.id} onClick={() => selectCity(item)}><Icon name="location" size={15} /><span>{item.name}</span><Icon name="chevron-right" size={14} /></button>)}</div>}
        {!citiesLoading && cityQuery && !filteredCities.length && <div className="prospector-empty is-compact"><h3>Nenhuma cidade encontrada</h3><p>Tente outro trecho do nome.</p></div>}
      </section>}

      {step === 3 && <section className="radar-step-card">
        <StepHeader number={3} title={`O que você quer encontrar em ${city}/${uf}?`} description="Informe o nicho em linguagem natural ou use um CNAE. O Radar resolve a atividade econômica e busca as empresas ativas compatíveis." />
        <div className="radar-selection-summary is-double"><button type="button" onClick={() => setStep(1)}><Icon name="location" /><span><small>Estado</small><strong>{uf}</strong></span><em>Alterar</em></button><button type="button" onClick={() => setStep(2)}><Icon name="globe" /><span><small>Cidade</small><strong>{city}</strong></span><em>Alterar</em></button></div>
        <form className="radar-niche-form" onSubmit={(event) => runSearch(event, false)}><label><span>Nicho ou CNAE</span><div><Icon name="search" /><input value={segment} onChange={(event) => setSegment(event.target.value)} placeholder="Ex.: barbearia, clínica, academia, 9602501..." maxLength={100} autoFocus /></div></label><button type="submit" disabled={loading || segment.trim().length < 2}><Icon name="sparkles" />{loading ? 'Cruzando fontes...' : 'Iniciar busca completa'}</button></form>
        <div className="radar-niche-shortcuts">{NICHES.map(([value, label]) => <button type="button" className={segment === value ? 'is-selected' : ''} key={value} onClick={() => setSegment(value)}><Icon name="briefcase" size={15} /><span>{label}</span></button>)}</div>
        <div className="radar-search-explainer"><div><Icon name="server" /><span><strong>Cadastro empresarial</strong><small>CNPJ, CNAE, porte, capital, QSA, Simples/MEI e regime quando publicado.</small></span></div><div><Icon name="globe" /><span><strong>Presença digital</strong><small>Site, Instagram, presença local e reputação quando os provedores estiverem configurados.</small></span></div><div><Icon name="sparkles" /><span><strong>Score comercial</strong><small>Sinais cadastrais, contato, maturidade e presença digital viram uma prioridade de 0 a 100.</small></span></div></div>
      </section>}

      {step === 4 && <section className="radar-results-step">
        <div className="radar-results-head"><div><button type="button" className="radar-back-step" onClick={() => setStep(3)}><Icon name="chevron-right" size={14} /> Ajustar busca</button><StepHeader number={4} title="Escolha os leads que entram no seu funil." description={`${prospects.length} empresas carregadas para ${criteria?.segment || segment} em ${criteria?.city || city}/${criteria?.uf || uf}.`} /></div><button type="button" className="radar-restart" onClick={restart}><Icon name="search" /> Nova busca</button></div>

        <div className="radar-provider-strip"><div><span>Fontes desta busca</span><small>O Radar continua mesmo se uma fonte opcional estiver indisponível.</small></div><div>{providers.map((provider) => <span className={`${provider.enabled && provider.ok ? 'is-ok' : provider.enabled ? 'is-error' : 'is-off'}`} key={provider.id}><i /> <b>{provider.label}</b><em>{provider.detail}</em></span>)}</div></div>

        <div className="prospector-toolbar radar-results-toolbar"><div className="radar-filter-row">{([['todos', 'Todos'], ['quente', 'Quentes'], ['contato', 'Com contato'], ['site', 'Com site'], ['instagram', 'Com Instagram']] as [Filter, string][]).map(([key, label]) => <button type="button" className={filter === key ? 'is-active' : ''} onClick={() => setFilter(key)} key={key}>{label}</button>)}</div><div className="radar-select-tools"><button type="button" onClick={toggleAllVisible}><Icon name="check-circle" size={15} />{visible.length > 0 && visible.every((item) => selected.has(item.id)) ? 'Desmarcar visíveis' : 'Selecionar visíveis'}</button><span>{selected.size} selecionado{selected.size === 1 ? '' : 's'}</span></div></div>

        {visible.length > 0 ? <div className="prospect-grid radar-prospect-grid">{visible.map((prospect) => {
          const whatsapp = whatsappNumber(prospect.phone); const checked = selected.has(prospect.id);
          return <article className={`prospect-card radar-prospect-card ${checked ? 'is-selected' : ''}`} key={prospect.id}>
            <button type="button" className="radar-card-check" aria-pressed={checked} onClick={() => toggleProspect(prospect.id)}><span>{checked && <Icon name="check" size={14} />}</span>{checked ? 'Selecionado' : 'Selecionar lead'}</button>
            <div className="prospect-card-top"><div className="prospect-score"><strong>{prospect.score}</strong><span>/100</span><em className={`is-${prospect.qualification}`}>{prospect.qualification}</em></div><div className="prospect-company"><span>{prospect.cnpj}</span><h3>{prospect.name}</h3><p>{prospect.legalName && prospect.legalName !== prospect.name ? prospect.legalName : prospect.cnaeDescription}</p></div></div>
            <div className="radar-digital-row">{prospect.website ? <a href={prospect.website} target="_blank" rel="noreferrer"><Icon name="globe" size={14} /> Site</a> : <span><Icon name="globe" size={14} /> Sem site identificado</span>}{prospect.instagram ? <a href={prospect.instagram} target="_blank" rel="noreferrer"><Icon name="instagram" size={14} /> Instagram</a> : <span><Icon name="instagram" size={14} /> Instagram não identificado</span>}{prospect.googleMapsUrl && <a href={prospect.googleMapsUrl} target="_blank" rel="noreferrer"><Icon name="location" size={14} /> Maps {prospect.googleRating ? `${prospect.googleRating.toFixed(1)} (${prospect.googleRatingCount})` : ''}</a>}</div>
            <div className="prospect-signals"><span><small>Porte</small><strong>{prospect.porte || 'Não informado'}</strong></span><span><small>Capital social</small><strong>{prospect.capitalSocial ? money(prospect.capitalSocial) : 'Não informado'}</strong></span><span><small>Tributação</small><strong>{prospect.taxSummary || 'Não identificada'}</strong></span></div>
            <div className="prospect-details"><p><Icon name="location" /><span>{prospect.address || `${prospect.city}/${prospect.uf}`}</span></p>{prospect.phone && <p><Icon name="phone" /><span>{prospect.phone}</span></p>}{prospect.email && <p><Icon name="mail" /><span>{prospect.email}</span></p>}<p><Icon name="briefcase" /><span>{prospect.cnae} · {prospect.cnaeDescription}</span></p></div>
            <details className="radar-company-intel"><summary><span><Icon name="layers" size={15} /> Inteligência empresarial</span><Icon name="chevron-right" size={14} /></summary><div><p><strong>Natureza jurídica</strong><span>{prospect.legalNature || 'Não informada'}</span></p><p><strong>Início das atividades</strong><span>{prospect.openedAt ? date(prospect.openedAt) : 'Não informado'}</span></p><p><strong>Simples / MEI</strong><span>{prospect.mei === true ? 'Optante MEI' : prospect.simples === true ? 'Optante pelo Simples' : prospect.simples === false ? 'Não optante pelo Simples na base' : 'Não informado'}</span></p><p><strong>Sócios públicos</strong><span>{prospect.partners.length ? prospect.partners.map((partner) => `${partner.name}${partner.qualification ? ` · ${partner.qualification}` : ''}`).join(' | ') : 'Nenhum QSA disponível na fonte'}</span></p>{prospect.taxRegime.length > 0 && <p><strong>Histórico tributário publicado</strong><span>{prospect.taxRegime.map((item) => `${item.year}: ${item.form}`).join(' | ')}</span></p>}</div></details>
            <div className="prospect-reasons">{prospect.reasons.map((reason) => <span key={reason}><Icon name="check-circle" size={13} />{reason}</span>)}</div>
            <div className="prospect-actions">{prospect.email && <a href={`mailto:${prospect.email}`}><Icon name="mail" /> E-mail</a>}{whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> WhatsApp</a>}<button type="button" className="is-primary" onClick={() => toggleProspect(prospect.id)}><Icon name={checked ? 'check-circle' : 'plus'} />{checked ? 'Selecionado' : 'Selecionar'}</button></div>
          </article>;
        })}</div> : <div className="prospector-empty"><span><Icon name="filter" size={28} /></span><h3>Nenhum lead nesse filtro</h3><p>Ajuste os filtros ou carregue mais empresas.</p></div>}

        {cursor && <div className="prospector-more"><button type="button" onClick={() => runSearch(undefined, true)} disabled={loading}>{loading ? 'Carregando...' : 'Carregar mais empresas'} <Icon name="arrow-right" /></button></div>}

        <div className={`radar-selection-bar ${selected.size ? 'is-visible' : ''}`}><div><span><strong>{selected.size}</strong> lead{selected.size === 1 ? '' : 's'} selecionado{selected.size === 1 ? '' : 's'}</span><small>Os registros existentes serão preservados; novos entram no Kanban como Novo ou Qualificado.</small></div><button type="button" onClick={importSelected} disabled={!selected.size || importing}><Icon name="workflow" />{importing ? 'Enviando ao CRM...' : `Enviar ${selected.size || ''} para o Kanban`}</button></div>
      </section>}

      <div className="prospector-compliance"><Icon name="shield" /><p><strong>Uso responsável.</strong> O Radar trabalha com dados empresariais públicos e presença digital pública/profissional. CPF de sócios não é exibido nem armazenado. Valide a abordagem comercial, respeite solicitações de não contato e evite disparos automatizados em massa.</p></div>
    </section>
  );
}
