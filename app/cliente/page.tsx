'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import BrandWordmark from '../../components/BrandWordmark';
import Icon, { type IconName } from '../../components/Icon';
import TicketWorkspace from '../../components/TicketWorkspace';
import ProjectWorkspace from '../../components/ProjectWorkspace';
import { useWorkspaceEvents } from '../../lib/use-workspace-events';
import './portal-ecosystem.css';

type Section = 'overview' | 'sites' | 'projects' | 'chamados' | 'account';
type SessionUser = { email?: string; name?: string; company?: string; clientId?: string };
type Client = { _id: string; status: string; business: { tradeName?: string; legalName?: string; cnpj?: string; email?: string; phone?: string }; access: { fullName?: string; email?: string }; location?: { city?: string; state?: string }; createdAt?: string };
type Domain = { _id: string; clientId: string; hostname: string; label?: string; type: 'site' | 'plataforma' | 'loja' | 'outro'; status: 'pendente' | 'ativo' | 'pausado' };
const NAV: { id: Section; title: string; icon: IconName }[] = [{ id: 'overview', title: 'Visão geral', icon: 'home' }, { id: 'sites', title: 'Meus sites', icon: 'globe' }, { id: 'projects', title: 'Projetos', icon: 'briefcase' }, { id: 'chamados', title: 'Chamados', icon: 'message-square' }, { id: 'account', title: 'Minha conta', icon: 'users' }];
const DOMAIN_STATUS = { ativo: 'Ativo', pendente: 'Em preparação', pausado: 'Pausado' };
const DOMAIN_TYPE = { site: 'Site institucional', plataforma: 'Plataforma', loja: 'Loja virtual', outro: 'Endereço digital' };

async function read<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000), headers: { 'X-Workspace-Role': 'client' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 401 ? 'Sua sessão expirou. Entre novamente para continuar.' : 'Não foi possível atualizar os dados do portal. Tente novamente.');
  return data as T;
}
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase(); }
function safeDomainLink(hostname: string) {
  try { const url = new URL(`https://${hostname}`); return url.protocol === 'https:' && url.hostname === hostname.toLowerCase() && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash ? url.href : null; } catch { return null; }
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/cliente/login', { signal: AbortSignal.timeout(20000), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }) });
      if (!response.ok) { setError(response.status === 429 ? 'Muitas tentativas. Aguarde alguns minutos para tentar novamente.' : response.status >= 500 ? 'O portal está temporariamente indisponível. Tente novamente em instantes.' : 'Confira seu e-mail e senha e tente novamente.'); return; }
      onLoggedIn();
    } catch { setError('Não foi possível conectar. Confira sua conexão e tente novamente.'); }
    finally { setLoading(false); }
  }
  return <main className="pe-login pe-root"><section className="pe-login-story"><a href="/" className="pe-logo"><BrandWordmark inverse /></a><div className="pe-login-story-main"><span className="pe-kicker">THYNKXP · PORTAL DO CLIENTE</span><h1>Grandes ideias.<br />Próximos passos.<br /><em>Tudo conectado.</em></h1><p>Um espaço para acompanhar seus projetos, acessar suas plataformas e conversar com quem cuida do seu digital.</p><div className="pe-login-features"><span><Icon name="briefcase" size={18} /> Projetos e entregas</span><span><Icon name="globe" size={18} /> Seus sites e plataformas</span><span><Icon name="message-square" size={18} /> Atendimento próximo</span></div></div><div className="pe-login-signature">Estratégia. Design. Tecnologia.<span>Feito para avançar.</span></div></section><section className="pe-login-access"><form method="post" action="/api/cliente/login" onSubmit={submit}><span className="pe-kicker">SEU ESPAÇO THYNKXP</span><h2>Bom ter você aqui.</h2><p>Entre com o acesso enviado pela nossa equipe.</p><label>E-mail<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com.br" required maxLength={180} /></label><label>Senha<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha de acesso" required maxLength={200} /></label>{error && <div className="pe-error" role="alert">{error}</div>}<button className="pe-button primary" disabled={!hydrated || loading}>{loading ? 'Entrando…' : 'Entrar no portal'}<Icon name="arrow-right" size={18} /></button><small className="pe-login-help"><Icon name="lock" size={14} /> Precisa de acesso? Fale com a equipe ThynkXP.</small></form><a className="pe-back-home" href="/">← Voltar para o site</a></section></main>;
}

