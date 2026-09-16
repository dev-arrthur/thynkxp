'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';

export type ManagedClient = {
  _id: string; status: string;
  business: { cnpj?: string; legalName?: string; tradeName?: string; email?: string; phone?: string; partners?: string[]; openedAt?: string | null; cnae?: string; cnaeDescription?: string };
  location: { cep?: string; state?: string; city?: string; street?: string; number?: string; complement?: string; district?: string };
  billing: { paymentTerms?: string; paymentMethod?: string; monthlyFee?: number };
  access: { fullName?: string; email?: string; portalEnabled?: boolean; lastLoginAt?: string | null };
  notes?: string; createdAt?: string; updatedAt?: string | null;
};
type Domain = { _id: string; hostname: string; label: string; type: string; status: string };
const domainEmpty = { hostname: '', label: '', type: 'site', status: 'pendente' };
const errors: Record<string, string> = {
  client_changed: 'Este cadastro mudou em outra sessão. Carregue a versão atual antes de salvar para preservar as novas permissões e os dados.',
  invalid_hostname: 'Informe somente um domínio público válido, como app.empresa.com.br, sem https://, caminhos ou portas.',
  domain_already_exists: 'Esse domínio já está vinculado a uma conta. Cada domínio pode pertencer a apenas um cliente.',
  invalid_cnpj: 'O CNPJ deve conter 14 números.', trade_name_required: 'Informe o nome fantasia.',
  invalid_business_email: 'Confira o e-mail empresarial.', invalid_access_email: 'Confira o e-mail de acesso.',
  access_name_required: 'Informe o nome do responsável pelo acesso.', weak_password: 'A nova senha deve ter entre 8 e 200 caracteres.',
  client_already_exists: 'Já existe uma conta com esse CNPJ ou e-mail de acesso.',
  invalid_monthly_fee: 'Informe um valor de mensalidade válido.',
  unauthorized: 'Sua sessão expirou. Entre novamente para continuar.', forbidden: 'Você não tem acesso a esta operação.',
  domain_not_found: 'Este domínio não foi encontrado. Atualize a lista.', client_not_found: 'Este cliente não foi encontrado.',
};
class ApiFailure extends Error { constructor(message: string, public code: string) { super(message); } }
async function result(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiFailure(errors[data.error] || 'Não foi possível salvar. Tente novamente.', data.error);
  return data;
}

