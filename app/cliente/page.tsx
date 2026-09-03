'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Icon, { type IconName } from '../../components/Icon';
import './portal.css';

const LOGO = '/brand/thynkxp-logo.png';

type Section =
  | 'overview' | 'sites' | 'analytics' | 'leads' | 'reports' | 'opportunities'
  | 'projects' | 'requests' | 'files' | 'contracts' | 'finance' | 'company' | 'support' | 'settings';

type DomainMetric = {
  visitors: string;
  conversion: string;
  leads: string;
  performance: string;
  uptime: string;
};

type DomainData = {
  id: string;
  name: string;
  url: string;
  type: string;
  status: string;
  ssl: string;
  backup: string;
  plugin: string;
  health: number;
  metrics: DomainMetric;
};

const domains: DomainData[] = [
  {
    id: 'institutional',
    name: 'Site Institucional',
    url: 'empresa.com.br',
    type: 'WordPress + Elementor',
    status: 'Online',
    ssl: 'Ativo',
    backup: 'Hoje, 05:40',
    plugin: 'thynk Connect v1.0',
    health: 96,
    metrics: { visitors: '2.430', conversion: '4,8%', leads: '112', performance: '98', uptime: '99,99%' },
  },
  {
    id: 'store',
    name: 'Loja Online',
    url: 'loja.empresa.com.br',
    type: 'WordPress + WooCommerce',
    status: 'Online',
    ssl: 'Ativo',
    backup: 'Hoje, 05:52',
    plugin: 'thynk Connect v1.0',
    health: 91,
    metrics: { visitors: '6.140', conversion: '3,2%', leads: '196', performance: '94', uptime: '99,97%' },
  },
];

const navGroups: Array<{ label: string; items: Array<{ id: Section; label: string; icon: IconName; badge?: string }> }> = [
  { label: '', items: [{ id: 'overview', label: 'Visão geral', icon: 'home' }] },
  {
    label: 'NEGÓCIO',
    items: [
      { id: 'sites', label: 'Meus sites', icon: 'globe', badge: '2' },
      { id: 'analytics', label: 'Analytics', icon: 'bar-chart' },
      { id: 'leads', label: 'Leads', icon: 'users' },
      { id: 'reports', label: 'Relatórios', icon: 'file' },
      { id: 'opportunities', label: 'Oportunidades', icon: 'sparkles', badge: '3' },
    ],
  },
  {
    label: 'THYNKXP',
    items: [
      { id: 'projects', label: 'Projetos', icon: 'briefcase' },
      { id: 'requests', label: 'Solicitações', icon: 'ticket', badge: '2' },
      { id: 'files', label: 'Arquivos', icon: 'folder' },
    ],
  },
  {
    label: 'CONTA',
    items: [
      { id: 'contracts', label: 'Contratos', icon: 'signature' },
      { id: 'finance', label: 'Financeiro', icon: 'credit-card' },
      { id: 'company', label: 'Minha empresa', icon: 'layers' },
    ],
  },
];

const sectionTitles: Record<Section, string> = {
  overview: 'Visão geral', sites: 'Meus sites', analytics: 'Analytics', leads: 'Leads', reports: 'Relatórios',
  opportunities: 'Oportunidades', projects: 'Projetos', requests: 'Solicitações', files: 'Arquivos', contracts: 'Contratos',
  finance: 'Financeiro', company: 'Minha empresa', support: 'Suporte', settings: 'Configurações',
};

const activity = [
  ['08:42', 'Backup concluído', 'empresa.com.br', 'server'],
  ['07:18', 'Monitoramento verificado', 'Disponibilidade 100%', 'activity'],
  ['Ontem', 'Alteração #THY-1083 concluída', 'CTA da página de serviços', 'check-circle'],
  ['Ontem', 'Relatório mensal disponível', 'Agosto de 2026', 'file'],
] as Array<[string, string, string, IconName]>;