export default function Cliente() {
  const [auth, setAuth] = useState<'loading' | 'in' | 'out' | 'error'>('loading');
  const [user, setUser] = useState<SessionUser>({});
  const [authRevision, setAuthRevision] = useState(0);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setAuth('loading');
    fetch('/api/cliente/session', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) }).then(async (response) => { if (response.status === 401) { setUser({}); setAuth('out'); return; } if (!response.ok) throw new Error('session_unavailable'); const data = await response.json(); setUser(data.user || {}); setAuth('in'); }).catch(() => { if (!controller.signal.aborted) setAuth('error'); });
    return () => controller.abort();
  }, [authRevision]);
  async function logout() {
    setLoggingOut(true); setLogoutError('');
    try { const response = await fetch('/api/cliente/session', { method: 'DELETE', signal: AbortSignal.timeout(15000) }); if (!response.ok) throw new Error('logout_failed'); setUser({}); setAuth('out'); }
    catch { setLogoutError('Não foi possível encerrar a sessão. Tente novamente.'); }
    finally { setLoggingOut(false); }
  }
  if (auth === 'loading') return <main className="pe-loading pe-root"><BrandWordmark /><span className="pe-spinner" /><p>Preparando seu espaço…</p></main>;
  if (auth === 'error') return <main className="pe-loading pe-root"><BrandWordmark /><h1>Vamos tentar de novo?</h1><p>Não foi possível verificar sua sessão agora.</p><button className="pe-button primary" onClick={() => setAuthRevision((v) => v + 1)}>Tentar novamente</button></main>;
  if (auth === 'out') return <LoginScreen onLoggedIn={() => setAuthRevision((v) => v + 1)} />;
  return <ClientPortal user={user} onLogout={logout} loggingOut={loggingOut} logoutError={logoutError} />;
}

