'use client';

import { FormEvent, useMemo, useState } from 'react';
import Icon from './Icon';

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
  capitalSocial: number;
  porte: string;
  openedAt: string;
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

type Props = {
  onLeadAdded?: () => void | Promise<void>;
};

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
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
    segment_required: 'Informe o segmento ou um código CNAE.',
    city_required: 'Informe a cidade da busca.',
    invalid_uf: 'Informe uma UF válida com duas letras.',
    segment_not_found: 'Não consegui relacionar esse segmento a um CNAE. Tente um termo mais específico ou informe o código CNAE.',
    city_not_found: 'Cidade não encontrada nessa UF. Confira a escrita e tente novamente.',
    too_many_requests: 'Muitas buscas em sequência. Aguarde um pouco antes de pesquisar novamente.',
    prospect_search_unavailable: 'A fonte pública de empresas está indisponível agora. Tente novamente em instantes.',
  };
  return messages[code] || 'Não foi possível concluir a busca de empresas.';
}

export default function AdminProspector({ onLeadAdded }: Props) {
  const [segment, setSegment] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('MG');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [criteria, setCriteria] = useState<Criteria | null>(null);
  const [cursor, setCursor] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'todos' | 'quente' | 'contato'>('todos');

  const visible = useMemo(() => prospects.filter((prospect) => {
    if (filter === 'quente') return prospect.qualification === 'quente';
    if (filter === 'contato') return Boolean(prospect.phone || prospect.email);
    return true;
  }), [prospects, filter]);

  async function runSearch(event?: FormEvent<HTMLFormElement>, next = false) {
    event?.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const params = new URLSearchParams({ segment: segment.trim(), city: city.trim(), uf: uf.trim().toUpperCase() });
      if (next && cursor) params.set('cursor', cursor);
      const response = await fetch(`/api/prospects?${params.toString()}`, { cache: 'no-store' });
      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await response.json().catch(() => ({})) as {
        error?: string;
        prospects?: Prospect[];
        cursor?: string | null;
        criteria?: Criteria;
      };
      if (!response.ok) throw new Error(data.error || 'search_failed');

      const incoming = Array.isArray(data.prospects) ? data.prospects : [];
      setProspects((current) => next
        ? [...current, ...incoming.filter((item) => !current.some((existing) => existing.id === item.id))]
        : incoming);
      setCursor(data.cursor || '');
      setCriteria(data.criteria || null);
      if (!next && incoming.length === 0) setNotice('Nenhuma empresa ativa encontrada para essa combinação de segmento e região.');
    } catch (searchError) {
      setError(errorMessage(searchError instanceof Error ? searchError.message : 'search_failed'));
    } finally {
      setLoading(false);
    }
  }

  async function addToCrm(prospect: Prospect) {
    setAdding(prospect.id);
    setError('');
    setNotice('');
    try {
      const context = [
        `Lead encontrado pelo Radar de Leads.`,
        `CNPJ: ${prospect.cnpj}.`,
        prospect.legalName && prospect.legalName !== prospect.name ? `Razão social: ${prospect.legalName}.` : '',
        `CNAE: ${prospect.cnae} — ${prospect.cnaeDescription}.`,
        prospect.porte ? `Porte: ${prospect.porte}.` : '',
        prospect.capitalSocial ? `Capital social: ${money(prospect.capitalSocial)}.` : '',
        prospect.openedAt ? `Início das atividades: ${date(prospect.openedAt)}.` : '',
        prospect.address ? `Endereço: ${prospect.address}.` : '',
        `Score de qualificação: ${prospect.score}/100 (${prospect.qualification}).`,
        prospect.reasons.length ? `Sinais: ${prospect.reasons.join('; ')}.` : '',
      ].filter(Boolean).join('\n');

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prospect.name,
          company: prospect.name,
          email: prospect.email,
          phone: prospect.phone,
          interest: `Prospecção · ${prospect.cnaeDescription || segment}`,
          source: 'Radar de Leads · Receita Federal',
          status: prospect.score >= 70 ? 'qualificado' : 'novo',
          estimatedValue: 0,
          notes: context,
          owner: 'Arthur Ferreira',
          cnpj: prospect.id,
          address: prospect.address,
          cnae: prospect.cnae,
          cnaeDescription: prospect.cnaeDescription,
          companySize: prospect.porte,
          capitalSocial: prospect.capitalSocial,
          qualificationScore: prospect.score,
          externalSource: 'receita_federal',
          externalId: prospect.id,
        }),
      });

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (response.status === 409 || payload.error === 'contact_already_exists') {
        setAdded((current) => new Set(current).add(prospect.id));
        setNotice(`${prospect.name} já está na base comercial.`);
        return;
      }
      if (!response.ok) throw new Error(payload.error || 'save_failed');

      setAdded((current) => new Set(current).add(prospect.id));
      setNotice(`${prospect.name} foi adicionado ao CRM como ${prospect.score >= 70 ? 'lead qualificado' : 'novo lead'}.`);
      await onLeadAdded?.();
    } catch {
      setError('Não foi possível adicionar essa empresa ao CRM. Se o banco estiver indisponível, a busca continua funcionando e você pode tentar importar novamente depois.');
    } finally {
      setAdding('');
    }
  }

  return (
    <section className="admin-prospector">
      <div className="prospector-intro">
        <div>
          <span className="admin-eyebrow">PROSPECÇÃO B2B / DADOS PÚBLICOS</span>
          <h2>Encontre empresas com perfil de compra.</h2>
          <p>Pesquise por segmento e região. O Radar cruza CNAE, município e dados públicos de CNPJ, calcula um score comercial e deixa você levar os melhores contatos para o CRM.</p>
        </div>
        <div className="prospector-source"><Icon name="shield" /><span><strong>Fonte empresarial</strong><small>Receita Federal · Minha Receita · IBGE</small></span></div>
      </div>

      <form className="prospector-form" onSubmit={(event) => runSearch(event, false)}>
        <label className="prospector-field is-wide"><span>Segmento ou CNAE</span><div><Icon name="search" /><input value={segment} onChange={(event) => setSegment(event.target.value)} placeholder="Ex.: barbearia, contabilidade, restaurante ou 9602501" maxLength={100} /></div></label>
        <label className="prospector-field"><span>Cidade</span><div><Icon name="globe" /><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Ex.: Juiz de Fora" maxLength={120} /></div></label>
        <label className="prospector-field is-uf"><span>UF</span><div><input value={uf} onChange={(event) => setUf(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))} placeholder="MG" maxLength={2} /></div></label>
        <button className="prospector-search-button" type="submit" disabled={loading || segment.trim().length < 2 || city.trim().length < 2}><Icon name="search" />{loading ? 'Buscando...' : 'Buscar empresas'}</button>
      </form>

      <div className="prospector-examples"><span>Atalhos:</span>{['barbearia', 'contabilidade', 'restaurante', 'academia', 'publicidade', 'software'].map((item) => <button type="button" key={item} onClick={() => setSegment(item)}>{item}</button>)}</div>

      {error && <div className="prospector-message is-error"><Icon name="shield" /><span>{error}</span></div>}
      {notice && <div className="prospector-message"><Icon name="check-circle" /><span>{notice}</span></div>}

      {criteria && <div className="prospector-summary">
        <div><span>Busca atual</span><strong>{criteria.segment} · {criteria.city}/{criteria.uf}</strong><small>{criteria.cnaes?.map((item) => `${item.code} ${item.description}`).join(' · ')}</small></div>
        <div className="prospector-summary-count"><strong>{prospects.length}</strong><span>empresas carregadas</span></div>
      </div>}

      {prospects.length > 0 && <>
        <div className="prospector-toolbar">
          <div><button className={filter === 'todos' ? 'is-active' : ''} onClick={() => setFilter('todos')}>Todos</button><button className={filter === 'quente' ? 'is-active' : ''} onClick={() => setFilter('quente')}>Quentes</button><button className={filter === 'contato' ? 'is-active' : ''} onClick={() => setFilter('contato')}>Com contato</button></div>
          <span>{visible.length} resultado{visible.length === 1 ? '' : 's'} visível{visible.length === 1 ? '' : 'is'}</span>
        </div>

        <div className="prospect-grid">
          {visible.map((prospect) => {
            const whatsapp = whatsappNumber(prospect.phone);
            return <article className="prospect-card" key={prospect.id}>
              <div className="prospect-card-top">
                <div className="prospect-score"><strong>{prospect.score}</strong><span>/100</span><em className={`is-${prospect.qualification}`}>{prospect.qualification}</em></div>
                <div className="prospect-company"><span>{prospect.cnpj}</span><h3>{prospect.name}</h3><p>{prospect.legalName && prospect.legalName !== prospect.name ? prospect.legalName : prospect.cnaeDescription}</p></div>
              </div>

              <div className="prospect-signals">
                <span><small>Porte</small><strong>{prospect.porte || 'Não informado'}</strong></span>
                <span><small>Capital social</small><strong>{prospect.capitalSocial ? money(prospect.capitalSocial) : 'Não informado'}</strong></span>
                <span><small>Desde</small><strong>{prospect.openedAt ? date(prospect.openedAt) : 'Não informado'}</strong></span>
              </div>

              <div className="prospect-details">
                <p><Icon name="globe" /><span>{prospect.address || `${prospect.city}/${prospect.uf}`}</span></p>
                {prospect.phone && <p><Icon name="whatsapp" /><span>{prospect.phone}</span></p>}
                {prospect.email && <p><Icon name="mail" /><span>{prospect.email}</span></p>}
              </div>

              <div className="prospect-reasons">{prospect.reasons.map((reason) => <span key={reason}><Icon name="check-circle" size={13} />{reason}</span>)}</div>

              <div className="prospect-actions">
                {prospect.email && <a href={`mailto:${prospect.email}`}><Icon name="mail" /> E-mail</a>}
                {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" /> WhatsApp</a>}
                <button type="button" className="is-primary" onClick={() => addToCrm(prospect)} disabled={adding === prospect.id || added.has(prospect.id)}><Icon name={added.has(prospect.id) ? 'check-circle' : 'plus'} />{added.has(prospect.id) ? 'No CRM' : adding === prospect.id ? 'Adicionando...' : 'Adicionar ao CRM'}</button>
              </div>
            </article>;
          })}
        </div>

        {cursor && <div className="prospector-more"><button type="button" onClick={() => runSearch(undefined, true)} disabled={loading}>{loading ? 'Carregando...' : 'Carregar mais empresas'} <Icon name="arrow-right" /></button></div>}
      </>}

      {!prospects.length && !loading && !criteria && <div className="prospector-empty"><span><Icon name="search" size={28} /></span><h3>Comece por um nicho e uma cidade</h3><p>O score prioriza empresas ativas, com canais de contato, maturidade e sinais cadastrais de maior potencial comercial.</p></div>}

      <div className="prospector-compliance"><Icon name="shield" /><p><strong>Uso responsável.</strong> Os dados exibidos são empresariais e públicos. Antes do contato, valide a adequação da abordagem, respeite solicitações de não contato e evite disparos automatizados em massa.</p></div>
    </section>
  );
}
