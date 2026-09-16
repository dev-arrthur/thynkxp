'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useWorkspaceEvents } from '../lib/use-workspace-events';
import '../app/projects-workspace.css';

type Status = 'planejamento' | 'em_andamento' | 'em_revisao' | 'concluido' | 'pausado';
type Milestone = { id: string; title: string; done: boolean; dueAt?: string | null };
type Project = {
  _id: string; clientId: string; clientName: string; name: string; description: string; status: Status;
  priority: 'baixa' | 'normal' | 'alta'; owner: string; startAt: string | null; dueAt: string | null;
  milestones: Milestone[]; progress: number; updatedAt: string; createdAt: string; archivedAt: string | null;
};
type Client = { _id: string; business?: { tradeName?: string; legalName?: string }; access?: { fullName?: string }; status?: string };
type Draft = { clientId: string; name: string; description: string; status: Status; priority: Project['priority']; owner: string; startAt: string; dueAt: string; milestones: Milestone[] };
const STAGES: { value: Status; label: string; short: string }[] = [
  { value: 'planejamento', label: 'Planejamento', short: 'Planejamento' }, { value: 'em_andamento', label: 'Em andamento', short: 'Em produção' },
  { value: 'em_revisao', label: 'Em revisão', short: 'Em revisão' }, { value: 'concluido', label: 'Concluído', short: 'Entregues' }, { value: 'pausado', label: 'Pausado', short: 'Pausados' },
];
const TEMPLATES = [
  { name: 'Site institucional', tasks: ['Briefing e objetivos', 'Arquitetura e conteúdo', 'Design das páginas', 'Desenvolvimento', 'Revisão com o cliente', 'Publicação e entrega'] },
  { name: 'Plataforma / aplicativo', tasks: ['Descoberta e escopo', 'Protótipo e aprovação', 'Desenvolvimento da plataforma', 'Integrações', 'Testes e homologação', 'Lançamento e treinamento'] },
  { name: 'Identidade de marca', tasks: ['Briefing da marca', 'Pesquisa e referências', 'Conceito visual', 'Apresentação e ajustes', 'Manual da marca', 'Entrega dos arquivos'] },
];
const EMPTY: Draft = { clientId: '', name: '', description: '', status: 'planejamento', priority: 'normal', owner: '', startAt: '', dueAt: '', milestones: [] };
const ERRORS: Record<string, string> = {
  unauthorized: 'Sua sessão expirou. Entre novamente para continuar.', forbidden: 'Você não tem permissão para esta ação.',
  service_unavailable: 'Não conseguimos acessar os projetos agora. Tente novamente.', project_conflict: 'Este projeto foi atualizado por outra pessoa. Feche e reabra os detalhes antes de salvar.',
  project_name_required: 'Informe o nome do projeto.', invalid_id: 'Selecione um cliente válido.', client_not_found: 'O cliente não está disponível. Verifique o cadastro.',
  invalid_project_date: 'Informe datas válidas.', project_dates_reversed: 'A entrega deve ser posterior ou igual à data de início.', invalid_project_milestones: 'Revise as etapas: use títulos preenchidos e no máximo 60 itens.',
  project_archived: 'Restaure este projeto antes de fazer alterações.', project_not_found: 'Projeto não encontrado.', request_too_large: 'O conteúdo ultrapassou o limite. Reduza a descrição ou a quantidade de etapas.',
};
function dateLabel(value?: string | null) { return value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) : 'A definir'; }
function isLate(project: Project) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return Boolean(project.dueAt && project.status !== 'concluido' && project.status !== 'pausado' && project.dueAt.slice(0, 10) < today);
}
function stageLabel(status: Status) { return STAGES.find(stage => stage.value === status)?.label || status; }
function clientName(client: Client) { return client.business?.tradeName || client.business?.legalName || client.access?.fullName || 'Cliente'; }
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store', signal: init?.signal || AbortSignal.timeout(15000) });
  const data = await response.json();
  if (!response.ok) throw new Error(ERRORS[data.error] || 'Não foi possível concluir esta ação. Tente novamente.');
  return data as T;
}
function message(error: unknown) { return error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'A conexão demorou para responder. Tente novamente.'; }