function ClientPortal({ user, onLogout, loggingOut, logoutError }: { user: SessionUser; onLogout: () => void; loggingOut: boolean; logoutError: string }) {
  const [section, setSection] = useState<Section>('overview');
  const [domainId, setDomainId] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [counts, setCounts] = useState<{ projects: number | null; tickets: number | null; waiting: number | null }>({ projects: null, tickets: null, waiting: null });
  const [domainsLoaded, setDomainsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [copied, setCopied] = useState('');
  const [copyError, setCopyError] = useState(false);
  const [origin, setOrigin] = useState('');
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  const connection = useWorkspaceEvents(refresh);
  const name = client?.access.fullName || user.name || 'Cliente';
  const company = client?.business.tradeName || client?.business.legalName || user.company || 'Minha empresa';
  const email = client?.access.email || user.email || '';
  const activeDomain = domains.find((domain) => domain._id === domainId);
  const supportLink = origin ? `${origin}/cliente?section=chamados${domainId ? `&domain=${encodeURIComponent(domainId)}` : ''}` : '';
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSection = params.get('section'); const initialDomain = params.get('domain') || '';
    setOrigin(window.location.origin); setDomainId(initialDomain);
    if (NAV.some((item) => item.id === initialSection)) setSection(initialSection as Section); else if (initialDomain) setSection('chamados');
    function restore() { const p = new URLSearchParams(window.location.search); const next = p.get('section'); setDomainId(p.get('domain') || ''); setSection(NAV.some((item) => item.id === next) ? next as Section : 'overview'); }
    window.addEventListener('popstate', restore); return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([read<{ client: Client }>('/api/workspace/me', controller.signal), read<{ domains: Domain[] }>('/api/workspace/domains', controller.signal), read<{ total: number }>('/api/workspace/projects?limit=1', controller.signal), read<{ total: number }>('/api/workspace/tickets?limit=1', controller.signal), read<{ total: number }>('/api/workspace/tickets?limit=1&status=aguardando_cliente', controller.signal)])
      .then(([profile, sites, projects, tickets, waiting]) => {
        if (controller.signal.aborted) return;
        if (profile.status === 'fulfilled') setClient(profile.value.client);
        if (sites.status === 'fulfilled') { setDomains(sites.value.domains); setDomainsLoaded(true); }
        setCounts({ projects: projects.status === 'fulfilled' ? projects.value.total : null, tickets: tickets.status === 'fulfilled' ? tickets.value.total : null, waiting: waiting.status === 'fulfilled' ? waiting.value.total : null });
        const failed = [profile, sites, projects, tickets, waiting].find((result) => result.status === 'rejected');
        setError(failed?.status === 'rejected' ? (failed.reason instanceof Error ? failed.reason.message : 'Parte dos dados não pôde ser atualizada.') : ''); setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  function navigate(next: Section, nextDomain = domainId) { setSection(next); setDomainId(nextDomain); setCopied(''); setCopyError(false); const params = new URLSearchParams({ section: next }); if (nextDomain) params.set('domain', nextDomain); window.history.pushState({}, '', `/cliente?${params}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function copyLink(domain?: Domain) {
    const link = domain ? `${window.location.origin}/cliente?section=chamados&domain=${encodeURIComponent(domain._id)}` : supportLink;
    try { await navigator.clipboard.writeText(link); setCopied(domain?._id || 'portal'); setCopyError(false); }
    catch { setCopyError(true); setCopied(''); }
  }
  return <main className="pe-root pe-portal"><aside className="pe-sidebar"><a href="/" className="pe-logo"><BrandWordmark inverse /></a><div className="pe-workspace"><span>{initials(company)}</span><div><strong>{company}</strong><small>Portal do cliente</small></div></div><span className="pe-nav-label">SEU ECOSSISTEMA</span><nav aria-label="Navegação do portal">{NAV.map((item) => <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => navigate(item.id)} aria-current={section === item.id ? 'page' : undefined}><Icon name={item.icon} size={18} /><span>{item.title}</span>{item.id === 'chamados' && counts.waiting !== null && counts.waiting > 0 && <b>{counts.waiting}</b>}</button>)}</nav><div className="pe-sidebar-tip"><span><Icon name="sparkles" size={17} /></span><strong>Vamos construir<br />o próximo passo?</strong><p>Sua próxima ideia começa com uma conversa.</p><button onClick={() => navigate('chamados')}>Fale com a equipe <Icon name="arrow-right" size={14} /></button></div><div className="pe-profile"><span>{initials(name)}</span><div><strong>{name}</strong><small>{email}</small></div><button aria-label="Sair do portal" title="Sair" onClick={onLogout} disabled={loggingOut}><Icon name="logout" size={18} /></button></div></aside><div className="pe-main"><header className="pe-topbar"><div><span>Seu espaço, conectado.</span><strong>{NAV.find((item) => item.id === section)?.title}</strong></div><div><span className={`pe-live ${connection === 'live' ? 'online' : ''}`}><i />{connection === 'live' ? 'Conectado' : connection === 'connecting' ? 'Conectando' : 'Reconectando'}</span><span className="pe-topbar-avatar">{initials(name)}</span></div></header><div className="pe-content">{logoutError && <div className="pe-error" role="alert">{logoutError}</div>}{error && <div className="pe-error" role="alert"><span>{error}</span><button onClick={refresh}>Tentar novamente</button></div>}
      {section === 'overview' && <><div className="pe-heading"><div><span className="pe-kicker">BEM-VINDO AO SEU PORTAL</span><h1>Olá, {name.split(' ')[0]}.<br /><span>O próximo passo é aqui.</span></h1><p>Seus projetos, plataformas e conversas com a ThynkXP, no mesmo lugar.</p></div><button className="pe-button" onClick={() => navigate('chamados')}><Icon name="message-square" size={17} /> Falar com a equipe</button></div><section className="pe-welcome"><div><span className="pe-welcome-tag"><i /> SEU ECOSSISTEMA DIGITAL</span><h2>Menos mensagens espalhadas.<br />Mais clareza para avançar.</h2><p>Acompanhe o que estamos construindo juntos e transforme novas ideias em solicitações.</p><button className="pe-button primary" onClick={() => navigate('projects')}>Acompanhar projetos <Icon name="arrow-right" size={16} /></button></div><div className="pe-orbit" aria-hidden="true"><span className="pe-orbit-center">xp<span>conectado</span></span><span className="pe-orbit-node n1"><Icon name="globe" size={22} /></span><span className="pe-orbit-node n2"><Icon name="briefcase" size={21} /></span><span className="pe-orbit-node n3"><Icon name="message-square" size={22} /></span><span className="pe-orbit-label">Sua empresa, no centro.</span></div></section><section className="pe-stats">{([{ title: 'Sites e plataformas', value: domainsLoaded ? domains.length : null, label: 'Endereços vinculados à sua conta', icon: 'globe', section: 'sites' }, { title: 'Projetos', value: counts.projects, label: 'Trabalho e entregas para acompanhar', icon: 'briefcase', section: 'projects' }, { title: 'Chamados', value: counts.tickets, label: 'Histórico de solicitações e conversas', icon: 'message-square', section: 'chamados' }, { title: 'Aguardando você', value: counts.waiting, label: 'Chamados que precisam da sua resposta', icon: 'clock', section: 'chamados' }] as const).map((item) => <button className="pe-stat" key={item.title} onClick={() => navigate(item.section)}><div><span>{item.title}</span><Icon name={item.icon} size={17} /></div><strong>{item.value ?? '—'}</strong><small>{loading ? 'Atualizando…' : item.label}</small></button>)}</section><div className="pe-overview-grid"><section className="pe-card"><header><div><small>ACESSO RÁPIDO</small><h2>Seus endereços digitais</h2></div><button className="pe-text-button" onClick={() => navigate('sites')}>Ver todos <Icon name="arrow-right" size={14} /></button></header>{domains.length ? <div className="pe-quick-sites">{domains.slice(0, 3).map((domain) => <button key={domain._id} onClick={() => navigate('sites', domain._id)}><span><Icon name={domain.type === 'loja' ? 'shopping-cart' : domain.type === 'plataforma' ? 'layers' : 'globe'} size={18} /></span><div><strong>{domain.label || domain.hostname}</strong><small>{domain.hostname}</small></div><i className={`pe-domain-dot ${domain.status}`} /><Icon name="chevron-right" size={15} /></button>)}</div> : <div className="pe-empty compact"><Icon name="globe" size={26} /><h3>{loading ? 'Buscando seus endereços…' : domainsLoaded ? 'Seu espaço está pronto para crescer' : 'Não foi possível carregar os endereços'}</h3><p>{domainsLoaded ? 'Os sites e plataformas vinculados pela equipe aparecerão aqui.' : 'Atualize o portal para tentar novamente.'}</p></div>}</section><section className="pe-next-step"><span className="pe-next-icon"><Icon name={counts.waiting ? 'message-square' : 'sparkles'} size={22} /></span><small>{counts.waiting ? 'A CONVERSA CONTINUA' : 'UMA NOVA IDEIA?'}</small><h2>{counts.waiting ? `${counts.waiting} chamado${counts.waiting === 1 ? '' : 's'} aguardando sua resposta.` : 'Vamos tirar do papel.'}</h2><p>{counts.waiting ? 'Sua resposta ajuda a equipe a seguir com o atendimento.' : 'Uma mudança no site, uma melhoria na plataforma ou uma dúvida. A equipe está por aqui.'}</p><button className="pe-text-button" onClick={() => navigate('chamados')}>{counts.waiting ? 'Abrir chamados' : 'Começar uma conversa'}<Icon name="arrow-right" size={16} /></button></section></div></>}
      {section === 'sites' && <><div className="pe-heading"><div><span className="pe-kicker">SEU ECOSSISTEMA</span><h1>Meus sites e plataformas.</h1><p>Os endereços vinculados à sua empresa, com acesso e suporte em um só lugar.</p></div></div>{!domains.length ? <div className="pe-empty pe-card"><Icon name="globe" size={32} /><h2>{domainsLoaded ? 'Seus próximos endereços começam aqui' : 'Carregando seus endereços'}</h2><p>A equipe ThynkXP cadastra os domínios e plataformas da sua empresa. Assim que estiverem vinculados, aparecerão neste espaço.</p><button className="pe-button" onClick={() => navigate('chamados', '')}>Falar com a equipe</button></div> : <div className="pe-domains">{domains.map((domain) => { const url = safeDomainLink(domain.hostname); return <article className={`pe-domain ${domainId === domain._id ? 'selected' : ''}`} key={domain._id}><div className="pe-domain-head"><span className="pe-domain-icon"><Icon name={domain.type === 'loja' ? 'shopping-cart' : domain.type === 'plataforma' ? 'layers' : 'globe'} size={25} /></span><span className={`pe-domain-status ${domain.status}`}><i />{DOMAIN_STATUS[domain.status] || domain.status}</span></div><small>{DOMAIN_TYPE[domain.type] || 'Endereço digital'}</small><h2>{domain.label || domain.hostname}</h2><p>{domain.hostname}</p><div className="pe-domain-actions">{domain.status === 'ativo' && url && <a className="pe-button primary" href={url} target="_blank" rel="noopener noreferrer">Acessar<Icon name="external-link" size={15} /></a>}<button className="pe-button" onClick={() => navigate('chamados', domain._id)}>Solicitar alteração<Icon name="message-square" size={15} /></button></div><button className="pe-copy-domain" onClick={() => copyLink(domain)}><Icon name={copied === domain._id ? 'check' : 'copy'} size={13} />{copied === domain._id ? 'Link do suporte copiado' : 'Copiar link de suporte deste site'}</button>{copyError && <p role="alert">Não foi possível copiar. Acesse os chamados deste site e copie o endereço do navegador.</p>}</article>; })}</div>}<div className="pe-domain-info"><Icon name="shield" size={19} /><div><strong>O seu site e o seu portal, lado a lado.</strong><p>O botão de acesso abre a plataforma vinculada. O atendimento acontece aqui, com seu login ThynkXP e o histórico da sua empresa.</p></div></div></>}
      {section === 'projects' && <ProjectWorkspace mode="client" />}
      {section === 'chamados' && <>{domainId && <div className="pe-domain-filter"><Icon name="globe" size={16} /><span>Chamados de <strong>{activeDomain?.hostname || 'um domínio selecionado'}</strong></span><button onClick={() => navigate('chamados', '')}>Ver todos <Icon name="x" size={14} /></button></div>}<TicketWorkspace mode="client" domainId={domainId || undefined} /><section className="pe-support-link"><span><Icon name="code" size={21} /></span><div><h2>Leve o suporte para sua plataforma.</h2><p>Adicione este endereço ao botão “Suporte” do seu sistema. O cliente entra no portal com o acesso da própria empresa.</p><input aria-label="Link para o atendimento" readOnly value={supportLink} onFocus={(event) => event.target.select()} /></div><button className="pe-button" onClick={() => copyLink()}>{copied === 'portal' ? <Icon name="check" size={15} /> : <Icon name="copy" size={15} />}{copied === 'portal' ? 'Copiado' : 'Copiar link'}</button>{copyError && <p role="alert">Selecione o endereço acima e copie com Ctrl+C.</p>}</section></>}
      {section === 'account' && <><div className="pe-heading"><div><span className="pe-kicker">IDENTIDADE DO SEU ESPAÇO</span><h1>Minha conta.</h1><p>Os dados da empresa e do seu acesso ao portal.</p></div></div><div className="pe-account-grid"><section className="pe-card pe-account-company"><span className="pe-company-avatar">{initials(company)}</span><small>SUA EMPRESA</small><h2>{company}</h2>{client?.business.legalName && <p>{client.business.legalName}</p>}<dl><div><dt>CNPJ</dt><dd>{client?.business.cnpj || 'Não informado'}</dd></div><div><dt>E-mail da empresa</dt><dd>{client?.business.email || 'Não informado'}</dd></div><div><dt>Telefone</dt><dd>{client?.business.phone || 'Não informado'}</dd></div><div><dt>Localização</dt><dd>{[client?.location?.city, client?.location?.state].filter(Boolean).join(' / ') || 'Não informada'}</dd></div></dl><button className="pe-button" onClick={() => navigate('chamados', '')}>Solicitar atualização dos dados</button></section><section className="pe-card pe-account-access"><header><div><small>SEU ACESSO</small><h2>Olá, {name.split(' ')[0]}.</h2></div><Icon name="shield" size={23} /></header><dl><div><dt>Nome</dt><dd>{name}</dd></div><div><dt>E-mail de acesso</dt><dd>{email || 'Não informado'}</dd></div></dl><div className="pe-session-note"><Icon name="lock" size={18} /><p>Use seu acesso para acompanhar os projetos, domínios e chamados vinculados à sua empresa.</p></div><button className="pe-button" disabled={loggingOut} onClick={onLogout}><Icon name="logout" size={16} />{loggingOut ? 'Saindo…' : 'Encerrar sessão'}</button></section></div></>}
    </div><footer className="pe-footer"><span>thynkXP · Seu digital, conectado.</span><a href="/privacidade">Privacidade</a></footer></div></main>;
}