const requests = [
  { id: '#THY-1087', title: 'Ajustar banner da Home', status: 'Em execução', date: '02 set 2026', owner: 'Design' },
  { id: '#THY-1084', title: 'Configurar novo formulário', status: 'Aguardando cliente', date: '31 ago 2026', owner: 'Desenvolvimento' },
  { id: '#THY-1083', title: 'Reposicionar CTA de serviços', status: 'Concluída', date: '29 ago 2026', owner: 'UX' },
];

const files = [
  ['Relatório — Agosto 2026.pdf', 'PDF · 1,8 MB', '02 set 2026'],
  ['Manual de identidade.pdf', 'PDF · 2,8 MB', '28 ago 2026'],
  ['Apresentação do projeto.pdf', 'PDF · 4,1 MB', '25 ago 2026'],
  ['Conteúdo aprovado.docx', 'DOCX · 840 KB', '21 ago 2026'],
];

function MetricCard({ icon, label, value, trend }: { icon: IconName; label: string; value: string; trend: string }) {
  return (
    <article className="cp-metric-card">
      <div className="cp-metric-top"><span><Icon name={icon} size={18} /></span><small>{label}</small></div>
      <strong>{value}</strong>
      <p><Icon name="trending-up" size={14} /> {trend}</p>
    </article>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="cp-page-heading">
      <div>{eyebrow && <small>{eyebrow}</small>}<h1>{title}</h1><p>{description}</p></div>
      {action && <div className="cp-page-action">{action}</div>}
    </div>
  );
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('cliente@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/cliente/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        setError('E-mail ou senha inválidos.');
        return;
      }
      onLoggedIn();
    } catch {
      setError('Não foi possível entrar agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cp-login-shell">
      <section className="cp-login-panel">
        <a href="/" className="cp-login-brand"><img src={LOGO} alt="thynkXP" /></a>
        <div className="cp-login-copy">
          <span className="cp-kicker"><i /> PORTAL DO CLIENTE</span>
          <h1>Seu digital, sob controle.</h1>
          <p>Acompanhe sites, performance, projetos, solicitações, contratos e financeiro em um único ambiente.</p>
        </div>
        <div className="cp-login-preview">
          <div><Icon name="globe" /><span><strong>2 domínios conectados</strong><small>Monitorados em tempo real</small></span></div>
          <div><Icon name="activity" /><span><strong>96 / 100</strong><small>Saúde digital</small></span></div>
          <div><Icon name="shield" /><span><strong>Ambiente protegido</strong><small>Sessão segura e privada</small></span></div>
        </div>
      </section>

      <section className="cp-login-form-wrap">
        <form className="cp-login-form" onSubmit={handleSubmit}>
          <div className="cp-login-form-heading"><small>ÁREA RESTRITA</small><h2>Bem-vindo de volta.</h2><p>Entre com seu acesso thynkXP.</p></div>
          <label><span>E-mail</span><div><Icon name="mail" size={18} /><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="username" required /></div></label>
          <label><span>Senha</span><div><Icon name="lock" size={18} /><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Digite sua senha" required /></div></label>
          {error && <div className="cp-login-error"><Icon name="shield" size={16} /> {error}</div>}
          <button className="cp-primary-button cp-login-submit" type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar no portal'} <Icon name="arrow-right" size={17} /></button>
          <div className="cp-login-foot"><Icon name="lock" size={14} /> Sessão protegida por cookie HTTP-only</div>
        </form>
      </section>
    </main>
  );
}

