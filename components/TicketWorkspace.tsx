'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useWorkspaceEvents } from '../lib/use-workspace-events';
import '../app/tickets-workspace.css';

const STATUS = { aberto: 'Aberto', em_andamento: 'Em andamento', aguardando_cliente: 'Aguardando cliente', resolvido: 'Resolvido', fechado: 'Fechado' } as const;
const PRIORITY = { baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' } as const;
const CATEGORY = { alteracao: 'Alteração', problema: 'Problema', novo_recurso: 'Novo recurso', duvida: 'Dúvida' } as const;
type TicketStatus = keyof typeof STATUS;
type Priority = keyof typeof PRIORITY;
type Category = keyof typeof CATEGORY;
type Ticket = { _id: string; number?: string | number; code?: string; title: string; description: string; status: TicketStatus; priority: Priority; category: Category; clientId: string; clientName?: string; owner?: string; dueAt?: string; domainId?: string; domainName?: string; projectId?: string; projectName?: string; createdAt: string; updatedAt: string; messageCount?: number };
type MessagePage = { messages: Message[]; hasMore: boolean; before: string | null };
type Message = { _id: string; body: string; internal?: boolean; authorName?: string; authorRole?: string; author?: { name?: string; role?: string }; createdAt: string };
type ClientOption = { _id: string; status?: string; business: { tradeName?: string; legalName?: string }; access?: { fullName?: string } };
type DomainOption = { _id: string; hostname: string; label?: string; clientId?: string };
type ProjectOption = { _id: string; name: string; clientId?: string };
type Props = { mode: 'admin' | 'client'; clientId?: string; domainId?: string; ticketId?: string };

function date(value?: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Sem data';
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function ref(ticket: Ticket) { return ticket.code || (ticket.number ? `#${ticket.number}` : `#${ticket._id.slice(-6).toUpperCase()}`); }
function mergeMessages(previous: Message[], incoming: Message[]) { return Array.from(new Map([...previous, ...incoming].map((message) => [message._id, message])).values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a._id.localeCompare(b._id)); }
class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
function issue(error: unknown) { return error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.'; }
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json', 'X-Workspace-Role': window.location.pathname.startsWith('/admin') ? 'admin' : 'client', ...init?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages: Record<string, string> = { unauthorized: 'Sua sessão expirou. Entre novamente.', forbidden: 'Você não tem acesso a este registro.', ticket_not_found: 'Este chamado não está disponível.', invalid_client: 'Selecione um cliente ativo.', invalid_domain: 'Selecione um domínio deste cliente.', invalid_project: 'Selecione um projeto deste cliente.', rate_limited: 'Aguarde alguns instantes antes de tentar novamente.', ticket_closed: 'Este chamado está fechado. Abra uma nova solicitação para continuar.' };
    const serverMessage = typeof data.error === 'string' && data.error.includes(' ') && data.error.length < 300 ? data.error : '';
    throw new ApiError(data.message || serverMessage || messages[data.error] || (response.status === 409 ? 'Este chamado foi atualizado por outra pessoa. Confira os dados atuais antes de salvar novamente.' : response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : response.status === 503 ? 'O atendimento está temporariamente indisponível. Tente novamente.' : 'Não foi possível concluir. Revise os campos e tente novamente.'), response.status);
  }
  return data as T;
}

export default function TicketWorkspace({ mode, clientId, domainId, ticketId }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string | null>(ticketId || null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  const connection = useWorkspaceEvents(refresh);
  const limit = 20;
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => { setPage(1); }, [clientId, domainId, status, priority, category]);
  useEffect(() => { if (ticketId) setSelected(ticketId); }, [ticketId]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (clientId) params.set('clientId', clientId);
    if (domainId) params.set('domainId', domainId);
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    if (category) params.set('category', category);
    if (search) params.set('q', search);
    setLoading(true);
    api<{ tickets: Ticket[]; total: number }>(`/api/workspace/tickets?${params}`, { signal: controller.signal })
      .then((data) => { setTickets(data.tickets); setTotal(data.total); setError(''); })
      .catch((err) => { if (!controller.signal.aborted) setError(issue(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, clientId, domainId, status, priority, category, search, revision]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 5000); return () => window.clearTimeout(timer); }, [notice]);
  return <section className="tw-root">
    <div className="tw-heading"><div><span className="tw-eyebrow">CENTRAL DE ATENDIMENTO</span><h1>Conversas que viram soluções.</h1><p>{mode === 'admin' ? 'Uma caixa de entrada para conectar clientes, equipe e entregas.' : 'Peça uma alteração, tire uma dúvida e acompanhe cada resposta da equipe.'}</p></div><button className="tw-button primary" onClick={() => setCreating(true)}><Icon name="plus" size={17} /> Novo chamado</button></div>
    <div className="tw-toolbar"><div className="tw-search"><Icon name="search" size={18} /><input aria-label="Buscar chamados" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pelo assunto…" /></div><span className={`tw-live ${connection === 'live' ? 'online' : ''}`} role="status"><i />{connection === 'live' ? 'Atualização ao vivo' : connection === 'connecting' ? 'Conectando…' : 'Reconectando…'}</span><button className="tw-icon-button" onClick={refresh} aria-label="Atualizar chamados" title="Atualizar"><Icon name="activity" size={18} /></button></div>
    <div className="tw-filters"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Prioridade<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">Todas as prioridades</option>{Object.entries(PRIORITY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas as categorias</option>{Object.entries(CATEGORY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span>{loading && tickets.length === 0 ? 'Carregando…' : `${total} chamado${total === 1 ? '' : 's'}`}</span></div>
    {notice && <div className="tw-success" role="status"><Icon name="check-circle" size={17} />{notice}</div>}
    {error && <div className="tw-error" role="alert">{error}<button onClick={refresh}>Tentar novamente</button></div>}
    <div className={`tw-inbox ${selected ? 'has-selection' : ''}`}>
      <div className="tw-list" aria-label="Lista de chamados" aria-busy={loading}>
        {loading && tickets.length === 0 ? <div className="tw-empty"><span className="tw-spinner" /><p>Buscando seus chamados…</p></div> : !tickets.length ? <div className="tw-empty"><span className="tw-empty-icon"><Icon name="message-square" size={26} /></span><h2>{status || priority || category || search ? 'Nenhum chamado neste filtro' : 'Um canal aberto para você'}</h2><p>{status || priority || category || search ? 'Experimente outro termo ou remova os filtros.' : 'Comece uma conversa. As solicitações e respostas ficam organizadas aqui.'}</p><button className="tw-button" onClick={() => { if (status || priority || category || search) { setStatus(''); setPriority(''); setCategory(''); setQuery(''); } else setCreating(true); }}>{status || priority || category || search ? 'Limpar filtros' : 'Criar primeiro chamado'}</button></div> : tickets.map((ticket) => <button key={ticket._id} className={`tw-ticket ${selected === ticket._id ? 'selected' : ''}`} onClick={() => setSelected(ticket._id)} aria-pressed={selected === ticket._id}><span className="tw-ticket-meta"><span>{ref(ticket)}{mode === 'admin' && ticket.clientName ? ` · ${ticket.clientName}` : ''}</span><time dateTime={ticket.updatedAt}>{date(ticket.updatedAt)}</time></span><strong>{ticket.title}</strong><span className="tw-ticket-preview">{ticket.description}</span><span className="tw-ticket-tags"><span className={`tw-badge status-${ticket.status}`}>{STATUS[ticket.status] || ticket.status}</span><span className={`tw-priority priority-${ticket.priority}`}><i />{PRIORITY[ticket.priority]}</span><span>{CATEGORY[ticket.category]}</span></span></button>)}
        {total > limit && <div className="tw-pagination"><button disabled={page === 1 || loading} onClick={() => setPage((v) => v - 1)}>Anterior</button><span>{page} / {Math.max(1, Math.ceil(total / limit))}</span><button disabled={page * limit >= total || loading} onClick={() => setPage((v) => v + 1)}>Próxima</button></div>}
      </div>
      {selected ? <TicketThread key={selected} id={selected} mode={mode} revision={revision} onRefresh={refresh} onClose={() => setSelected(null)} /> : <div className="tw-thread-placeholder"><div className="tw-conversation-art"><Icon name="message-square" size={40} /><span><Icon name="check" size={16} /></span></div><small>HISTÓRICO EM UM SÓ LUGAR</small><h2>Todo contexto.<br />Próximo passo claro.</h2><p>Selecione um chamado para acompanhar a conversa, os responsáveis e a evolução da solicitação.</p><div><Icon name="shield" size={15} /> Conversas privadas do seu atendimento</div></div>}
    </div>
    {creating && <CreateTicket mode={mode} clientId={clientId} domainId={domainId} onClose={() => setCreating(false)} onCreated={(ticket) => { setCreating(false); setSelected(ticket._id); setPage(1); setStatus(''); setCategory(''); setPriority(''); setQuery(''); setSearch(''); setNotice('Chamado criado. A equipe já pode acompanhar sua solicitação.'); refresh(); }} />}
  </section>;
}

function TicketThread({ id, mode, revision, onClose, onRefresh }: { id: string; mode: Props['mode']; revision: number; onClose: () => void; onRefresh: () => void }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<{ before: string | null; hasMore: boolean } | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api<{ ticket: Ticket }>(`/api/workspace/tickets/${id}`, { signal: controller.signal }), api<MessagePage>(`/api/workspace/tickets/${id}/messages?limit=100`, { signal: controller.signal })])
      .then(([detail, conversation]) => { setTicket(detail.ticket); setMessages((previous) => mergeMessages(previous, conversation.messages)); setHistory((previous) => previous || { before: conversation.before, hasMore: conversation.hasMore }); setError(''); })
      .catch((err) => { if (!controller.signal.aborted) setError(issue(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, revision]);
  useEffect(() => { const el = threadRef.current; if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 250) el.scrollTop = el.scrollHeight; }, [messages.length]);
  async function loadOlder() {
    if (!history?.before || loadingOlder) return;
    setLoadingOlder(true); setOlderError('');
    try {
      const previousHeight = threadRef.current?.scrollHeight || 0;
      const previousTop = threadRef.current?.scrollTop || 0;
      const data = await api<MessagePage>(`/api/workspace/tickets/${id}/messages?limit=100&before=${encodeURIComponent(history.before)}`);
      setMessages((previous) => mergeMessages(previous, data.messages));
      setHistory({ before: data.before, hasMore: data.hasMore });
      requestAnimationFrame(() => { if (threadRef.current) threadRef.current.scrollTop = previousTop + threadRef.current.scrollHeight - previousHeight; });
    } catch (err) { setOlderError(issue(err)); } finally { setLoadingOlder(false); }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true); setSendError(''); setConfirmation('');
    try { await api(`/api/workspace/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: body.trim(), internal: mode === 'admin' && internal }) }); setBody(''); setConfirmation(internal ? 'Nota interna registrada.' : 'Mensagem enviada.'); onRefresh(); }
    catch (err) { setSendError(issue(err)); }
    finally { setSending(false); }
  }
  return <article className="tw-thread" aria-label="Conversa do chamado">
    <div className="tw-thread-top"><span>{ticket ? ref(ticket) : 'Chamado'}</span><button className="tw-icon-button" aria-label="Fechar conversa" onClick={onClose}><Icon name="x" size={18} /></button></div>
    {error && <div className="tw-error" role="alert">{error}<button onClick={onRefresh}>Tentar novamente</button></div>}
    {loading ? <div className="tw-empty"><span className="tw-spinner" /><p>Abrindo conversa…</p></div> : ticket && <>
      <div className="tw-thread-title"><div className="tw-ticket-tags"><span className={`tw-badge status-${ticket.status}`}>{STATUS[ticket.status]}</span><span className={`tw-priority priority-${ticket.priority}`}><i />{PRIORITY[ticket.priority]}</span></div><h2>{ticket.title}</h2><p>{CATEGORY[ticket.category]}{ticket.clientName ? ` · ${ticket.clientName}` : ''}</p><div className="tw-thread-context">{ticket.owner && <span><Icon name="users" size={14} />{ticket.owner}</span>}{ticket.dueAt && <span><Icon name="calendar" size={14} />Prazo: {new Date(ticket.dueAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>}{ticket.domainName && <span><Icon name="globe" size={14} />{ticket.domainName}</span>}{ticket.projectName && <span><Icon name="briefcase" size={14} />{ticket.projectName}</span>}</div></div>
      {mode === 'admin' && <TicketManagement ticket={ticket} onRefresh={onRefresh} onSaved={setTicket} />}
      <div className="tw-messages" ref={threadRef} aria-label="Histórico de mensagens">{history?.hasMore && <button className="tw-button tw-load-older" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? 'Carregando…' : 'Carregar mensagens anteriores'}</button>}{olderError && <p className="tw-inline-error" role="alert">{olderError}</p>}<article className="tw-message original"><header><strong>Solicitação inicial</strong><time dateTime={ticket.createdAt}>{date(ticket.createdAt)}</time></header><p>{ticket.description}</p></article>{messages.map((message) => <article key={message._id} className={`tw-message ${message.internal ? 'internal' : (message.authorRole || message.author?.role) === 'admin' ? 'team' : 'client'}`}><header><strong>{message.internal && <Icon name="lock" size={13} />}{message.authorName || message.author?.name || ((message.authorRole || message.author?.role) === 'admin' ? 'Equipe ThynkXP' : 'Cliente')}{message.internal && <span>Nota interna</span>}</strong><time dateTime={message.createdAt}>{date(message.createdAt)}</time></header><p>{message.body}</p></article>)}</div>
      <form className={`tw-composer ${internal ? 'internal' : ''}`} onSubmit={send}>{mode === 'admin' && <div className="tw-reply-mode"><button type="button" aria-pressed={!internal} className={!internal ? 'active' : ''} onClick={() => setInternal(false)}><Icon name="message-square" size={14} /> Responder cliente</button><button type="button" aria-pressed={internal} className={internal ? 'active' : ''} onClick={() => setInternal(true)}><Icon name="lock" size={14} /> Nota interna</button></div>}<label htmlFor={`reply-${id}`} className="tw-sr-only">{internal ? 'Nota interna' : 'Sua mensagem'}</label><textarea id={`reply-${id}`} value={body} onChange={(event) => setBody(event.target.value)} required maxLength={10000} rows={3} disabled={ticket.status === 'fechado' && mode === 'client'} placeholder={ticket.status === 'fechado' && mode === 'client' ? 'Chamado encerrado. Abra uma nova solicitação se precisar.' : internal ? 'Contexto visível somente para a equipe…' : 'Escreva sua mensagem para continuar a conversa…'} /><div className="tw-composer-footer"><small>{internal ? 'Apenas a equipe verá esta nota.' : 'As respostas ficam salvas neste chamado.'}</small><button className="tw-button primary" disabled={sending || !body.trim() || (ticket.status === 'fechado' && mode === 'client')}>{sending ? 'Enviando…' : internal ? 'Salvar nota' : 'Enviar'}<Icon name="arrow-right" size={15} /></button></div>{sendError && <p className="tw-inline-error" role="alert">{sendError}</p>}{confirmation && <p className="tw-sr-only" role="status">{confirmation}</p>}</form>
    </>}
  </article>;
}

function TicketManagement({ ticket, onRefresh, onSaved }: { ticket: Ticket; onRefresh: () => void; onSaved: (ticket: Ticket) => void }) {
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [owner, setOwner] = useState(ticket.owner || '');
  const [dueAt, setDueAt] = useState(ticket.dueAt?.slice(0, 10) || '');
  const [dirty, setDirty] = useState(false);
  const [draftVersion, setDraftVersion] = useState(ticket.updatedAt);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => { if (!dirty) { setStatus(ticket.status); setPriority(ticket.priority); setOwner(ticket.owner || ''); setDueAt(ticket.dueAt?.slice(0, 10) || ''); setDraftVersion(ticket.updatedAt); } }, [ticket, dirty]);
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try { const data = await api<{ ticket: Ticket }>(`/api/workspace/tickets/${ticket._id}`, { method: 'PATCH', body: JSON.stringify({ status, priority, owner, dueAt: dueAt || null, updatedAt: draftVersion }) }); onSaved(data.ticket); setDirty(false); setSuccess('Atendimento atualizado.'); onRefresh(); }
    catch (err) { setError(issue(err)); if (err instanceof ApiError && err.status === 409) { setConflict(true); onRefresh(); } } finally { setSaving(false); }
  }
  return <details className="tw-management"><summary><Icon name="settings" size={15} /> Organizar atendimento</summary><form onSubmit={save} onChange={() => { setDirty(true); setSuccess(''); }}><div className="tw-form-grid"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as TicketStatus)}>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Prioridade<select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>{Object.entries(PRIORITY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Responsável<input value={owner} onChange={(event) => setOwner(event.target.value)} maxLength={120} placeholder="Nome da pessoa ou equipe" /></label><label>Prazo<input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label></div><button className="tw-button" disabled={!dirty || saving || conflict}>{saving ? 'Salvando…' : 'Salvar organização'}</button>{error && <p className="tw-inline-error" role="alert">{error}</p>}{conflict && <button className="tw-button" type="button" onClick={() => { setDirty(false); setConflict(false); setError(''); }}>Descartar meus ajustes e carregar dados atuais</button>}{success && <p className="tw-inline-success" role="status">{success}</p>}</form></details>;
}

function CreateTicket({ mode, clientId, domainId, onClose, onCreated }: Props & { onClose: () => void; onCreated: (ticket: Ticket) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectPage, setProjectPage] = useState(1);
  const [moreProjects, setMoreProjects] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedClient, setSelectedClient] = useState(clientId || '');
  const [selectedDomain, setSelectedDomain] = useState(domainId || '');
  const [selectedProject, setSelectedProject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('alteracao');
  const [priority, setPriority] = useState<Priority>('normal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [optionsError, setOptionsError] = useState('');
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  useEffect(() => {
    if (mode !== 'admin') return;
    const controller = new AbortController();
    api<{ clients: ClientOption[] }>('/api/admin/clients', { signal: controller.signal }).then((data) => setClients(data.clients.filter((client) => client.status !== 'arquivado'))).catch((err) => { if (!controller.signal.aborted) setOptionsError(issue(err)); });
    return () => controller.abort();
  }, [mode]);
  useEffect(() => {
    if (mode === 'admin' && !selectedClient) { setDomains([]); setProjects([]); return; }
    const controller = new AbortController();
    const query = new URLSearchParams({ limit: '100' });
    if (mode === 'admin') query.set('clientId', selectedClient);
    Promise.all([api<{ domains: DomainOption[] }>(`/api/workspace/domains?${query}`, { signal: controller.signal }), api<{ projects: ProjectOption[]; hasMore: boolean }>(`/api/workspace/projects?${query}`, { signal: controller.signal })])
      .then(([sites, work]) => { setDomains(sites.domains); setProjects(work.projects); setMoreProjects(work.hasMore); setProjectPage(1); setOptionsError(''); })
      .catch((err) => { if (!controller.signal.aborted) setOptionsError(issue(err)); });
    return () => controller.abort();
  }, [mode, selectedClient]);
  async function loadMoreProjects() {
    if (loadingProjects) return;
    setLoadingProjects(true);
    try {
      const params = new URLSearchParams({ limit: '100', page: String(projectPage + 1) });
      if (mode === 'admin') params.set('clientId', selectedClient);
      const data = await api<{ projects: ProjectOption[]; hasMore: boolean }>(`/api/workspace/projects?${params}`);
      setProjects((previous) => Array.from(new Map([...previous, ...data.projects].map((project) => [project._id, project])).values())); setProjectPage((previous) => previous + 1); setMoreProjects(data.hasMore);
    } catch (err) { setOptionsError(issue(err)); } finally { setLoadingProjects(false); }
  }
  async function create(event: FormEvent) {
    event.preventDefault(); if (saving) return; setSaving(true); setError('');
    try { const data = await api<{ ticket: Ticket }>('/api/workspace/tickets', { method: 'POST', body: JSON.stringify({ title: title.trim(), description: description.trim(), category, priority, ...(mode === 'admin' ? { clientId: selectedClient } : {}), ...(selectedDomain ? { domainId: selectedDomain } : {}), ...(selectedProject ? { projectId: selectedProject } : {}) }) }); onCreated(data.ticket); }
    catch (err) { setError(issue(err)); } finally { setSaving(false); }
  }
  return <dialog className="tw-dialog tw-root" ref={dialog} aria-labelledby="new-ticket-title" onCancel={(event) => { if (saving) event.preventDefault(); else onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}><form onSubmit={create}><div className="tw-dialog-heading"><div><span className="tw-eyebrow">VAMOS RESOLVER JUNTOS</span><h2 id="new-ticket-title">Novo chamado</h2><p>Quanto mais contexto, melhor conseguimos ajudar.</p></div><button type="button" className="tw-icon-button" onClick={onClose} disabled={saving} aria-label="Fechar novo chamado"><Icon name="x" /></button></div>{mode === 'admin' && <label>Cliente<select value={selectedClient} required onChange={(event) => { setSelectedClient(event.target.value); setSelectedDomain(''); setSelectedProject(''); }}><option value="">Selecione o cliente</option>{clients.map((client) => <option key={client._id} value={client._id}>{client.business.tradeName || client.business.legalName || client.access?.fullName || client._id}</option>)}</select></label>}<label>Assunto<input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={180} placeholder="Ex.: Atualizar o banner da página inicial" /></label><div className="tw-form-grid"><label>O que você precisa?<select value={category} onChange={(event) => setCategory(event.target.value as Category)}>{Object.entries(CATEGORY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Prioridade<select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>{Object.entries(PRIORITY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Site relacionado<select value={selectedDomain} onChange={(event) => setSelectedDomain(event.target.value)}><option value="">Sem vínculo com um site</option>{domains.map((domain) => <option key={domain._id} value={domain._id}>{domain.hostname}</option>)}</select></label><label>Projeto relacionado<select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)}><option value="">Sem vínculo com um projeto</option>{projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}</select>{moreProjects && <button className="tw-picker-more" type="button" disabled={loadingProjects} onClick={loadMoreProjects}>{loadingProjects ? 'Carregando…' : 'Carregar mais projetos'}</button>}</label></div><label>Descreva a solicitação<textarea required value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={10000} rows={5} placeholder="Conte o que precisa, inclua links e, se houver um problema, os passos para reproduzi-lo." /></label><p className="tw-form-help"><Icon name="shield" size={14} /> Evite enviar senhas. Sua conversa fica disponível à sua conta e à equipe ThynkXP.</p>{optionsError && <p className="tw-inline-error" role="alert">Não foi possível carregar todos os vínculos: {optionsError}</p>}{error && <p className="tw-inline-error" role="alert">{error}</p>}<footer><button type="button" className="tw-button" onClick={onClose} disabled={saving}>Cancelar</button><button className="tw-button primary" disabled={saving || (mode === 'admin' && !selectedClient)}>{saving ? 'Criando chamado…' : 'Criar chamado'}<Icon name="arrow-right" size={16} /></button></footer></form></dialog>;
}