export default function ClientAccountDrawer({ client, onClose, onSaved }: { client: ManagedClient; onClose: () => void; onSaved: (client: ManagedClient) => void }) {
  const [tab, setTab] = useState<'profile' | 'domains'>('profile');
  const [draft, setDraft] = useState(client);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [stale, setStale] = useState(false);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [domainsError, setDomainsError] = useState('');
  const [domainDraft, setDomainDraft] = useState(domainEmpty);
  const [editingId, setEditingId] = useState('');
  const [domainBusy, setDomainBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const busyRef = useRef(false);
  useEffect(() => { busyRef.current = saving || domainBusy; }, [saving, domainBusy]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; closeRef.current?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busyRef.current) onClose();
      if (event.key !== 'Tab') return;
      const elements = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])') || []);
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus(); };
  }, [onClose]);

  async function loadDomains(signal?: AbortSignal) {
    setDomainsLoading(true); setDomainsError('');
    try {
      const data = await result(await fetch(`/api/workspace/domains?clientId=${client._id}`, { cache: 'no-store', signal }));
      setDomains(data.domains || []);
    } catch (reason) { if (!signal?.aborted) setDomainsError(reason instanceof Error ? reason.message : 'Não foi possível carregar os domínios.'); }
    finally { if (!signal?.aborted) setDomainsLoading(false); }
  }
  useEffect(() => { const controller = new AbortController(); void loadDomains(controller.signal); return () => controller.abort(); }, [client._id]);
  function change(section: 'business' | 'location' | 'billing' | 'access', field: string, value: string | number | boolean) {
    setDraft(current => ({ ...current, [section]: { ...current[section], [field]: value } }));
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const data = await result(await fetch(`/api/admin/clients/${client._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedUpdatedAt: draft.updatedAt ?? null, business: draft.business, location: draft.location, billing: draft.billing, access: { ...draft.access, ...(password ? { password } : {}) }, notes: draft.notes, status: draft.status }),
      }));
      setDraft(data.client); setPassword(''); setStale(false); onSaved(data.client); setNotice('Cadastro atualizado. As permissões de acesso já estão em vigor.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao atualizar cliente.'); if (reason instanceof ApiFailure && reason.code === 'client_changed') setStale(true); }
    finally { setSaving(false); }
  }
  async function reloadAccount() {
    setSaving(true); setError(''); setNotice('');
    try {
      const data = await result(await fetch(`/api/admin/clients/${client._id}`, { cache: 'no-store' }));
      setDraft(data.client); setPassword(''); setStale(false); onSaved(data.client);
      setNotice('Versão atual carregada. Revise os dados e aplique novamente suas alterações.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o cadastro.'); }
    finally { setSaving(false); }
  }
  async function saveDomain(event: FormEvent) {
    event.preventDefault(); setDomainBusy(true); setError(''); setNotice('');
    try {
      const data = await result(await fetch(`/api/workspace/domains${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...domainDraft, clientId: client._id }),
      }));
      setDomains(current => editingId ? current.map(item => item._id === editingId ? data.domain : item) : [data.domain, ...current]);
      setDomainDraft(domainEmpty); setEditingId(''); setNotice('Domínio vinculado à conta. O cliente poderá encontrá-lo no portal.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao salvar domínio.'); }
    finally { setDomainBusy(false); }
  }
  async function removeDomain(domain: Domain) {
    if (!window.confirm(`Remover o vínculo de ${domain.hostname} desta conta? O site continuará funcionando normalmente.`)) return;
    setDomainBusy(true); setError(''); setNotice('');
    try {
      await result(await fetch(`/api/workspace/domains/${domain._id}`, { method: 'DELETE' }));
      setDomains(current => current.filter(item => item._id !== domain._id));
      if (editingId === domain._id) { setEditingId(''); setDomainDraft(domainEmpty); }
      setNotice('Vínculo removido da conta.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Falha ao remover domínio.'); }
    finally { setDomainBusy(false); }
  }
  async function copyPortal(domain: Domain) {
    const url = `${window.location.origin}/cliente?section=chamados&domain=${domain._id}`;
    try { await navigator.clipboard.writeText(`<a href="${url}" target="_blank" rel="noopener noreferrer">Solicitar suporte · ThynkXP</a>`); setNotice('Botão de suporte copiado. Inclua o HTML na plataforma do cliente; o acesso exige login no portal.'); }
    catch { setError('Não foi possível copiar. O portal está disponível em /cliente.'); }
  }

  return <div className="account-drawer-layer">
    <button type="button" className="account-drawer-backdrop" aria-label="Fechar cliente" disabled={saving || domainBusy} onClick={onClose} />
    <section ref={drawerRef} className="account-drawer" role="dialog" aria-modal="true" aria-labelledby="account-drawer-title">
      <header className="account-drawer-header"><div className="account-avatar">{(draft.business.tradeName || 'TX').slice(0, 2).toUpperCase()}</div><div><small>CONTA DO CLIENTE</small><h2 id="account-drawer-title">{draft.business.tradeName}</h2><span>{draft.access.email}</span></div><button ref={closeRef} type="button" onClick={onClose} disabled={saving || domainBusy} aria-label="Fechar cliente"><Icon name="x" size={20} /></button></header>
      <div className="account-quick-links"><Link href={`/admin/projetos?clientId=${client._id}`}><Icon name="folder" size={16} /> Projetos <Icon name="arrow-up-right" size={14} /></Link><Link href={`/admin/chamados?clientId=${client._id}`}><Icon name="ticket" size={16} /> Chamados <Icon name="arrow-up-right" size={14} /></Link><a href="/cliente" target="_blank" rel="noopener noreferrer"><Icon name="external-link" size={16} /> Portal do cliente</a></div>
      <div className="account-tabs" role="tablist" aria-label="Detalhes do cliente"><button id="account-profile-tab" aria-controls="account-profile" role="tab" aria-selected={tab === 'profile'} onClick={() => { setTab('profile'); setError(''); }}><Icon name="users" size={16} /> Cadastro e acesso</button><button id="account-domains-tab" aria-controls="account-domains" role="tab" aria-selected={tab === 'domains'} onClick={() => { setTab('domains'); setError(''); }}><Icon name="globe" size={16} /> Domínios <b>{domains.length}</b></button></div>
      <div className="account-drawer-content">
        {error && <p className="account-error" role="alert">{error}</p>}{notice && <p className="account-notice" role="status">{notice}</p>}{stale && <button type="button" className="account-primary" onClick={() => void reloadAccount()} disabled={saving}>Carregar versão atual e descartar alterações locais</button>}
        {tab === 'profile' ? <form id="account-profile" role="tabpanel" aria-labelledby="account-profile-tab" onSubmit={save}>
          <div className="account-section-title"><Icon name="briefcase" size={18} /><div><h3>Dados da empresa</h3><p>O cadastro que conecta sua operação.</p></div></div>
          <div className="account-fields"><label>Nome fantasia<input required maxLength={180} value={draft.business.tradeName || ''} onChange={e => change('business', 'tradeName', e.target.value)} /></label><label>Razão social<input maxLength={220} value={draft.business.legalName || ''} onChange={e => change('business', 'legalName', e.target.value)} /></label><label>CNPJ<input required inputMode="numeric" value={draft.business.cnpj || ''} onChange={e => change('business', 'cnpj', e.target.value.replace(/\D/g, '').slice(0, 14))} /></label><label>Telefone<input value={draft.business.phone || ''} onChange={e => change('business', 'phone', e.target.value)} /></label><label className="account-wide">E-mail empresarial<input type="email" value={draft.business.email || ''} onChange={e => change('business', 'email', e.target.value)} /></label></div>
          <div className="account-section-title"><Icon name="location" size={18} /><h3>Localização</h3></div>
          <div className="account-fields">{([['cep', 'CEP'], ['state', 'Estado'], ['city', 'Cidade'], ['district', 'Bairro'], ['street', 'Logradouro'], ['number', 'Número'], ['complement', 'Complemento']] as const).map(([key, label]) => <label key={key}>{label}<input value={draft.location[key] || ''} maxLength={key === 'state' ? 2 : 220} onChange={e => change('location', key, key === 'state' ? e.target.value.toUpperCase() : e.target.value)} /></label>)}</div>
          <div className="account-section-title"><Icon name="credit-card" size={18} /><h3>Condições comerciais</h3></div>
          <div className="account-fields"><label>Mensalidade · R$<input type="number" step="0.01" min="0" max="100000000" value={draft.billing.monthlyFee ?? 0} onChange={e => change('billing', 'monthlyFee', Number(e.target.value))} /></label><label>Forma de pagamento<select value={draft.billing.paymentMethod || 'PIX'} onChange={e => change('billing', 'paymentMethod', e.target.value)}>{['PIX', 'Boleto', 'Cartão de crédito', 'Transferência', 'Débito automático'].map(item => <option key={item}>{item}</option>)}</select></label><label className="account-wide">Condições de pagamento<input value={draft.billing.paymentTerms || ''} onChange={e => change('billing', 'paymentTerms', e.target.value)} /></label></div>
          <div className="account-section-title"><Icon name="shield" size={18} /><div><h3>Controle de acesso</h3><p>Desabilitar o portal ou arquivar a conta bloqueia o acesso imediatamente.</p></div></div>
          <div className="account-fields"><label>Responsável<input required value={draft.access.fullName || ''} onChange={e => change('access', 'fullName', e.target.value)} /></label><label>E-mail de acesso<input required type="email" autoComplete="off" value={draft.access.email || ''} onChange={e => change('access', 'email', e.target.value)} /></label><label>Nova senha <small>opcional</small><input type="password" minLength={8} maxLength={200} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Deixe vazio para manter" /></label><label>Status da conta<select value={draft.status} onChange={e => setDraft(current => ({ ...current, status: e.target.value }))}><option value="ativo">Ativo</option><option value="pausado">Pausado</option><option value="arquivado">Arquivado</option></select></label><label className="account-toggle account-wide"><input type="checkbox" checked={draft.access.portalEnabled !== false} onChange={e => change('access', 'portalEnabled', e.target.checked)} /><span>Permitir acesso ao portal<small>Contas arquivadas permanecem bloqueadas mesmo com esta opção marcada.</small></span></label></div>
          <div className="account-section-title"><Icon name="file" size={18} /><h3>Observações internas</h3></div><div className="account-fields"><label className="account-wide">Visíveis somente à equipe<textarea rows={4} maxLength={5000} value={draft.notes || ''} onChange={e => setDraft(current => ({ ...current, notes: e.target.value }))} /></label></div>
          <footer className="account-form-footer"><span>{draft.access.lastLoginAt ? `Último acesso: ${new Date(draft.access.lastLoginAt).toLocaleString('pt-BR')}` : 'Nenhum acesso registrado'}</span><button className="account-primary" disabled={saving || stale} type="submit"><Icon name="save" size={16} />{saving ? 'Salvando...' : 'Salvar alterações'}</button></footer>
        </form> : <section id="account-domains" role="tabpanel" aria-labelledby="account-domains-tab">
          <div className="account-domain-intro"><Icon name="globe" size={22} /><div><h3>Todos os endereços, uma conta.</h3><p>Vincule sites e plataformas para o cliente encontrar seus acessos no portal.</p></div></div>
          <p className="account-domain-hint">O vínculo organiza os endereços na conta. DNS, certificado SSL e login no site são configurados separadamente. O botão de suporte abre o portal ThynkXP com autenticação.</p>
          <form className="account-domain-form" onSubmit={saveDomain}><h4>{editingId ? 'Editar domínio' : 'Vincular domínio'}</h4><div className="account-fields"><label className="account-wide">Domínio<input required maxLength={253} placeholder="app.empresa.com.br" value={domainDraft.hostname} onChange={e => setDomainDraft(current => ({ ...current, hostname: e.target.value }))} /></label><label className="account-wide">Nome de exibição<input maxLength={120} placeholder="Plataforma de agendamentos" value={domainDraft.label} onChange={e => setDomainDraft(current => ({ ...current, label: e.target.value }))} /></label><label>Tipo<select value={domainDraft.type} onChange={e => setDomainDraft(current => ({ ...current, type: e.target.value }))}><option value="site">Site</option><option value="plataforma">Plataforma</option><option value="loja">Loja virtual</option><option value="outro">Outro</option></select></label><label>Status<select value={domainDraft.status} onChange={e => setDomainDraft(current => ({ ...current, status: e.target.value }))}><option value="pendente">Pendente</option><option value="ativo">Ativo</option><option value="pausado">Pausado</option></select></label></div><div className="account-domain-form-actions">{editingId && <button type="button" disabled={domainBusy} onClick={() => { setEditingId(''); setDomainDraft(domainEmpty); }}>Cancelar edição</button>}<button type="submit" className="account-primary" disabled={domainBusy}><Icon name={editingId ? 'save' : 'plus'} size={16} />{domainBusy ? 'Salvando...' : editingId ? 'Salvar domínio' : 'Vincular domínio'}</button></div></form>
          {domainsLoading ? <div className="account-domain-empty">Carregando domínios...</div> : domainsError ? <div className="account-error" role="alert">{domainsError}<button type="button" onClick={() => void loadDomains()}>Tentar novamente</button></div> : !domains.length ? <div className="account-domain-empty"><Icon name="globe" size={28} /><strong>O próximo endereço começa aqui.</strong><span>Cadastre o primeiro domínio deste cliente acima.</span></div> : <div className="account-domain-list">{domains.map(domain => <article key={domain._id}><div className="account-domain-card-head"><span className="account-domain-icon"><Icon name="globe" size={19} /></span><div><h4>{domain.label || domain.hostname}</h4><span>{domain.hostname}</span></div><small className={`account-domain-status is-${domain.status}`}>{domain.status === 'ativo' ? 'Ativo' : domain.status === 'pausado' ? 'Pausado' : 'Pendente'}</small></div><div className="account-domain-actions">{domain.status === 'ativo' && <a href={`https://${domain.hostname}`} target="_blank" rel="noopener noreferrer"><Icon name="external-link" size={14} /> Abrir</a>}<button type="button" onClick={() => void copyPortal(domain)}><Icon name="code" size={14} /> Botão de suporte</button><button disabled={domainBusy} type="button" onClick={() => { setEditingId(domain._id); setDomainDraft({ hostname: domain.hostname, label: domain.label, type: domain.type, status: domain.status }); }}><Icon name="edit" size={14} /> Editar</button><button className="account-danger" disabled={domainBusy} type="button" onClick={() => void removeDomain(domain)}>Remover vínculo</button></div></article>)}</div>}
        </section>}
      </div>
    </section>
  </div>;
}