export default function ProjectWorkspace({ mode, clientId }: { mode: 'admin' | 'client'; clientId?: string }) {
  const admin = mode === 'admin';
  const api = useCallback(async <T,>(url: string, init?: RequestInit): Promise<T> => {
    const headers = new Headers(init?.headers);
    headers.set('x-workspace-role', mode);
    return request<T>(url, { ...init, headers });
  }, [mode]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsError, setClientsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [clientFilter, setClientFilter] = useState(clientId || '');
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [dialog, setDialog] = useState<'detail' | 'new' | 'edit' | null>(null);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  savingRef.current = saving;
  const draftVersion = useRef('');
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openDialogRef = useRef(dialog);
  openDialogRef.current = dialog;
  const abortRef = useRef<AbortController | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const load = useCallback(async (foreground = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort('timeout'), 15000);
    if (foreground) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (query) params.set('q', query);
      if (status) params.set('status', status);
      if (admin && clientFilter) params.set('clientId', clientFilter);
      if (admin && archived) params.set('archived', '1');
      const data = await api<{ projects: Project[]; total: number; hasMore: boolean }>(`/api/workspace/projects?${params}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setProjects(data.projects); setTotal(data.total); setHasMore(data.hasMore); setError('');
      const openProject = selectedRef.current;
      if (openProject && (openDialogRef.current === 'detail' || openDialogRef.current === 'edit')) {
        const current = data.projects.find(project => project._id === openProject._id);
        if (current) setSelected(current);
        else {
          const detailParams = new URLSearchParams({ id: openProject._id });
          if (admin && openProject.archivedAt) detailParams.set('archived', '1');
          const detail = await api<{ projects: Project[] }>(`/api/workspace/projects?${detailParams}`, { signal: controller.signal });
          if (controller.signal.aborted || selectedRef.current?._id !== openProject._id) return;
          if (detail.projects[0]) setSelected(detail.projects[0]);
          else {
            setSelected(null); setDialog(null);
            setToast('Este projeto não está mais disponível nesta visualização.');
          }
        }
      }
    } catch (reason) {
      if (!controller.signal.aborted) setError(message(reason));
      else if (controller.signal.reason === 'timeout') setError('A conexão demorou para responder. Tente novamente.');
    } finally {
      window.clearTimeout(timeout);
      if (abortRef.current === controller) setLoading(false);
    }
  }, [admin, api, archived, clientFilter, page, query, status]);
  const connection = useWorkspaceEvents(() => { void load(); });
  useEffect(() => { void load(true); return () => abortRef.current?.abort(); }, [load]);
  useEffect(() => { const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (!admin) return;
    let active = true;
    void api<{ clients: Client[] }>('/api/admin/clients').then(data => { if (active) setClients(data.clients.filter(client => client.status !== 'inativo' && client.status !== 'arquivado')); }).catch(reason => { if (active) setClientsError(message(reason)); });
    return () => { active = false; };
  }, [admin, api]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (admin && !clientId && /^[a-f\d]{24}$/i.test(params.get('clientId') || '')) setClientFilter(params.get('clientId') || '');
    if (admin && params.get('new') === '1') {
      const preset = clientId || (/^[a-f\d]{24}$/i.test(params.get('clientId') || '') ? params.get('clientId') || '' : '');
      setDraft({ ...EMPTY, clientId: preset, milestones: [] }); setDialog('new');
    }
    const id = params.get('id');
    if (!id || !/^[a-f\d]{24}$/i.test(id)) return;
    let active = true;
    void api<{ projects: Project[] }>(`/api/workspace/projects?id=${encodeURIComponent(id)}`).then(data => {
      if (active && data.projects[0]) { setSelected(data.projects[0]); setDialog('detail'); }
      else if (active) setError('Projeto não encontrado ou indisponível.');
    }).catch(reason => { if (active) setError(message(reason)); });
    return () => { active = false; };
  }, [admin, api, clientId]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 4500); return () => window.clearTimeout(timer); }, [toast]);
  const closeDialog = useCallback(() => { if (!savingRef.current) { setDialog(null); setFormError(''); setArchiveConfirm(false); } }, []);
  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('button, input, select, textarea')?.focus(), 0);
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); closeDialog(); }
      if (event.key !== 'Tab') return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]');
      if (!nodes?.length) return;
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keyboard);
    return () => { window.clearTimeout(timer); document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, [dialog, closeDialog]);

  function open(project: Project) { setSelected(project); setFormError(''); setArchiveConfirm(false); setDialog('detail'); }
  function create() { setDraft({ ...EMPTY, clientId: clientFilter || clients[0]?._id || '', milestones: [] }); setSelected(null); setFormError(''); setDialog('new'); }
  function edit(project: Project) {
    draftVersion.current = project.updatedAt;
    setDraft({ clientId: project.clientId, name: project.name, description: project.description, status: project.status, priority: project.priority, owner: project.owner, startAt: project.startAt?.slice(0, 10) || '', dueAt: project.dueAt?.slice(0, 10) || '', milestones: project.milestones.map(item => ({ ...item, dueAt: item.dueAt?.slice(0, 10) || '' })) });
    setFormError(''); setDialog('edit');
  }
  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(previous => ({ ...previous, [key]: value })); }
  async function mutate(project: Project, changes: Record<string, unknown>, method = 'PATCH') {
    setSaving(true); setFormError('');
    try {
      const data = await api<{ project: Project }>(`/api/workspace/projects/${project._id}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...changes, updatedAt: project.updatedAt }) });
      setSelected(data.project); setArchiveConfirm(false); setToast(method === 'DELETE' ? 'Projeto arquivado. Você pode restaurá-lo depois.' : 'Projeto atualizado.');
      if (method === 'DELETE' || changes.restore) setDialog(null);
      void load();
    } catch (reason) { setFormError(message(reason)); } finally { setSaving(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.clientId) { setFormError('Selecione o cliente deste projeto.'); return; }
    if (draft.milestones.some(item => !item.title.trim())) { setFormError('Preencha o título de todas as etapas ou remova as etapas vazias.'); return; }
    setSaving(true); setFormError('');
    try {
      const editing = dialog === 'edit' && selected;
      const data = await api<{ project: Project }>(editing ? `/api/workspace/projects/${selected._id}` : '/api/workspace/projects', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, ...(editing ? { updatedAt: draftVersion.current } : {}) }),
      });
      setSelected(data.project); setDialog('detail'); setToast(editing ? 'Alterações salvas.' : 'Projeto criado e disponível no portal do cliente.'); void load();
    } catch (reason) { setFormError(message(reason)); } finally { setSaving(false); }
  }
  const currentCount = projects.filter(project => project.status === 'em_andamento').length;
  const lateCount = projects.filter(isLate).length;

  return <section className={`pw-workspace pw-${mode}`}>
    <header className="pw-header"><div><span className="pw-eyebrow"><Icon name="layers" size={15} /> {admin ? 'Operação conectada' : 'Da ideia à entrega'}</span><h1>{admin ? 'Projetos' : 'Seus projetos'}<span>.</span></h1><p>{admin ? 'Planeje cada entrega. Dê ao cliente visibilidade de cada conquista.' : 'Acompanhe as entregas, os próximos passos e tudo que estamos construindo juntos.'}</p></div><div className="pw-header-actions"><span className={`pw-live ${connection}`}><i />{connection === 'live' ? 'Atualizações ao vivo' : connection === 'reconnecting' ? 'Reconectando' : 'Conectando'}</span>{admin && <button className="pw-button pw-primary" onClick={create}><Icon name="plus" size={18} /> Novo projeto</button>}</div></header>
    <div className="pw-summary"><div><span className="pw-summary-icon"><Icon name="folder" /></span><div><strong>{total.toString().padStart(2, '0')}</strong><span>Projetos encontrados</span></div></div><div><span className="pw-summary-icon orange"><Icon name="code" /></span><div><strong>{currentCount.toString().padStart(2, '0')}</strong><span>Em produção nesta página</span></div></div><div><span className="pw-summary-icon amber"><Icon name="clock" /></span><div><strong>{lateCount.toString().padStart(2, '0')}</strong><span>Prazos vencidos nesta página</span></div></div><div className="pw-summary-note"><Icon name="workflow" size={24} /><p>{admin ? 'Uma visão compartilhada, do planejamento à entrega.' : 'Cada etapa concluída aproxima sua próxima conquista.'}</p></div></div>
    <div className="pw-controls"><label className="pw-search"><Icon name="search" size={19} /><input aria-label="Buscar projetos" placeholder={admin ? 'Buscar projeto ou cliente...' : 'Buscar projeto...'} value={search} onChange={event => setSearch(event.target.value)} /></label>{admin && <label className="pw-select-label"><span className="pw-sr">Filtrar por cliente</span><select value={clientFilter} onChange={event => { setClientFilter(event.target.value); setPage(1); }}><option value="">Todos os clientes</option>{clients.map(client => <option key={client._id} value={client._id}>{clientName(client)}</option>)}</select></label>}{admin && <label className="pw-archive-filter"><input type="checkbox" checked={archived} onChange={event => { setArchived(event.target.checked); setPage(1); }} />Arquivados</label>}</div>
    <div className="pw-tabs" aria-label="Filtrar por etapa"><button className={!status ? 'active' : ''} aria-pressed={!status} onClick={() => { setStatus(''); setPage(1); }}>Todos</button>{STAGES.map(stage => <button key={stage.value} className={status === stage.value ? 'active' : ''} aria-pressed={status === stage.value} onClick={() => { setStatus(stage.value); setPage(1); }}>{stage.short}</button>)}</div>
    {error && <div className="pw-notice pw-error" role="alert"><span>{error}</span><button onClick={() => void load(true)}>Tentar novamente</button></div>}
    {clientsError && admin && <div className="pw-notice" role="status">Não foi possível carregar as opções de clientes. Atualize a página para tentar novamente.</div>}
    {loading ? <div className="pw-grid" aria-label="Carregando projetos" aria-busy="true">{[0, 1, 2].map(item => <div className="pw-skeleton" key={item}><i /><i /><i /><i /></div>)}</div> : projects.length ? <><div className="pw-grid">{projects.map(project => <button className="pw-card" key={project._id} onClick={() => open(project)}><div className="pw-card-top"><span className={`pw-status ${project.status}`}><i />{stageLabel(project.status)}</span>{project.priority === 'alta' && <span className="pw-priority"><Icon name="zap" size={13} /> Alta</span>}</div><span className="pw-card-client">{admin ? project.clientName : 'THYNKXP × VOCÊ'}</span><h2>{project.name}</h2><p className="pw-card-description">{project.description || 'Uma nova ideia ganhando forma. Acompanhe as próximas etapas.'}</p><div className="pw-progress-label"><span>{project.milestones.filter(item => item.done).length} de {project.milestones.length} etapas concluídas</span><strong>{project.progress}%</strong></div><div className="pw-progress" role="progressbar" aria-label={`Progresso de ${project.name}`} aria-valuenow={project.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${project.progress}%` }} /></div><div className="pw-card-bottom"><span className={isLate(project) ? 'pw-overdue' : ''}><Icon name="calendar" size={15} />{dateLabel(project.dueAt)}{isLate(project) ? ' · vencido' : ''}</span><span className="pw-card-arrow"><Icon name="arrow-up-right" size={19} /></span></div></button>)}</div><div className="pw-pagination"><span>{(page - 1) * 30 + 1}–{(page - 1) * 30 + projects.length} de {total} projetos</span><div><button className="pw-button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button><button className="pw-button" disabled={!hasMore} onClick={() => setPage(value => value + 1)}>Próxima</button></div></div></> : !error && <div className="pw-empty"><span><Icon name="folder" size={34} /></span><h2>{query || status || clientFilter || archived ? 'Nenhum projeto encontrado' : admin ? 'Grandes entregas começam aqui' : 'Seu próximo projeto começa aqui'}</h2><p>{query || status || clientFilter || archived ? 'Ajuste a busca ou os filtros para encontrar o que procura.' : admin ? 'Crie um projeto, organize as etapas e mantenha seu cliente por dentro de cada avanço.' : 'Os projetos vinculados à sua conta aparecerão aqui com etapas, prazos e progresso.'}</p>{admin && <button className="pw-button pw-primary" onClick={create}><Icon name="plus" size={17} /> Criar projeto</button>}</div>}
    {dialog && <div className="pw-overlay" onMouseDown={event => { if (event.target === event.currentTarget) closeDialog(); }}><div className="pw-dialog" role="dialog" aria-modal="true" aria-labelledby="pw-dialog-title" ref={dialogRef}><header className="pw-dialog-header"><div><span className="pw-eyebrow">{dialog === 'detail' ? selected?.clientName : dialog === 'edit' ? 'Ajuste a rota' : 'Próxima conquista'}</span><h2 id="pw-dialog-title">{dialog === 'detail' ? selected?.name : dialog === 'edit' ? 'Editar projeto' : 'Novo projeto'}</h2></div><button className="pw-icon-button" onClick={closeDialog} disabled={saving} aria-label="Fechar detalhes"><Icon name="x" /></button></header>
      {formError && <div className="pw-notice pw-error" role="alert">{formError}</div>}
      {dialog === 'detail' && selected ? <div className="pw-detail"><div className="pw-detail-badges"><span className={`pw-status ${selected.status}`}><i />{stageLabel(selected.status)}</span><span className="pw-detail-priority">Prioridade {selected.priority}</span>{selected.archivedAt && <span className="pw-status">Arquivado</span>}</div><p className="pw-description">{selected.description || 'Ainda não há uma descrição para este projeto.'}</p><div className="pw-detail-meta"><div><Icon name="users" size={18} /><span>Responsável<strong>{selected.owner || 'Equipe ThynkXP'}</strong></span></div><div><Icon name="calendar" size={18} /><span>Início<strong>{dateLabel(selected.startAt)}</strong></span></div><div className={isLate(selected) ? 'pw-overdue' : ''}><Icon name="clock" size={18} /><span>Previsão de entrega<strong>{dateLabel(selected.dueAt)}</strong></span></div></div><div className="pw-section-heading"><h3>Rota da entrega</h3><strong>{selected.progress}%</strong></div><div className="pw-progress pw-progress-large"><span style={{ width: `${selected.progress}%` }} /></div><div className="pw-milestones">{selected.milestones.length ? selected.milestones.map((item, index) => <label key={item.id} className={`pw-milestone ${item.done ? 'done' : ''}`}><input type="checkbox" checked={item.done} disabled={!admin || saving || Boolean(selected.archivedAt)} onChange={() => void mutate(selected, { milestones: selected.milestones.map(current => current.id === item.id ? { ...current, done: !current.done } : current) })} /><span className="pw-step-number">{String(index + 1).padStart(2, '0')}</span><span className="pw-milestone-title">{item.title}{item.dueAt && <small>{dateLabel(item.dueAt)}</small>}</span>{item.done && <Icon name="check-circle" size={18} />}</label>) : <p className="pw-muted">As etapas serão definidas no planejamento deste projeto.</p>}</div>{admin && !selected.archivedAt && <label className="pw-field pw-stage-edit">Etapa atual<select value={selected.status} disabled={saving} onChange={event => void mutate(selected, { status: event.target.value })}>{STAGES.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></label>}
        <div className="pw-detail-footer"><small>Atualizado em {dateLabel(selected.updatedAt)}</small>{admin ? <div>{selected.archivedAt ? <button className="pw-button pw-primary" disabled={saving} onClick={() => void mutate(selected, { restore: true })}>Restaurar projeto</button> : <><button className="pw-button pw-danger" disabled={saving} onClick={() => setArchiveConfirm(value => !value)}>Arquivar</button><button className="pw-button pw-primary" disabled={saving} onClick={() => edit(selected)}><Icon name="edit" size={16} /> Editar projeto</button></>}</div> : <button className="pw-button" onClick={closeDialog}>Fechar</button>}</div>{archiveConfirm && <div className="pw-archive-confirm"><p>Arquivar oculta este projeto do portal do cliente. Você poderá restaurá-lo pela lista de arquivados.</p><button className="pw-button pw-danger" disabled={saving} onClick={() => void mutate(selected, {}, 'DELETE')}>{saving ? 'Arquivando...' : 'Confirmar arquivamento'}</button></div>}</div> : <form className="pw-form" onSubmit={submit}><fieldset disabled={saving}>{dialog === 'new' && <div className="pw-template"><span>Comece com uma rota pronta</span><div>{TEMPLATES.map(template => <button type="button" key={template.name} onClick={() => setDraft(previous => ({ ...previous, name: previous.name || template.name, milestones: template.tasks.map(title => ({ id: crypto.randomUUID(), title, done: false, dueAt: '' })) }))}><Icon name="sparkles" size={13} />{template.name}</button>)}</div><small>Escolher um modelo substitui as etapas do formulário.</small></div>}<div className="pw-form-grid"><label className="pw-field pw-wide">Cliente<select required value={draft.clientId} onChange={event => updateDraft('clientId', event.target.value)}><option value="">Selecione o cliente</option>{dialog === 'edit' && selected && !clients.some(client => client._id === selected.clientId) && <option value={selected.clientId}>{selected.clientName} (cadastro indisponível)</option>}{clients.map(client => <option key={client._id} value={client._id}>{clientName(client)}</option>)}</select>{!clients.length && <small>Cadastre um cliente em <a href="/admin/clientes">Clientes</a> para vincular o projeto.</small>}</label><label className="pw-field pw-wide">Nome do projeto<input required maxLength={160} value={draft.name} onChange={event => updateDraft('name', event.target.value)} placeholder="Ex.: Nova plataforma de agendamentos" /></label><label className="pw-field pw-wide">Objetivo e escopo<textarea maxLength={6000} rows={3} value={draft.description} onChange={event => updateDraft('description', event.target.value)} placeholder="O que vamos construir e qual resultado esperamos alcançar?" /></label><label className="pw-field">Etapa<select value={draft.status} onChange={event => updateDraft('status', event.target.value as Status)}>{STAGES.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></label><label className="pw-field">Prioridade<select value={draft.priority} onChange={event => updateDraft('priority', event.target.value as Project['priority'])}><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option></select></label><label className="pw-field pw-wide">Responsável<input maxLength={160} value={draft.owner} onChange={event => updateDraft('owner', event.target.value)} placeholder="Nome da pessoa ou equipe" /></label><label className="pw-field">Data de início<input type="date" value={draft.startAt} onChange={event => updateDraft('startAt', event.target.value)} /></label><label className="pw-field">Previsão de entrega<input type="date" min={draft.startAt || undefined} value={draft.dueAt} onChange={event => updateDraft('dueAt', event.target.value)} /></label></div><div className="pw-section-heading"><h3>Etapas do projeto</h3><span>{draft.milestones.length}/60</span></div><p className="pw-help">As etapas e o progresso ficam visíveis no portal do cliente.</p><div className="pw-edit-milestones">{draft.milestones.map((item, index) => <div key={item.id}><input type="checkbox" aria-label={`Etapa ${index + 1} concluída`} checked={item.done} onChange={event => updateDraft('milestones', draft.milestones.map(current => current.id === item.id ? { ...current, done: event.target.checked } : current))} /><input required aria-label={`Título da etapa ${index + 1}`} maxLength={220} value={item.title} placeholder={`Etapa ${index + 1}`} onChange={event => updateDraft('milestones', draft.milestones.map(current => current.id === item.id ? { ...current, title: event.target.value } : current))} /><input aria-label={`Prazo da etapa ${index + 1}`} type="date" value={item.dueAt || ''} onChange={event => updateDraft('milestones', draft.milestones.map(current => current.id === item.id ? { ...current, dueAt: event.target.value } : current))} /><button className="pw-icon-button" type="button" aria-label={`Remover etapa ${index + 1}`} onClick={() => updateDraft('milestones', draft.milestones.filter(current => current.id !== item.id))}><Icon name="x" size={16} /></button></div>)}</div><button className="pw-button pw-add-step" type="button" disabled={draft.milestones.length >= 60} onClick={() => updateDraft('milestones', [...draft.milestones, { id: crypto.randomUUID(), title: '', done: false, dueAt: '' }])}><Icon name="plus" size={16} /> Adicionar etapa</button><div className="pw-form-footer"><button type="button" className="pw-button" onClick={closeDialog}>Cancelar</button><button className="pw-button pw-primary" type="submit">{saving ? 'Salvando...' : dialog === 'edit' ? 'Salvar alterações' : 'Criar projeto'}<Icon name="arrow-right" size={16} /></button></div></fieldset></form>}
    </div></div>}
    {toast && <div className="pw-toast" role="status"><Icon name="check-circle" size={18} />{toast}</div>}
  </section>;
}