export default function Cliente() {
  const [authState, setAuthState] = useState<'loading' | 'signed-out' | 'signed-in'>('loading');
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [domainId, setDomainId] = useState(domains[0].id);
  const [compare, setCompare] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const domain = useMemo(() => domains.find((item) => item.id === domainId) || domains[0], [domainId]);

  useEffect(() => {
    fetch('/api/cliente/session', { cache: 'no-store' })
      .then((response) => setAuthState(response.ok ? 'signed-in' : 'signed-out'))
      .catch(() => setAuthState('signed-out'));
  }, []);

  async function logout() {
    await fetch('/api/cliente/session', { method: 'DELETE' }).catch(() => undefined);
    setAuthState('signed-out');
    setActiveSection('overview');
  }

  function navigate(section: Section) {
    setActiveSection(section);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (authState === 'loading') {
    return <main className="cp-loading"><img src={LOGO} alt="thynkXP" /><span /></main>;
  }
  if (authState === 'signed-out') {
    return <LoginScreen onLoggedIn={() => setAuthState('signed-in')} />;
  }

  const metrics = domain.metrics;

  return (
    <main className="client-portal-v2">
      <div className={`cp-overlay ${menuOpen ? 'is-open' : ''}`} onClick={()=>setMenuOpen(false)} />
      <aside className={`cp-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="cp-brand"><img src={LOGO} alt="thynkXP" /><button onClick={()=>setMenuOpen(false)}><Icon name="x" /></button></div>
        <div className="cp-workspace"><span>AC</span><div><strong>Empresa Cliente</strong><small>Workspace principal</small></div><Icon name="chevron-right" size={15} /></div>
        <nav className="cp-nav">
          {navGroups.map((group, index)=><div className="cp-nav-group" key={`${group.label}-${index}`}>{group.label && <small>{group.label}</small>}{group.items.map(item=><button className={activeSection===item.id ? 'is-active' : ''} key={item.id} onClick={()=>navigate(item.id)}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.badge && <b>{item.badge}</b>}</button>)}</div>)}
        </nav>
        <div className="cp-sidebar-bottom">
          <button className={activeSection==='support' ? 'is-active' : ''} onClick={()=>navigate('support')}><Icon name="message-square" size={18} /> Suporte</button>
          <button className={activeSection==='settings' ? 'is-active' : ''} onClick={()=>navigate('settings')}><Icon name="settings" size={18} /> Configurações</button>
          <div className="cp-sidebar-user"><span>CL</span><div><strong>Cliente</strong><small>cliente@gmail.com</small></div><button onClick={logout} aria-label="Sair"><Icon name="logout" size={18} /></button></div>
        </div>
      </aside>

      <section className="cp-main">
        <header className="cp-topbar">
          <div className="cp-top-left"><button className="cp-menu" onClick={()=>setMenuOpen(true)}><Icon name="menu" /></button><div><small>Portal do cliente</small><strong>{sectionTitles[activeSection]}</strong></div></div>
          <div className="cp-top-actions">
            <div className="cp-domain-switcher"><span className="cp-status-dot" /><select value={domainId} onChange={(e)=>setDomainId(e.target.value)}>{domains.map(item=><option key={item.id} value={item.id}>{item.url}</option>)}</select><Icon name="globe" size={16} /></div>
            <button className="cp-icon-button"><Icon name="search" size={18} /></button>
            <button className="cp-icon-button cp-notification"><Icon name="bell" size={18} /><i /></button>
            <span className="cp-avatar">CL</span>
          </div>
        </header>

        <div className="cp-content">
          {activeSection === 'overview' && <>
            <PageHeading eyebrow="VISÃO GERAL" title="Bom dia, Cliente." description="Aqui está o que está acontecendo no seu ecossistema digital hoje." action={<button className="cp-secondary-button" onClick={()=>setCompare(!compare)}><Icon name="bar-chart" size={16} /> {compare ? 'Fechar comparação' : 'Comparar domínios'}</button>} />

            <section className="cp-domain-summary">
              <div className="cp-domain-identity"><span><Icon name="globe" /></span><div><small>DOMÍNIO SELECIONADO</small><h2>{domain.url}</h2><p>{domain.name} · {domain.type}</p></div></div>
              <div className="cp-domain-health"><span>Saúde digital</span><strong>{domain.health}<small>/100</small></strong><i><b style={{width:`${domain.health}%`}} /></i></div>
              <div className="cp-domain-state"><span><i /> {domain.status}</span><small>SSL {domain.ssl}</small></div>
            </section>

            {compare && <section className="cp-compare-grid">{domains.map(item=><article key={item.id}><div><span>{item.name}</span><strong>{item.url}</strong></div><div className="cp-compare-metrics"><p><small>Visitantes</small><strong>{item.metrics.visitors}</strong></p><p><small>Conversão</small><strong>{item.metrics.conversion}</strong></p><p><small>Leads</small><strong>{item.metrics.leads}</strong></p><p><small>Performance</small><strong>{item.metrics.performance}</strong></p></div></article>)}</section>}

            <section className="cp-metrics-grid">
              <MetricCard icon="users" label="Visitantes" value={metrics.visitors} trend="+18,4% no período" />
              <MetricCard icon="trending-up" label="Conversão" value={metrics.conversion} trend="+0,6 p.p." />
              <MetricCard icon="mail" label="Leads gerados" value={metrics.leads} trend="+31 este mês" />
              <MetricCard icon="zap" label="Performance" value={`${metrics.performance}/100`} trend="Excelente" />
            </section>

            <section className="cp-dashboard-grid">
              <article className="cp-health-card">
                <div className="cp-card-heading"><div><small>THYNK CARE</small><h2>Saúde do seu ecossistema</h2><p>Visão consolidada dos principais sinais do seu site.</p></div><span className="cp-score">{domain.health}</span></div>
                <div className="cp-health-list">{[['Performance',98],['Segurança',96],['SEO',82],['Conversão',88],['Disponibilidade',100],['Atualizações',97]].map(([label, value])=><div key={label as string}><span>{label}</span><i><b style={{width:`${value}%`}} /></i><strong>{value}</strong></div>)}</div>
                <button className="cp-text-button" onClick={()=>navigate('opportunities')}>Ver recomendações <Icon name="arrow-right" size={15} /></button>
              </article>

              <article className="cp-activity-card">
                <div className="cp-card-heading"><div><small>ATIVIDADE</small><h2>O que a thynkXP fez por você</h2><p>Últimas ações registradas no seu workspace.</p></div><span className="cp-live"><i /> AO VIVO</span></div>
                <div className="cp-activity-list">{activity.map(([time,title,detail,icon])=><div key={`${time}-${title}`}><span className="cp-activity-icon"><Icon name={icon} size={16} /></span><div><strong>{title}</strong><small>{detail}</small></div><time>{time}</time></div>)}</div>
                <button className="cp-text-button">Ver toda atividade <Icon name="arrow-right" size={15} /></button>
              </article>
            </section>

            <section className="cp-dashboard-grid cp-bottom-grid">
              <article className="cp-project-preview">
                <div className="cp-card-heading"><div><small>PROJETO EM ANDAMENTO</small><h2>Otimização de conversão</h2><p>Melhorias de jornada, CTA e formulário.</p></div><span className="cp-pill blue">72%</span></div>
                <div className="cp-project-bar"><i><b style={{width:'72%'}} /></i><div><span>Briefing ✓</span><span>UX/UI ✓</span><strong>Desenvolvimento</strong><span>Revisão</span><span>Publicação</span></div></div>
                <div className="cp-project-footer"><span><Icon name="calendar" size={16} /> Próxima entrega: 08 set 2026</span><button onClick={()=>navigate('projects')}>Abrir projeto <Icon name="arrow-right" size={15} /></button></div>
              </article>

              <article className="cp-opportunity-preview">
                <div className="cp-opportunity-icon"><Icon name="sparkles" /></div><small>OPORTUNIDADE DETECTADA</small><h2>Seu tráfego mobile cresceu 24%.</h2><p>68% dos acessos agora chegam pelo celular. Há espaço para melhorar o CTA mobile e aumentar conversões.</p><div><span>Impacto estimado <strong>Alto</strong></span><button onClick={()=>navigate('opportunities')}>Ver oportunidade <Icon name="arrow-right" size={15} /></button></div>
              </article>
            </section>
          </>}

          {activeSection === 'sites' && <>
            <PageHeading eyebrow="ECOSSISTEMA" title="Meus sites" description="Gerencie todos os domínios conectados ao workspace e acompanhe a saúde de cada operação." action={<button className="cp-primary-button"><Icon name="globe" size={16} /> Conectar domínio</button>} />
            <section className="cp-sites-grid">{domains.map(item=><article className="cp-site-card" key={item.id}><div className="cp-site-top"><span className="cp-site-icon"><Icon name={item.id==='store'?'shopping-cart':'globe'} /></span><div><small>{item.name.toUpperCase()}</small><h2>{item.url}</h2><p>{item.type}</p></div><span className="cp-online"><i /> {item.status}</span></div><div className="cp-site-stats"><div><small>Performance</small><strong>{item.metrics.performance}<span>/100</span></strong></div><div><small>Saúde</small><strong>{item.health}<span>/100</span></strong></div><div><small>Uptime</small><strong>{item.metrics.uptime}</strong></div></div><div className="cp-site-meta"><p><Icon name="shield" size={15} /> SSL {item.ssl}</p><p><Icon name="server" size={15} /> Backup {item.backup}</p><p><Icon name="workflow" size={15} /> {item.plugin}</p></div><div className="cp-site-actions"><button onClick={()=>{setDomainId(item.id);navigate('analytics')}}>Abrir analytics</button><button className="cp-light-action">Solicitar alteração</button><button className="cp-square-button"><Icon name="settings" size={17} /></button></div></article>)}</section>
          </>}

          {activeSection === 'analytics' && <>
            <PageHeading eyebrow="ANALYTICS" title={`Dados de ${domain.url}`} description="Métricas essenciais de aquisição, comportamento e conversão consolidadas em uma visão simples." action={<div className="cp-period-select"><Icon name="calendar" size={15} /> Últimos 30 dias</div>} />
            <section className="cp-metrics-grid"><MetricCard icon="users" label="Visitantes" value={metrics.visitors} trend="+18,4%" /><MetricCard icon="bar-chart" label="Sessões" value={domain.id==='store'?'8.820':'3.120'} trend="+14,1%" /><MetricCard icon="trending-up" label="Conversão" value={metrics.conversion} trend="+0,6 p.p." /><MetricCard icon="mail" label="Conversões" value={metrics.leads} trend="+31 no mês" /></section>
            <section className="cp-analytics-grid"><article className="cp-chart-card"><div className="cp-card-heading"><div><small>TRÁFEGO</small><h2>Visitantes ao longo do período</h2></div><span className="cp-pill">+18,4%</span></div><div className="cp-fake-chart">{[32,44,39,58,54,68,62,76,72,84,78,92,88,95].map((height,index)=><i key={index}><b style={{height:`${height}%`}} /></i>)}</div><div className="cp-chart-labels"><span>04 ago</span><span>11 ago</span><span>18 ago</span><span>25 ago</span><span>02 set</span></div></article><article className="cp-source-card"><div className="cp-card-heading"><div><small>AQUISIÇÃO</small><h2>Origem do tráfego</h2></div></div>{[['Google orgânico','46%',46],['Direto','28%',28],['Instagram','16%',16],['Referências','10%',10]].map(([label,value,width])=><div className="cp-source-row" key={label as string}><div><span>{label}</span><strong>{value}</strong></div><i><b style={{width:`${width}%`}} /></i></div>)}</article></section>
          </>}

          {activeSection === 'leads' && <>
            <PageHeading eyebrow="CONVERSÕES" title="Leads" description="Acompanhe contatos gerados pelos seus sites e identifique quais canais estão trazendo melhores oportunidades." action={<button className="cp-secondary-button"><Icon name="download" size={16} /> Exportar CSV</button>} />
            <section className="cp-metrics-grid"><MetricCard icon="users" label="Leads no mês" value="112" trend="+38,3%" /><MetricCard icon="trending-up" label="Taxa de conversão" value="4,8%" trend="+0,6 p.p." /><MetricCard icon="whatsapp" label="WhatsApp" value="68" trend="61% dos leads" /><MetricCard icon="mail" label="Formulários" value="44" trend="39% dos leads" /></section>
            <article className="cp-table-card"><div className="cp-card-heading"><div><small>ÚLTIMOS LEADS</small><h2>Contatos recentes</h2></div><button className="cp-filter-button"><Icon name="filter" size={15} /> Filtrar</button></div><div className="cp-table"><div className="cp-table-head"><span>Contato</span><span>Origem</span><span>Página</span><span>Data</span><span>Status</span></div>{[['Mariana Costa','WhatsApp','/servicos','Hoje, 08:31','Novo'],['Lucas Andrade','Formulário','/contato','Ontem, 17:04','Contatado'],['Fernanda Melo','WhatsApp','/landing-page','Ontem, 14:22','Novo'],['Rafael Lima','Formulário','/contato','01 set, 11:48','Qualificado']].map(row=><div className="cp-table-row" key={row[0]}>{row.map((cell,index)=><span key={index} className={index===4?'cp-table-status':''}>{cell}</span>)}</div>)}</div></article>
          </>}

          {activeSection === 'reports' && <>
            <PageHeading eyebrow="INTELIGÊNCIA" title="Relatórios" description="Relatórios mensais que traduzem números em contexto, decisões e próximos passos." />
            <section className="cp-report-grid">{[['Agosto 2026','+18,4%','112 leads','Disponível'],['Julho 2026','+9,2%','81 leads','Disponível'],['Junho 2026','+12,8%','74 leads','Disponível']].map((item,index)=><article className="cp-report-card" key={item[0]}><span className="cp-report-icon"><Icon name="file" /></span><small>RELATÓRIO MENSAL</small><h2>{item[0]}</h2><div><p><small>Tráfego</small><strong>{item[1]}</strong></p><p><small>Conversões</small><strong>{item[2]}</strong></p></div><button><Icon name="download" size={16} /> Baixar relatório</button>{index===0&&<b>NOVO</b>}</article>)}</section>
          </>}

          {activeSection === 'opportunities' && <>
            <PageHeading eyebrow="THYNK INSIGHTS" title="Oportunidades" description="Pontos identificados a partir de performance, comportamento e estrutura do seu ecossistema digital." />
            <section className="cp-opportunities-list">{[
              ['Alta prioridade','Mobile','68% dos seus acessos são mobile','O CTA principal perde destaque em telas menores. Uma otimização de hierarquia pode aumentar a taxa de contato.','Alto'],
              ['Crescimento','Conversão','Página de serviços com alto tráfego','A página recebeu 1.840 visitas, mas apenas 1,7% avançaram para contato. Há potencial claro de otimização.','Alto'],
              ['Melhoria','SEO','12 páginas sem meta description','Pequenos ajustes técnicos podem melhorar a apresentação das páginas nos resultados de busca.','Médio'],
            ].map(([priority,category,title,text,impact],index)=><article key={title}><div className={`cp-opportunity-number n${index+1}`}>0{index+1}</div><div className="cp-opportunity-body"><div><span className="cp-pill">{priority}</span><small>{category}</small></div><h2>{title}</h2><p>{text}</p><footer><span>Impacto <strong>{impact}</strong></span><button className="cp-primary-button">Quero melhorar isso <Icon name="arrow-right" size={15} /></button></footer></div></article>)}</section>
          </>}

          {activeSection === 'projects' && <>
            <PageHeading eyebrow="PROJETOS" title="Projetos e entregas" description="Acompanhe evolução, responsáveis, aprovações e próximas etapas sem depender de mensagens espalhadas." action={<button className="cp-secondary-button"><Icon name="briefcase" size={16} /> Histórico</button>} />
            <article className="cp-project-full"><div className="cp-project-main"><div className="cp-card-heading"><div><small>EM DESENVOLVIMENTO</small><h2>Otimização de conversão</h2><p>Revisão de jornada, landing pages e pontos de contato.</p></div><span className="cp-score small">72%</span></div><div className="cp-large-progress"><div><i><b style={{width:'72%'}} /></i><span>72% concluído</span></div></div><div className="cp-project-timeline">{[['Briefing e diagnóstico','Concluído',true],['UX e arquitetura','Concluído',true],['UI Design','Concluído',true],['Desenvolvimento','Em andamento',true],['Revisão do cliente','Próxima etapa',false],['Publicação','Pendente',false]].map(([title,status,done],index)=><div className={done?'is-done':''} key={title as string}><span>{done?<Icon name="check" size={14}/>:index+1}</span><div><strong>{title}</strong><small>{status}</small></div></div>)}</div></div><aside className="cp-project-side"><small>PRÓXIMA ENTREGA</small><h3>Versão para homologação</h3><p>Versão navegável com as melhorias aprovadas para validação final.</p><div><Icon name="calendar" /><span><strong>08 set 2026</strong><small>Previsão de entrega</small></span></div><button className="cp-primary-button">Ver detalhes</button></aside></article>
          </>}

          {activeSection === 'requests' && <>
            <PageHeading eyebrow="CENTRAL DE SOLICITAÇÕES" title="Solicitações" description="Abra, acompanhe e centralize ajustes, bugs, novas páginas, integrações e demais demandas." action={<button className="cp-primary-button"><Icon name="ticket" size={16} /> Nova solicitação</button>} />
            <article className="cp-list-card"><div className="cp-list-toolbar"><div className="cp-tabs"><button className="is-active">Todas</button><button>Em andamento</button><button>Aguardando você</button><button>Concluídas</button></div><button className="cp-filter-button"><Icon name="filter" size={15} /> Filtros</button></div>{requests.map(item=><div className="cp-request-row" key={item.id}><span className="cp-request-icon"><Icon name="ticket" size={17} /></span><div className="cp-request-main"><small>{item.id} · {item.owner}</small><strong>{item.title}</strong></div><time>{item.date}</time><span className={`cp-request-status ${item.status==='Concluída'?'done':''}`}>{item.status}</span><button><Icon name="chevron-right" size={17} /></button></div>)}</article>
          </>}

          {activeSection === 'files' && <>
            <PageHeading eyebrow="ARQUIVOS" title="Central de arquivos" description="Documentos, relatórios, identidade visual e entregas organizados em um único lugar." action={<button className="cp-primary-button"><Icon name="folder" size={16} /> Enviar arquivo</button>} />
            <section className="cp-folders">{[['Identidade Visual','12 arquivos'],['Website','24 arquivos'],['Contratos','3 arquivos'],['Relatórios','8 arquivos']].map(([title,count])=><article key={title}><span><Icon name="folder" /></span><strong>{title}</strong><small>{count}</small><Icon name="chevron-right" size={16} /></article>)}</section><article className="cp-list-card"><div className="cp-card-heading"><div><small>RECENTES</small><h2>Últimos arquivos</h2></div></div>{files.map(file=><div className="cp-file-row" key={file[0]}><span><Icon name="file" size={18} /></span><div><strong>{file[0]}</strong><small>{file[1]}</small></div><time>{file[2]}</time><button><Icon name="download" size={17} /></button></div>)}</article>
          </>}

          {activeSection === 'contracts' && <>
            <PageHeading eyebrow="CONTRATOS" title="Contratos e serviços" description="Consulte escopo, vigência, renovação e documentos vinculados aos serviços contratados." />
            <section className="cp-contract-grid">{[['Manutenção & Performance','Ativo','R$ 890,00 / mês','01 set 2026 — 31 ago 2027'],['Hospedagem Gerenciada','Ativo','R$ 149,00 / mês','Renovação mensal'],['Landing Page — Campanha Q4','Concluído','R$ 2.400,00','Finalizado em 18 ago 2026']].map(([title,status,value,period])=><article key={title}><div><span className="cp-contract-icon"><Icon name="signature" /></span><span className={`cp-pill ${status==='Ativo'?'green':''}`}>{status}</span></div><small>SERVIÇO THYNKXP</small><h2>{title}</h2><p>{period}</p><strong>{value}</strong><button>Ver contrato <Icon name="arrow-right" size={15} /></button></article>)}</section>
          </>}

          {activeSection === 'finance' && <>
            <PageHeading eyebrow="FINANCEIRO" title="Financeiro" description="Faturas, pagamentos, recorrências e documentos financeiros em uma visão simples." />
            <section className="cp-finance-hero"><div><small>PRÓXIMA COBRANÇA</small><h2>R$ 1.039,00</h2><p>Vencimento em <strong>10 de setembro de 2026</strong></p><div><span><i /> Em aberto</span><button className="cp-primary-button">Visualizar fatura <Icon name="external-link" size={15} /></button></div></div><div className="cp-finance-breakdown"><small>COMPOSIÇÃO</small><p><span>Manutenção & Performance</span><strong>R$ 890,00</strong></p><p><span>Hospedagem Gerenciada</span><strong>R$ 149,00</strong></p><div><span>Total</span><strong>R$ 1.039,00</strong></div></div></section><article className="cp-table-card"><div className="cp-card-heading"><div><small>HISTÓRICO</small><h2>Últimas faturas</h2></div></div><div className="cp-table"><div className="cp-table-head finance"><span>Referência</span><span>Vencimento</span><span>Valor</span><span>Status</span><span></span></div>{[['Agosto 2026','10/08/2026','R$ 1.039,00','Pago'],['Julho 2026','10/07/2026','R$ 1.039,00','Pago'],['Junho 2026','10/06/2026','R$ 1.039,00','Pago']].map(row=><div className="cp-table-row finance" key={row[0]}><span>{row[0]}</span><span>{row[1]}</span><strong>{row[2]}</strong><span className="cp-paid"><Icon name="check-circle" size={14}/> {row[3]}</span><button><Icon name="download" size={16}/></button></div>)}</div></article>
          </>}

          {activeSection === 'company' && <>
            <PageHeading eyebrow="WORKSPACE" title="Minha empresa" description="Dados da organização, contatos principais e configurações do workspace." />
            <section className="cp-company-grid"><article className="cp-company-card"><div className="cp-company-logo">EC</div><div><small>ORGANIZAÇÃO</small><h2>Empresa Cliente Ltda.</h2><p>Cliente thynkXP desde março de 2026</p></div><button className="cp-secondary-button">Editar dados</button></article><article className="cp-company-details"><div><small>CNPJ</small><strong>00.000.000/0001-00</strong></div><div><small>Contato principal</small><strong>Cliente Responsável</strong></div><div><small>E-mail</small><strong>cliente@gmail.com</strong></div><div><small>Domínios conectados</small><strong>2 domínios</strong></div></article></section>
          </>}

          {activeSection === 'support' && <>
            <PageHeading eyebrow="SUPORTE" title="Como podemos ajudar?" description="Centralize dúvidas e solicitações com histórico completo do atendimento." />
            <section className="cp-support-grid"><article><span><Icon name="ticket" /></span><h2>Abrir solicitação</h2><p>Para ajustes, bugs, novas páginas, integrações e demandas do dia a dia.</p><button className="cp-primary-button">Nova solicitação <Icon name="arrow-right" size={15}/></button></article><article><span><Icon name="whatsapp" /></span><h2>Falar com a equipe</h2><p>Precisa conversar sobre estratégia, escopo ou uma situação mais urgente?</p><button className="cp-secondary-button">Chamar no WhatsApp <Icon name="external-link" size={15}/></button></article><article><span><Icon name="file" /></span><h2>Base de conhecimento</h2><p>Guias rápidos sobre domínio, e-mail, WordPress, relatórios e seu portal.</p><button className="cp-secondary-button">Explorar conteúdos <Icon name="arrow-right" size={15}/></button></article></section>
          </>}

          {activeSection === 'settings' && <>
            <PageHeading eyebrow="CONFIGURAÇÕES" title="Configurações" description="Preferências do portal, dados de acesso e segurança da sua conta." />
            <section className="cp-settings-grid"><article><div className="cp-card-heading"><div><small>PERFIL</small><h2>Dados de acesso</h2></div></div><label>Nome<input value="Cliente ThynkXP" readOnly /></label><label>E-mail<input value="cliente@gmail.com" readOnly /></label><button className="cp-secondary-button">Alterar senha</button></article><article><div className="cp-card-heading"><div><small>SEGURANÇA</small><h2>Sessão atual</h2></div></div><div className="cp-security-state"><span><Icon name="shield" /></span><div><strong>Sessão protegida</strong><small>Cookie HTTP-only · expira em até 8 horas</small></div></div><button className="cp-danger-button" onClick={logout}><Icon name="logout" size={16} /> Encerrar sessão</button></article></section>
          </>}
        </div>
      </section>
    </main>
  );
}
