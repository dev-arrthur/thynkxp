'use client';

import { FormEvent, useMemo, useState } from 'react';
import Icon from './Icon';
import { NICHE_CATALOG, NICHE_CATEGORIES, normalizeNicheText, type LeadNiche } from '../lib/lead-niches';

type Partner = { name: string; qualification: string; joinedAt: string };
type TaxRegime = { year: number; form: string; filings: number };
type ProviderStatus = { id: string; label: string; enabled: boolean; ok: boolean; detail: string };
type City = { id: number; name: string };
type StateOption = { uf: string; name: string; x: number; y: number };

type SelectedNiche = LeadNiche & { custom?: boolean };

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
  matchedNiches?: string[];
};

type Criteria = {
  segment?: string;
  city?: string;
  uf?: string;
  cnaes?: { code: string; description: string }[];
};

type SearchPayload = {
  error?: string;
  prospects?: Prospect[];
  cursor?: string | null;
  criteria?: Criteria;
  providers?: ProviderStatus[];
};

type Props = { onLeadAdded?: () => void | Promise<void> };
type Filter = 'todos' | 'quente' | 'contato' | 'site' | 'instagram';

const MAX_NICHES = 5;
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
    segment_required: 'Selecione pelo menos um nicho.', city_required: 'Selecione uma cidade.', invalid_uf: 'Selecione um estado válido.',
    segment_not_found: 'Um dos nichos não pôde ser relacionado a um CNAE. Tente outro termo ou informe um CNAE manualmente.',
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

function mergeProspects(base: Prospect[], incoming: Prospect[]) {
  const map = new Map<string, Prospect>();
  [...base, ...incoming].forEach((item) => {
    const current = map.get(item.id);
    if (!current) { map.set(item.id, item); return; }
    map.set(item.id, {
      ...(item.score > current.score ? current : item),
      ...(item.score > current.score ? item : current),
      matchedNiches: [...new Set([...(current.matchedNiches || []), ...(item.matchedNiches || [])])],
      reasons: [...new Set([...(current.reasons || []), ...(item.reasons || [])])].slice(0, 10),
      digitalSources: [...new Set([...(current.digitalSources || []), ...(item.digitalSources || [])])],
    });
  });
  return [...map.values()].sort((a, b) => b.score - a.score || b.capitalSocial - a.capitalSocial);
}

function mergeProviders(groups: ProviderStatus[][]) {
  const map = new Map<string, ProviderStatus & { total: number; successes: number }>();
  groups.flat().forEach((provider) => {
    const current = map.get(provider.id);
    if (!current) {
      map.set(provider.id, { ...provider, total: 1, successes: provider.ok ? 1 : 0 });
      return;
    }
    current.total += 1;
    if (provider.ok) current.successes += 1;
    current.enabled = current.enabled || provider.enabled;
    current.ok = current.ok || provider.ok;
  });
  return [...map.values()].map(({ total, successes, ...provider }) => ({
    ...provider,
    detail: total > 1 && provider.enabled ? `${successes}/${total} consultas concluídas` : provider.detail,
  }));
}

