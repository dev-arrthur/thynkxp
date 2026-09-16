'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/Icon';
import ClientAccountDrawer, { type ManagedClient } from '../../../components/ClientAccountDrawer';
import '../../client-domains.css';

type Client = ManagedClient;

type Draft = {
  cnpj: string; legalName: string; tradeName: string; businessEmail: string; phone: string; partners: string[]; openedAt: string; cnae: string; cnaeDescription: string;
  cep: string; state: string; city: string; street: string; number: string; complement: string; district: string;
  paymentTerms: string; paymentMethod: string; monthlyFee: string;
  fullName: string; accessEmail: string; password: string;
  notes: string;
};

const EMPTY: Draft = {
  cnpj: '', legalName: '', tradeName: '', businessEmail: '', phone: '', partners: [''], openedAt: '', cnae: '', cnaeDescription: '',
  cep: '', state: '', city: '', street: '', number: '', complement: '', district: '',
  paymentTerms: 'Mensal · vencimento todo dia 10', paymentMethod: 'PIX', monthlyFee: '',
  fullName: '', accessEmail: '', password: '', notes: '',
};

const STEPS = [
  ['Dados do Cliente', 'Identificação e quadro societário'],
  ['Localização', 'Endereço da operação'],
  ['Cobrança', 'Condições comerciais'],
  ['Acesso', 'Usuário do painel'],
  ['Observações', 'Contexto e revisão'],
] as const;