export default function AdminProspector({ onLeadAdded }: Props) {
  const [step, setStep] = useState(1);
  const [uf, setUf] = useState('');
  const [city, setCity] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [selectedNiches, setSelectedNiches] = useState<SelectedNiche[]>([]);
  const [nicheQuery, setNicheQuery] = useState('');
  const [nicheCategory, setNicheCategory] = useState<string>('Todos');
  const [customNiche, setCustomNiche] = useState('');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [criteria, setCriteria] = useState<Criteria | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [cursors, setCursors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');

  const filteredCities = useMemo(() => {
    const query = normalizeNicheText(cityQuery);
    if (!query) return cities.slice(0, 36);
    return cities.filter((item) => normalizeNicheText(item.name).includes(query)).slice(0, 60);
  }, [cities, cityQuery]);

  const filteredNiches = useMemo(() => {
    const query = normalizeNicheText(nicheQuery);
    return NICHE_CATALOG.filter((item) => {
      const categoryMatch = nicheCategory === 'Todos' || item.category === nicheCategory;
      const text = normalizeNicheText([item.label, item.description, item.category, item.searchTerm, ...item.tags].join(' '));
      return categoryMatch && (!query || text.includes(query));
    });
  }, [nicheCategory, nicheQuery]);

  const popularNiches = useMemo(() => NICHE_CATALOG.filter((item) => item.popular).slice(0, 14), []);
  const selectedNicheIds = useMemo(() => new Set(selectedNiches.map((item) => item.id)), [selectedNiches]);

  const visible = useMemo(() => prospects.filter((prospect) => {
    if (filter === 'quente') return prospect.qualification === 'quente';
    if (filter === 'contato') return Boolean(prospect.phone || prospect.email);
    if (filter === 'site') return Boolean(prospect.website);
    if (filter === 'instagram') return Boolean(prospect.instagram);
    return true;
  }), [prospects, filter]);

  const selectedProspects = useMemo(() => prospects.filter((prospect) => selected.has(prospect.id)), [prospects, selected]);
  const hasMore = useMemo(() => Object.values(cursors).some(Boolean), [cursors]);

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

  function toggleNiche(niche: LeadNiche) {
    setError('');
    setSelectedNiches((current) => {
      if (current.some((item) => item.id === niche.id)) return current.filter((item) => item.id !== niche.id);
      if (current.length >= MAX_NICHES) { setError(`Selecione no máximo ${MAX_NICHES} nichos por busca para manter a qualidade e a velocidade do enriquecimento.`); return current; }
      return [...current, niche];
    });
  }

  function addCustomNiche() {
    const value = customNiche.trim();
    if (value.length < 2) return;
    const id = `custom-${normalizeNicheText(value).replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`;
    if (selectedNicheIds.has(id)) { setCustomNiche(''); return; }
    if (selectedNiches.length >= MAX_NICHES) { setError(`Você já selecionou ${MAX_NICHES} nichos. Remova um para adicionar outro.`); return; }
    setSelectedNiches((current) => [...current, { id, label: value, category: 'Personalizado', searchTerm: value, description: 'Nicho ou CNAE definido manualmente.', tags: [value], custom: true }]);
    setCustomNiche(''); setError('');
  }

  async function runSearch(event?: FormEvent<HTMLFormElement>, next = false) {
    event?.preventDefault();
    if (!uf || !city || !selectedNiches.length) return;
    setError(''); setNotice(''); setLoading(true);
    if (!next) { setSelected(new Set()); setProviders([]); setProspects([]); }

    const targets = next ? selectedNiches.filter((niche) => Boolean(cursors[niche.id])) : selectedNiches;
    if (!targets.length) { setLoading(false); return; }

    try {
      const settled = await Promise.allSettled(targets.map(async (niche) => {
        const params = new URLSearchParams({ segment: niche.searchTerm, city, uf });
        if (next && cursors[niche.id]) params.set('cursor', cursors[niche.id]);
        const response = await fetch(`/api/prospects?${params.toString()}`, { cache: 'no-store' });
        if (response.status === 401) { window.location.href = '/admin/login'; throw new Error('unauthorized'); }
        const data = await response.json().catch(() => ({})) as SearchPayload;
        if (!response.ok) throw new Error(data.error || 'search_failed');
        return { niche, data };
      }));

      const successes = settled.filter((result): result is PromiseFulfilledResult<{ niche: SelectedNiche; data: SearchPayload }> => result.status === 'fulfilled').map((result) => result.value);
      const failures = settled.filter((result) => result.status === 'rejected');
      if (!successes.length) {
        const reason = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected')?.reason;
        throw reason instanceof Error ? reason : new Error('search_failed');
      }

      const incoming = successes.flatMap(({ niche, data }) => (Array.isArray(data.prospects) ? data.prospects : []).map((prospect) => ({ ...prospect, matchedNiches: [niche.label] })));
      setProspects((current) => mergeProspects(next ? current : [], incoming));

      const nextCursors = next ? { ...cursors } : {} as Record<string, string>;
      successes.forEach(({ niche, data }) => { nextCursors[niche.id] = data.cursor || ''; });
      setCursors(nextCursors);
      setProviders(mergeProviders(successes.map(({ data }) => data.providers || [])));

      const cnaeMap = new Map<string, { code: string; description: string }>();
      successes.forEach(({ data }) => data.criteria?.cnaes?.forEach((item) => cnaeMap.set(item.code, item)));
      setCriteria({ segment: selectedNiches.map((item) => item.label).join(', '), city, uf, cnaes: [...cnaeMap.values()] });
      setStep(4);

      if (!next && incoming.length === 0) setNotice('Nenhuma empresa ativa encontrada para os nichos e região selecionados.');
      else if (failures.length) setNotice(`A busca foi concluída em ${successes.length} de ${targets.length} nichos. ${failures.length} consulta${failures.length === 1 ? '' : 's'} falhou${failures.length === 1 ? '' : 'ram'} sem interromper os demais resultados.`);
    } catch (searchError) {
      if ((searchError as Error).message !== 'unauthorized') setError(errorMessage(searchError instanceof Error ? searchError.message : 'search_failed'));
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
        body: JSON.stringify({ prospects: selectedProspects, criteria: criteria || { segment: selectedNiches.map((item) => item.label).join(', '), city, uf } }),
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
    setStep(1); setUf(''); setCity(''); setCityQuery(''); setCities([]); setSelectedNiches([]); setNicheQuery(''); setNicheCategory('Todos'); setCustomNiche(''); setProspects([]); setCriteria(null); setProviders([]); setCursors({}); setSelected(new Set()); setError(''); setNotice(''); setFilter('todos');
  }

  return (
    <section className="admin-prospector radar-wizard">
      <div className="radar-progress" aria-label={`Etapa ${step} de 4`}>
        {[1, 2, 3, 4].map((item) => <button type="button" key={item} className={`${step === item ? 'is-active' : ''} ${step > item ? 'is-complete' : ''}`} disabled={item > step || (item === 2 && !uf) || (item === 3 && !city) || (item === 4 && !prospects.length)} onClick={() => item < step && setStep(item)}><i>{step > item ? <Icon name="check" size={14} /> : item}</i><span>{['Estado', 'Cidade', 'Nichos', 'Resultados'][item - 1]}</span></button>)}
      </div>

      <div className="prospector-intro radar-wizard-intro">
        <div><span className="admin-eyebrow">PROSPECÇÃO B2B / INTELIGÊNCIA COMERCIAL</span><h2>Construa a busca em quatro passos.</h2><p>Escolha a região, combine até cinco nichos e deixe o Radar cruzar cadastro empresarial, sinais digitais e presença local para priorizar oportunidades.</p></div>
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

      {step === 3 && <section className="radar-step-card radar-niche-modern">
        <StepHeader number={3} title={`Quais mercados você quer mapear em ${city}/${uf}?`} description={`Escolha até ${MAX_NICHES} nichos. Você pode combinar segmentos relacionados ou pesquisar qualquer atividade/CNAE manualmente.`} />
        <div className="radar-selection-summary is-double"><button type="button" onClick={() => setStep(1)}><Icon name="location" /><span><small>Estado</small><strong>{uf}</strong></span><em>Alterar</em></button><button type="button" onClick={() => setStep(2)}><Icon name="globe" /><span><small>Cidade</small><strong>{city}</strong></span><em>Alterar</em></button></div>

        <div className="radar-niche-selected-panel">
          <div><small>Seleção atual</small><strong>{selectedNiches.length ? `${selectedNiches.length} de ${MAX_NICHES} nichos escolhidos` : 'Nenhum nicho selecionado'}</strong><em>O Radar cruza cada mercado separadamente e remove empresas duplicadas por CNPJ.</em></div>
          {selectedNiches.length > 0 && <div className="radar-selected-chips">{selectedNiches.map((niche) => <button type="button" key={niche.id} onClick={() => setSelectedNiches((current) => current.filter((item) => item.id !== niche.id))}>{niche.label}<Icon name="x" size={12} /></button>)}</div>}
        </div>

        <div className="radar-niche-popular"><span>Nichos mais usados</span><div>{popularNiches.map((niche) => <button type="button" className={selectedNicheIds.has(niche.id) ? 'is-selected' : ''} onClick={() => toggleNiche(niche)} key={niche.id}><Icon name={selectedNicheIds.has(niche.id) ? 'check-circle' : 'plus'} size={13} />{niche.label}</button>)}</div></div>

        <div className="radar-niche-searchbar"><label><Icon name="search" /><input value={nicheQuery} onChange={(event) => setNicheQuery(event.target.value)} placeholder="Buscar nicho, atividade ou palavra-chave..." /></label><button type="button" onClick={() => { setNicheQuery(''); setNicheCategory('Todos'); }}><Icon name="x" size={13} /> Limpar filtros</button></div>

        <div className="radar-niche-category-tabs">{NICHE_CATEGORIES.map((category) => <button type="button" className={nicheCategory === category ? 'is-active' : ''} onClick={() => setNicheCategory(category)} key={category}>{category}</button>)}</div>

        <div className="radar-niche-section-head"><div><strong>{nicheCategory === 'Todos' ? 'Catálogo completo de mercados' : nicheCategory}</strong><small>Selecione os segmentos mais alinhados com a campanha comercial.</small></div><span>{filteredNiches.length} nicho{filteredNiches.length === 1 ? '' : 's'} encontrado{filteredNiches.length === 1 ? '' : 's'}</span></div>
        <div className="radar-niche-catalog">{filteredNiches.map((niche) => {
          const chosen = selectedNicheIds.has(niche.id);
          return <button type="button" className={`radar-niche-card ${chosen ? 'is-selected' : ''}`} onClick={() => toggleNiche(niche)} key={niche.id}><i><Icon name={chosen ? 'check' : 'briefcase'} size={15} /></i><span><b>{niche.label}</b><small>{niche.description}</small></span><em>{chosen ? 'Selecionado' : niche.category}</em></button>;
        })}</div>
        {!filteredNiches.length && <div className="prospector-empty is-compact"><h3>Nenhum nicho no catálogo</h3><p>Use o campo personalizado abaixo para pesquisar essa atividade diretamente.</p></div>}

        <div className="radar-custom-niche"><label><span>Não encontrou? Adicione um nicho ou CNAE manualmente</span><div><Icon name="plus" /><input value={customNiche} onChange={(event) => setCustomNiche(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomNiche(); } }} placeholder="Ex.: lavanderia, coworking, 9601701..." maxLength={100} /></div></label><button type="button" onClick={addCustomNiche} disabled={customNiche.trim().length < 2}>Adicionar à seleção</button></div>

        <div className="radar-search-explainer"><div><Icon name="server" /><span><strong>Cadastro empresarial</strong><small>CNPJ, CNAE, porte, capital, QSA, Simples/MEI e regime quando publicado.</small></span></div><div><Icon name="globe" /><span><strong>Presença digital</strong><small>Site, Instagram, presença local e reputação quando os provedores estiverem configurados.</small></span></div><div><Icon name="sparkles" /><span><strong>Busca multissegmento</strong><small>Os mercados são consultados individualmente e consolidados em uma única lista sem duplicar CNPJs.</small></span></div></div>

        <div className="radar-niche-launch"><div><strong>{selectedNiches.length ? `Pronto para pesquisar ${selectedNiches.length} nicho${selectedNiches.length === 1 ? '' : 's'}.` : 'Selecione pelo menos um nicho para continuar.'}</strong><small>{selectedNiches.length >= MAX_NICHES ? `Limite de ${MAX_NICHES} atingido para preservar velocidade e relevância.` : 'Você pode combinar mercados complementares para ampliar a prospecção.'}</small></div><button type="button" onClick={() => runSearch(undefined, false)} disabled={loading || !selectedNiches.length}><Icon name="sparkles" />{loading ? 'Cruzando mercados...' : 'Iniciar busca completa'}</button></div>
      </section>}

      {step === 4 && <section className="radar-results-step">
        <div className="radar-results-head"><div><button type="button" className="radar-back-step" onClick={() => setStep(3)}><Icon name="chevron-right" size={14} /> Ajustar nichos</button><StepHeader number={4} title="Escolha os leads que entram no seu funil." description={`${prospects.length} empresas únicas carregadas para ${selectedNiches.map((item) => item.label).join(', ')} em ${criteria?.city || city}/${criteria?.uf || uf}.`} /></div><button type="button" className="radar-restart" onClick={restart}><Icon name="search" /> Nova busca</button></div>

        <div className="radar-provider-strip"><div><span>Fontes desta busca</span><small>O Radar continua mesmo se uma fonte opcional estiver indisponível.</small></div><div>{providers.map((provider) => <span className={`${provider.enabled && provider.ok ? 'is-ok' : provider.enabled ? 'is-error' : 'is-off'}`} key={provider.id}><i /> <b>{provider.label}</b><em>{provider.detail}</em></span>)}</div></div>

        <div className="prospector-toolbar radar-results-toolbar"><div className="radar-filter-row">{([['todos', 'Todos'], ['quente', 'Quentes'], ['contato', 'Com contato'], ['site', 'Com site'], ['instagram', 'Com Instagram']] as [Filter, string][]).map(([key, label]) => <button type="button" className={filter === key ? 'is-active' : ''} onClick={() => setFilter(key)} key={key}>{label}</button>)}</div><div className="radar-select-tools"><button type="button" onClick={toggleAllVisible}><Icon name="check-circle" size={15} />{visible.length > 0 && visible.every((item) => selected.has(item.id)) ? 'Desmarcar visíveis' : 'Selecionar visíveis'}</button><span>{selected.size} selecionado{selected.size === 1 ? '' : 's'}</span></div></div>

        {visible.length > 0 ? <div className="prospect-grid radar-prospect-grid">{visible.map((prospect) => {
          const whatsapp = whatsappNumber(prospect.phone); const checked = selected.has(prospect.id);
          return <article className={`prospect-card radar-prospect-card ${checked ? 'is-selected' : ''}`} key={prospect.id}>
            <button type="button" className="radar-card-check" aria-pressed={checked} onClick={() => toggleProspect(prospect.id)}><span>{checked && <Icon name="check" size={14} />}</span>{checked ? 'Selecionado' : 'Selecionar lead'}</button>
            {prospect.matchedNiches?.length ? <div className="radar-match-tags">{prospect.matchedNiches.map((niche) => <span key={niche}>Encontrado em: {niche}</span>)}</div> : null}
            <div className="prospect-card-top"><div className="prospect-score"><strong>{prospect.score}</strong><span>/100</span><em className={`is-${prospect.qualification}`}>{prospect.qualification}</em></div><div className="prospect-company"><span>{prospect.cnpj}</span><h3>{prospect.name}</h3><p>{prospect.legalName && prospect.legalName !== prospect.name ? prospect.legalName : prospect.cnaeDescription}</p></div></div>
            <div className="radar-digital-row">{prospect.website ? <a href={prospect.website} target="_blank" rel="noreferrer"><Icon name="globe" size={14} /> Site</a> : <span><Icon name="globe" size={14} /> Sem site identificado</span>}{prospect.instagram ? <a href={prospect.instagram} target="_blank" rel="noreferrer"><Icon name="instagram" size={14} /> Instagram</a> : <span><Icon name="instagram" size={14} /> Instagram não identificado</span>}{prospect.googleMapsUrl && <a href={prospect.googleMapsUrl} target="_blank" rel="noreferrer"><Icon name="location" size={14} /> Maps {prospect.googleRating ? `${prospect.googleRating.toFixed(1)} (${prospect.googleRatingCount})` : ''}</a>}</div>
            <div className="prospect-signals"><span><small>Porte</small><strong>{prospect.porte || 'Não informado'}</strong></span><span><small>Capital social</small><strong>{prospect.capitalSocial ? money(prospect.capitalSocial) : 'Não informado'}</strong></span><span><small>Tributação</small><strong>{prospect.taxSummary || 'Não identificada'}</strong></span></div>
            <div className="prospect-details"><p><Icon name="location" /><span>{prospect.address || `${prospect.city}/${prospect.uf}`}</span></p>{prospect.phone && <p><Icon name="phone" /><span>{prospect.phone}</span></p>}{prospect.email && <p><Icon name="mail" /><span>{prospect.email}</span></p>}<p><Icon name="briefcase" /><span>{prospect.cnae} · {prospect.cnaeDescription}</span></p></div>
            <details className="radar-company-intel"><summary><span><Icon name="layers" size={15} /> Inteligência empresarial</span><Icon name="chevron-right" size={14} /></summary><div><p><strong>Natureza jurídica</strong><span>{prospect.legalNature || 'Não informada'}</span></p><p><strong>Início das atividades</strong><span>{prospect.openedAt ? date(prospect.openedAt) : 'Não informado'}</span></p><p><strong>Simples / MEI</strong><span>{prospect.mei === true ? 'Optante MEI' : prospect.simples === true ? 'Optante pelo Simples' : prospect.simples === false ? 'Não optante pelo Simples na base' : 'Não informado'}</span></p><p><strong>Sócios públicos</strong><span>{prospect.partners.length ? prospect.partners.map((partner) => `${partner.name}${partner.qualification ? ` · ${partner.qualification}` : ''}`).join(' | ') : 'Nenhum QSA disponível na fonte'}</span></p>{prospect.taxRegime.length > 0 && <p><strong>Histórico tributário publicado</strong><span>{prospect.taxRegime.map((item) => `${item.year}: ${item.form}`).join(' | ')}</span></p>}</div></details>
            <div className="prospect-reasons">{prospect.reasons.map((reason) => <span key={reason}><Icon name="check-circle" size={13} />{reason}</span>)}</div>
            <div className="prospect-actions">{prospect.email && <a href={`mailto:${prospect.email}`}><Icon name="mail" /> E-mail</a>}{whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> WhatsApp</a>}<button type="button" className="is-primary" onClick={() => toggleProspect(prospect.id)}><Icon name={checked ? 'check-circle' : 'plus'} />{checked ? 'Selecionado' : 'Selecionar'}</button></div>
          </article>;
        })}</div> : <div className="prospector-empty"><span><Icon name="filter" size={28} /></span><h3>Nenhum lead nesse filtro</h3><p>Ajuste os filtros ou carregue mais empresas.</p></div>}

        {hasMore && <div className="prospector-more"><button type="button" onClick={() => runSearch(undefined, true)} disabled={loading}>{loading ? 'Carregando mercados...' : 'Carregar mais empresas dos nichos'} <Icon name="arrow-right" /></button></div>}

        <div className={`radar-selection-bar ${selected.size ? 'is-visible' : ''}`}><div><span><strong>{selected.size}</strong> lead{selected.size === 1 ? '' : 's'} selecionado{selected.size === 1 ? '' : 's'}</span><small>Os registros existentes serão preservados; novos entram no Kanban como Novo ou Qualificado.</small></div><button type="button" onClick={importSelected} disabled={!selected.size || importing}><Icon name="workflow" />{importing ? 'Enviando ao CRM...' : `Enviar ${selected.size || ''} para o Kanban`}</button></div>
      </section>}

      <div className="prospector-compliance"><Icon name="shield" /><p><strong>Uso responsável.</strong> O Radar trabalha com dados empresariais públicos e presença digital pública/profissional. CPF de sócios não é exibido nem armazenado. Valide a abordagem comercial, respeite solicitações de não contato e evite disparos automatizados em massa.</p></div>
    </section>
  );
}