function money(value?: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}
function digits(value: string, max: number) { return value.replace(/\D/g, '').slice(0, max); }
function formatCnpj(value: string) {
  const raw = digits(value, 14);
  return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*$/, (_, a, b, c, d, e) => `${a}.${b}.${c}/${d}${e ? `-${e}` : ''}`);
}
function formatCep(value: string) {
  const raw = digits(value, 8);
  return raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
}
function formatPhone(value: string) {
  const raw = digits(value, 13);
  if (raw.length <= 10) return raw.replace(/^(\d{2})(\d{0,4})(\d{0,4})$/, (_, a, b, c) => `(${a}) ${b}${c ? `-${c}` : ''}`.trim());
  return raw.replace(/^(\d{2})(\d{5})(\d{0,4})$/, (_, a, b, c) => `(${a}) ${b}${c ? `-${c}` : ''}`.trim());
}
function generatedPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const array = new Uint32Array(14);
  crypto.getRandomValues(array);
  return Array.from(array, (item) => alphabet[item % alphabet.length]).join('');
}
function errorLabel(code: string) {
  const labels: Record<string, string> = {
    service_unavailable: 'O serviço está indisponível no momento. Tente novamente.', unauthorized: 'Sua sessão expirou. Entre novamente para continuar.',
    invalid_cnpj: 'Informe um CNPJ válido.', trade_name_required: 'Informe o nome fantasia.', invalid_business_email: 'O e-mail empresarial é inválido.',
    access_name_required: 'Informe o nome completo do usuário.', invalid_access_email: 'Informe um e-mail de acesso válido.', weak_password: 'A senha deve ter pelo menos 8 caracteres.',
    client_already_exists: 'Já existe um cliente com esse CNPJ ou e-mail de acesso.', client_create_failed: 'Não foi possível criar o cliente agora.',
    email_provider_not_configured: 'O envio automático de e-mail ainda não está configurado. Você pode copiar os dados de acesso.', email_send_failed: 'O cadastro foi criado, mas o e-mail não pôde ser enviado.',
  };
  return labels[code] || 'Não foi possível concluir esta operação.';
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [lookingCnpj, setLookingCnpj] = useState(false);
  const [lookingCep, setLookingCep] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ client: Client; password: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<Client | null>(null);
  const closeAccount = useCallback(() => setSelected(null), []);

  async function load() {
    setLoading(true); setLoadError('');
    try {
      const response = await fetch('/api/admin/clients', { cache: 'no-store' });
      if (response.status === 401) { window.location.href = '/admin/login'; return; }
      const data = await response.json() as { clients?: Client[]; error?: string };
      if (!response.ok) throw new Error('clients_unavailable');
      setClients(Array.isArray(data.clients) ? data.clients : []);
    } catch { setLoadError('Não foi possível carregar os clientes. Verifique a conexão e tente novamente.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); if (new URLSearchParams(window.location.search).get('new') === '1') openWizard(); }, []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id && clients.length) {
      const match = clients.find(client => client._id === id);
      if (match) { setSelected(match); window.history.replaceState({}, '', window.location.pathname); }
    }
  }, [clients]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(id); }, [toast]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return clients;
    return clients.filter((client) => [client.business.tradeName, client.business.legalName, client.business.cnpj, client.business.email, client.access.email, client.location.city]
      .filter(Boolean).join(' ').toLowerCase().includes(text));
  }, [clients, query]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function openWizard() { setDraft({ ...EMPTY, partners: [''], password: generatedPassword() }); setStep(1); setError(''); setLookupMessage(''); setWizardOpen(true); }
  function closeWizard() { if (saving) return; setWizardOpen(false); setError(''); setLookupMessage(''); }

  async function lookupCnpj() {
    const cnpj = digits(draft.cnpj, 14);
    if (cnpj.length !== 14) { setLookupMessage('Digite os 14 números do CNPJ para buscar.'); return; }
    setLookingCnpj(true); setLookupMessage(''); setError('');
    try {
      const response = await fetch(`/api/admin/company/cnpj?cnpj=${cnpj}`, { cache: 'no-store' });
      const data = await response.json() as { error?: string; source?: string; company?: Record<string, unknown> & { location?: Record<string, unknown> } };
      if (!response.ok || !data.company) throw new Error(data.error || 'cnpj_not_found');
      const company = data.company; const location = company.location || {};
      setDraft((current) => ({
        ...current,
        cnpj, legalName: String(company.legalName || ''), tradeName: String(company.tradeName || company.legalName || ''),
        businessEmail: String(company.email || ''), phone: String(company.phone || ''), partners: Array.isArray(company.partners) && company.partners.length ? company.partners.map(String) : [''],
        openedAt: String(company.openedAt || '').slice(0, 10), cnae: String(company.cnae || ''), cnaeDescription: String(company.cnaeDescription || ''),
        cep: String(location.cep || current.cep), state: String(location.state || current.state), city: String(location.city || current.city), street: String(location.street || current.street),
        number: String(location.number || current.number), complement: String(location.complement || current.complement), district: String(location.district || current.district),
        accessEmail: current.accessEmail || String(company.email || ''),
      }));
      setLookupMessage(`Dados encontrados e preenchidos automaticamente${data.source ? ` · ${data.source}` : ''}.`);
    } catch {
      setLookupMessage('Não encontramos esse CNPJ nas fontes disponíveis. Preencha os campos abaixo manualmente.');
    } finally { setLookingCnpj(false); }
  }

  async function lookupCep(value = draft.cep) {
    const cep = digits(value, 8);
    if (cep.length !== 8) return;
    setLookingCep(true); setLookupMessage('');
    try {
      const response = await fetch(`/api/admin/company/cep?cep=${cep}`, { cache: 'no-store' });
      const data = await response.json() as { address?: Record<string, unknown> };
      if (!response.ok || !data.address) throw new Error('cep');
      setDraft((current) => ({ ...current, cep, state: String(data.address?.state || ''), city: String(data.address?.city || ''), street: String(data.address?.street || ''), district: String(data.address?.district || ''), complement: current.complement || String(data.address?.complement || '') }));
      setLookupMessage('Endereço localizado pelo CEP. Complete apenas número e complemento se necessário.');
    } catch { setLookupMessage('CEP não encontrado. Você pode preencher o endereço manualmente.'); }
    finally { setLookingCep(false); }
  }

  function validateStep(target = step) {
    setError('');
    if (target === 1) {
      if (digits(draft.cnpj, 14).length !== 14) return setError('Informe um CNPJ com 14 dígitos.'), false;
      if (!draft.tradeName.trim()) return setError('Informe o nome fantasia.'), false;
      if (!draft.businessEmail.trim()) return setError('Informe o e-mail empresarial.'), false;
      if (!draft.phone.trim()) return setError('Informe o telefone.'), false;
    }
    if (target === 2) {
      if (digits(draft.cep, 8).length !== 8 || !draft.state || !draft.city || !draft.street || !draft.number) return setError('Complete CEP, estado, cidade, logradouro e número.'), false;
    }
    if (target === 3) {
      if (!draft.paymentTerms || !draft.paymentMethod || !Number.isFinite(Number(draft.monthlyFee.replace(',', '.'))) || Number(draft.monthlyFee.replace(',', '.')) <= 0) return setError('Defina condição, forma de pagamento e valor da mensalidade.'), false;
    }
    if (target === 4) {
      if (!draft.fullName.trim() || !draft.accessEmail.includes('@') || draft.password.length < 8) return setError('Complete nome, e-mail de acesso e uma senha de pelo menos 8 caracteres.'), false;
    }
    return true;
  }
  function next() { if (validateStep()) setStep((current) => Math.min(5, current + 1)); }
  function previous() { setError(''); setStep((current) => Math.max(1, current - 1)); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    for (let target = 1; target <= 4; target += 1) { if (!validateStep(target)) { setStep(target); return; } }
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/admin/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business: { cnpj: digits(draft.cnpj, 14), legalName: draft.legalName, tradeName: draft.tradeName, email: draft.businessEmail, phone: draft.phone, partners: draft.partners.filter(Boolean), openedAt: draft.openedAt, cnae: draft.cnae, cnaeDescription: draft.cnaeDescription },
          location: { cep: digits(draft.cep, 8), state: draft.state, city: draft.city, street: draft.street, number: draft.number, complement: draft.complement, district: draft.district },
          billing: { paymentTerms: draft.paymentTerms, paymentMethod: draft.paymentMethod, monthlyFee: Number(draft.monthlyFee.replace(',', '.')) },
          access: { fullName: draft.fullName, email: draft.accessEmail, password: draft.password }, notes: draft.notes,
        }),
      });
      const data = await response.json() as { error?: string; client?: Client };
      if (!response.ok || !data.client) throw new Error(data.error || 'client_create_failed');
      setClients((current) => [data.client!, ...current]);
      setWizardOpen(false);
      setCreated({ client: data.client, password: draft.password });
      setDraft(EMPTY);
      setToast('Cliente criado com acesso ao painel.');
    } catch (saveError) { setError(errorLabel(saveError instanceof Error ? saveError.message : 'client_create_failed')); }
    finally { setSaving(false); }
  }

  async function sendAccess() {
    if (!created) return;
    setSending(true);
    const email = created.client.access.email || '';
    try {
      const response = await fetch('/api/admin/clients/send-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name: created.client.access.fullName, company: created.client.business.tradeName, password: created.password, portalUrl: `${window.location.origin}/cliente` }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'email_send_failed');
      setToast('Acesso enviado por e-mail.'); setCreated(null); setDraft(EMPTY);
    } catch (sendError) { setToast(errorLabel(sendError instanceof Error ? sendError.message : 'email_send_failed')); }
    finally { setSending(false); }
  }
  async function copyAccess() {
    if (!created) return;
    const text = `Acesso ThynkXP\n${created.client.business.tradeName || ''}\nE-mail: ${created.client.access.email || ''}\nSenha: ${created.password}\n${window.location.origin}/cliente`;
    try { await navigator.clipboard.writeText(text); setToast('Dados de acesso copiados.'); }
    catch { setToast('Não foi possível copiar. Selecione os dados de acesso para copiá-los manualmente.'); }
  }

  return <main className="clients-v5-page">
    <section className="clients-v5-heading">
      <div><span>THYNKXP / CLIENTES</span><h1>Clientes</h1><p>Um relacionamento completo: cadastro, domínios, projetos e suporte conectados à conta de cada cliente.</p></div>
      <button type="button" onClick={openWizard}><Icon name="plus" size={16} /> Novo cliente</button>
    </section>

    <section className="clients-v5-summary">
      <article><span>Clientes cadastrados</span><strong>{clients.length}</strong><small>contas empresariais</small></article>
      <article><span>Acessos ativos</span><strong>{clients.filter((item) => item.access.portalEnabled !== false && !['arquivado', 'inativo'].includes(item.status)).length}</strong><small>portais habilitados</small></article>
      <article><span>Mensalidade contratada</span><strong>{money(clients.filter(item => item.status === 'ativo').reduce((sum, item) => sum + Number(item.billing.monthlyFee || 0), 0))}</strong><small>recorrência de contas ativas</small></article>
    </section>

    <section className="clients-v5-directory">
      <div className="clients-v5-toolbar"><div><span>CARTEIRA</span><h2>Gerenciar clientes</h2><p>{visible.length} cliente{visible.length === 1 ? '' : 's'} encontrado{visible.length === 1 ? '' : 's'}.</p></div><label><Icon name="search" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, CNPJ, e-mail ou cidade" /></label></div>
      <div className="clients-v5-table-head"><span>Cliente</span><span>Localização</span><span>Acesso</span><span>Mensalidade</span><span>Status</span></div>
      {loading ? <div className="clients-v5-empty">Carregando clientes...</div> : loadError ? <div className="client-list-error" role="alert"><span>{loadError}</span><button onClick={() => void load()} type="button">Tentar novamente</button></div> : visible.length ? visible.map((client) => <article className="clients-v5-row" key={client._id}>
        <div><i>{(client.business.tradeName || '?').slice(0, 2).toUpperCase()}</i><span><strong>{client.business.tradeName || client.business.legalName || 'Sem nome'}</strong><small>{formatCnpj(client.business.cnpj || '')}</small></span></div>
        <span><strong>{client.location.city || '—'}{client.location.state ? ` / ${client.location.state}` : ''}</strong><small>{client.location.street || 'Endereço não informado'}</small></span>
        <span><strong>{client.access.fullName || '—'}</strong><small>{client.access.email || 'Sem acesso'}</small></span>
        <span><strong>{money(client.billing.monthlyFee)}</strong><small>{client.billing.paymentMethod || '—'}</small></span>
        <span className="client-status-cell"><em>{client.status || 'ativo'}{client.access.portalEnabled === false ? ' · portal bloqueado' : ''}</em><button className="client-manage-button" type="button" onClick={() => setSelected(client)} aria-label={`Gerenciar ${client.business.tradeName}`}><Icon name="edit" size={12} /> Gerenciar</button></span>
      </article>) : <div className="clients-v5-empty"><Icon name="briefcase" size={25} /><strong>{query ? 'Nenhum resultado para esta busca' : 'Nenhum cliente cadastrado'}</strong><span>{query ? 'Tente buscar pelo nome, CNPJ ou e-mail do cliente.' : 'Crie o primeiro cliente para gerar um acesso individual ao portal.'}</span></div>}
    </section>

    {selected && <ClientAccountDrawer key={selected._id} client={selected} onClose={closeAccount} onSaved={(updated) => { setClients(current => current.map(item => item._id === updated._id ? updated : item)); setSelected(updated); }} />}

    {wizardOpen && <><button className="clients-v5-backdrop" type="button" aria-label="Fechar modal" onClick={closeWizard} /><form className="clients-v5-wizard" role="dialog" aria-modal="true" aria-label="Cadastrar novo cliente" onSubmit={submit}>
      <aside><div className="clients-v5-wizard-brand"><span>TX</span><div><small>NOVO CLIENTE</small><strong>Cadastro completo</strong></div></div><nav>{STEPS.map(([title, subtitle], index) => { const number = index + 1; return <button type="button" key={title} className={`${step === number ? 'is-active' : ''} ${step > number ? 'is-complete' : ''}`} onClick={() => number < step && setStep(number)}><i>{step > number ? <Icon name="check" size={13} /> : String(number).padStart(2, '0')}</i><span><strong>{title}</strong><small>{subtitle}</small></span></button>; })}</nav><div className="clients-v5-security"><Icon name="shield" size={15} /><span><strong>Acesso protegido</strong><small>A senha é armazenada com hash e salt, nunca em texto puro.</small></span></div></aside>
      <section className="clients-v5-wizard-main"><header><div><span>STEP {String(step).padStart(2, '0')} / 05</span><h2>{STEPS[step - 1][0]}</h2><p>{STEPS[step - 1][1]}</p></div><button type="button" onClick={closeWizard}><Icon name="x" size={17} /></button></header>
        <div className="clients-v5-fields">
          {step === 1 && <>
            <label className="is-wide"><span>CNPJ</span><div className="clients-v5-inline"><input value={formatCnpj(draft.cnpj)} onChange={(e) => update('cnpj', digits(e.target.value, 14))} onBlur={() => digits(draft.cnpj, 14).length === 14 && lookupCnpj()} placeholder="00.000.000/0000-00" /><button type="button" onClick={lookupCnpj} disabled={lookingCnpj}>{lookingCnpj ? 'Buscando...' : 'Buscar CNPJ'}</button></div></label>
            <label><span>Nome Fantasia</span><input value={draft.tradeName} onChange={(e) => update('tradeName', e.target.value)} placeholder="Nome comercial" /></label><label><span>Razão Social</span><input value={draft.legalName} onChange={(e) => update('legalName', e.target.value)} placeholder="Razão social" /></label>
            <label><span>E-mail</span><input type="email" value={draft.businessEmail} onChange={(e) => update('businessEmail', e.target.value)} placeholder="financeiro@empresa.com.br" /></label><label><span>Telefone</span><input value={formatPhone(draft.phone)} onChange={(e) => update('phone', digits(e.target.value, 13))} placeholder="(32) 99999-9999" /></label>
            <label><span>Data de abertura</span><input type="date" value={draft.openedAt} onChange={(e) => update('openedAt', e.target.value)} /></label><label><span>CNAE principal</span><input value={draft.cnae} onChange={(e) => update('cnae', digits(e.target.value, 7))} placeholder="9602501" /></label>
            <div className="clients-v5-partners is-wide"><span>Sócios</span>{draft.partners.map((partner, index) => <div key={index}><input value={partner} onChange={(e) => update('partners', draft.partners.map((item, position) => position === index ? e.target.value : item))} placeholder={`Sócio ${index + 1}`} />{draft.partners.length > 1 && <button type="button" onClick={() => update('partners', draft.partners.filter((_, position) => position !== index))}><Icon name="x" size={13} /></button>}</div>)}<button type="button" onClick={() => update('partners', [...draft.partners, ''])}><Icon name="plus" size={13} /> Adicionar sócio</button></div>
          </>}
          {step === 2 && <>
            <label><span>CEP</span><div className="clients-v5-inline"><input value={formatCep(draft.cep)} onChange={(e) => { const nextCep = digits(e.target.value, 8); update('cep', nextCep); if (nextCep.length === 8) void lookupCep(nextCep); }} placeholder="00000-000" /><button type="button" onClick={() => void lookupCep()} disabled={lookingCep}>{lookingCep ? '...' : 'Buscar'}</button></div></label><label><span>Estado</span><input value={draft.state} onChange={(e) => update('state', e.target.value.toUpperCase().slice(0, 2))} placeholder="MG" /></label>
            <label><span>Cidade</span><input value={draft.city} onChange={(e) => update('city', e.target.value)} placeholder="Juiz de Fora" /></label><label><span>Bairro</span><input value={draft.district} onChange={(e) => update('district', e.target.value)} placeholder="Centro" /></label>
            <label className="is-wide"><span>Logradouro</span><input value={draft.street} onChange={(e) => update('street', e.target.value)} placeholder="Rua, avenida..." /></label><label><span>N°</span><input value={draft.number} onChange={(e) => update('number', e.target.value)} placeholder="120" /></label><label><span>Complemento</span><input value={draft.complement} onChange={(e) => update('complement', e.target.value)} placeholder="Sala, bloco..." /></label>
          </>}
          {step === 3 && <>
            <label className="is-wide"><span>Condições de pagamento</span><input value={draft.paymentTerms} onChange={(e) => update('paymentTerms', e.target.value)} placeholder="Ex.: mensal · vencimento todo dia 10" /></label><label><span>Forma de pagamento</span><select value={draft.paymentMethod} onChange={(e) => update('paymentMethod', e.target.value)}><option>PIX</option><option>Boleto</option><option>Cartão de crédito</option><option>Transferência</option><option>Débito automático</option></select></label><label><span>Valor da mensalidade</span><div className="clients-v5-money"><b>R$</b><input inputMode="decimal" value={draft.monthlyFee} onChange={(e) => update('monthlyFee', e.target.value.replace(/[^\d,.]/g, ''))} placeholder="0,00" /></div></label>
          </>}
          {step === 4 && <>
            <label className="is-wide"><span>Nome completo</span><input value={draft.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Responsável pelo acesso" /></label><label><span>E-mail de acesso</span><input type="email" value={draft.accessEmail} onChange={(e) => update('accessEmail', e.target.value)} placeholder="nome@empresa.com.br" /></label><label><span>Senha inicial</span><div className="clients-v5-inline"><input type="password" autoComplete="new-password" value={draft.password} onChange={(e) => update('password', e.target.value)} /><button type="button" onClick={() => update('password', generatedPassword())}>Gerar senha</button></div></label><div className="clients-v5-access-note is-wide"><Icon name="lock" size={17} /><span><strong>Credencial individual</strong><small>Esse e-mail passa a autenticar diretamente no painel do cliente. A senha será armazenada somente como hash seguro.</small></span></div>
          </>}
          {step === 5 && <>
            <label className="is-wide clients-v5-notes"><span>Observações</span><textarea value={draft.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Contexto do contrato, escopo, preferências, alertas para a equipe..." /></label>
            <div className="clients-v5-review is-wide"><div><span>Cliente</span><strong>{draft.tradeName}</strong><small>{formatCnpj(draft.cnpj)} · {draft.city}/{draft.state}</small></div><div><span>Cobrança</span><strong>{money(Number(draft.monthlyFee.replace(',', '.')))}</strong><small>{draft.paymentMethod} · {draft.paymentTerms}</small></div><div><span>Acesso</span><strong>{draft.fullName}</strong><small>{draft.accessEmail}</small></div></div>
          </>}
        </div>
        {lookupMessage && <div className="clients-v5-lookup"><Icon name="activity" size={14} /><span>{lookupMessage}</span></div>}{error && <div className="clients-v5-error"><Icon name="shield" size={14} /><span>{error}</span></div>}
        <footer><button type="button" onClick={previous} disabled={step === 1}>Voltar</button><span>Etapa {step} de 5</span>{step < 5 ? <button type="button" className="is-primary" onClick={next}>Continuar <Icon name="arrow-right" size={14} /></button> : <button type="submit" className="is-primary" disabled={saving}>{saving ? 'Criando cliente...' : 'Concluir cadastro'} <Icon name="check" size={14} /></button>}</footer>
      </section>
    </form></>}

    {created && <><button className="clients-v5-backdrop is-access" type="button" onClick={() => setCreated(null)} aria-label="Fechar" /><section className="clients-v5-access-modal"><div className="clients-v5-access-icon"><Icon name="check-circle" size={24} /></div><span>CADASTRO CONCLUÍDO</span><h2>Cliente criado com sucesso.</h2><p>O acesso de <strong>{created.client.access.fullName}</strong> já está ativo. Deseja enviar as credenciais para <strong>{created.client.access.email}</strong> por e-mail?</p><div className="clients-v5-access-preview"><span><small>E-mail</small><strong>{created.client.access.email}</strong></span><span><small>Senha inicial</small><strong>{created.password}</strong></span></div><div><button type="button" onClick={copyAccess}><Icon name="copy" size={15} /> Copiar acesso</button><button type="button" className="is-primary" onClick={sendAccess} disabled={sending}><Icon name="mail" size={15} />{sending ? 'Enviando...' : 'Enviar por e-mail'}</button></div><button className="clients-v5-access-close" type="button" onClick={() => { setCreated(null); setDraft(EMPTY); }}>Agora não</button></section></>}
    {toast && <div className="admin-toast clients-v5-toast"><Icon name="check-circle" size={16} /> {toast}</div>}
  </main>;
}
