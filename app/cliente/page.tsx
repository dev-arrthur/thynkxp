'use client';

import { useState } from 'react';
import Icon, { type IconName } from '../../components/Icon';

const LOGO = '/brand/thynkxp-logo.png';

const modules: { icon: IconName; title: string; value: string; detail: string }[] = [
  { icon: 'folder', title: 'Projetos', value: '3', detail: '1 projeto em andamento' },
  { icon: 'ticket', title: 'Solicitações', value: '2', detail: 'aguardando atendimento' },
  { icon: 'receipt', title: 'Financeiro', value: '1', detail: 'fatura em aberto' },
  { icon: 'file', title: 'Documentos', value: '8', detail: 'arquivos disponíveis' },
];

const timeline: Array<[string, string, boolean]> = [
  ['Briefing e estratégia', 'Concluído', true],
  ['Arquitetura e conteúdo', 'Concluído', true],
  ['UI/UX Design', 'Concluído', true],
  ['Desenvolvimento', 'Em andamento', true],
  ['Homologação', 'Próxima etapa', false],
  ['Publicação', 'Pendente', false],
];

const files = [
  ['Manual de identidade.pdf', 'PDF', '2.8 MB', '28 ago'],
  ['Apresentação do projeto.pdf', 'PDF', '4.1 MB', '25 ago'],
  ['Conteúdo aprovado.docx', 'DOCX', '840 KB', '21 ago'],
];

export default function Cliente() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="client-app">
      <div className={`client-overlay ${menuOpen ? 'is-open' : ''}`} onClick={()=>setMenuOpen(false)} />
      <aside className={`client-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="client-brand"><img src={LOGO} alt="ThynkXP" /><button onClick={()=>setMenuOpen(false)} aria-label="Fechar menu"><Icon name="x" /></button></div>
        <div className="client-account"><div>CL</div><span><strong>Cliente ThynkXP</strong><small>Workspace principal</small></span></div>
        <nav className="client-nav">
          <a className="is-active" href="#visao-geral"><Icon name="home" /><span>Visão geral</span></a>
          <a href="#projeto"><Icon name="briefcase" /><span>Meu projeto</span></a>
          <a href="#arquivos"><Icon name="folder" /><span>Arquivos</span></a>
          <a href="#financeiro"><Icon name="credit-card" /><span>Financeiro</span></a>
          <a href="#suporte"><Icon name="ticket" /><span>Solicitações</span><b>2</b></a>
          <a href="#integracoes"><Icon name="workflow" /><span>Integrações</span></a>
        </nav>
        <div className="client-help-card"><span><Icon name="message-square" /></span><strong>Precisa de ajuda?</strong><p>Abra uma solicitação e acompanhe tudo pelo portal.</p><a href="#suporte">Abrir chamado <Icon name="arrow-right" size={16} /></a></div>
        <div className="client-sidebar-footer"><a href="/"><Icon name="globe" /> Voltar ao site</a><button><Icon name="logout" /> Sair</button></div>
      </aside>

      <section className="client-main">
        <header className="client-topbar"><div><button className="client-menu-button" onClick={()=>setMenuOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button><span><small>Área do cliente</small><strong>Visão geral</strong></span></div><div className="client-top-actions"><button aria-label="Notificações"><Icon name="bell" /><i /></button><div className="client-avatar">CL</div></div></header>

        <div className="client-content" id="visao-geral">
          <section className="client-hero"><div><span className="client-kicker">PAINEL DO CLIENTE</span><h1>Seu projeto, seus arquivos<br/>e sua operação <em>em um só lugar.</em></h1><p>Acompanhe entregas, etapas, documentos, financeiro e solicitações sem depender de mensagens espalhadas.</p></div><div className="client-hero-status"><span><Icon name="activity" /> Status do projeto</span><strong>78%</strong><div><i style={{width:'78%'}} /></div><small>Desenvolvimento em andamento</small></div></section>

          <section className="client-module-grid">{modules.map(item=><article key={item.title}><div className="client-module-icon"><Icon name={item.icon} /></div><span>{item.title}</span><strong>{item.value}</strong><p>{item.detail}</p><button>Ver detalhes <Icon name="chevron-right" size={16} /></button></article>)}</section>

          <section className="client-layout-grid" id="projeto">
            <article className="client-project-card"><div className="client-card-heading"><div><span>PROJETO PRINCIPAL</span><h2>Experiência digital ThynkXP</h2><p>Site institucional + estrutura de conversão</p></div><a href="#arquivos">Ver arquivos <Icon name="arrow-right" size={16} /></a></div><div className="client-progress-large"><div><strong>78%</strong><span>Progresso geral</span></div><i><b style={{width:'78%'}} /></i></div><div className="client-timeline">{timeline.map(([title,status,done],index)=><div className={done ? 'is-done' : ''} key={title}><span>{done ? <Icon name="check" size={14} /> : index+1}</span><p><strong>{title}</strong><small>{status}</small></p>{index<timeline.length-1&&<i />}</div>)}</div></article>

            <aside className="client-next-card"><span className="client-next-icon"><Icon name="calendar" /></span><small>PRÓXIMA ENTREGA</small><h3>Versão para homologação</h3><p>Uma versão navegável para revisão dos principais fluxos e validação de conteúdo.</p><div className="client-date-box"><Icon name="clock" /><span><strong>04 set</strong><small>Previsão de entrega</small></span></div><button>Ver cronograma <Icon name="arrow-right" size={16} /></button></aside>
          </section>

          <section className="client-secondary-grid">
            <article className="client-files-card" id="arquivos"><div className="client-card-heading"><div><span>ARQUIVOS RECENTES</span><h2>Documentos do projeto</h2></div><button><Icon name="folder" /> Ver todos</button></div><div className="client-file-list">{files.map(file=><div key={file[0]}><i><Icon name="file" /></i><span><strong>{file[0]}</strong><small>{file[1]} · {file[2]}</small></span><small>{file[3]}</small><button aria-label={`Baixar ${file[0]}`}><Icon name="download" /></button></div>)}</div></article>

            <article className="client-finance-card" id="financeiro"><div className="client-card-heading"><div><span>FINANCEIRO</span><h2>Próxima fatura</h2></div><Icon name="credit-card" /></div><div className="client-invoice"><span>Parcela do projeto</span><strong>R$ 1.500,00</strong><small>Vencimento em 10/09/2026</small></div><div className="client-invoice-status"><span><i /> Em aberto</span><button>Visualizar fatura <Icon name="external-link" size={15} /></button></div></article>
          </section>

          <section className="client-support" id="suporte"><div className="client-support-copy"><span><Icon name="message-square" /></span><div><small>SUPORTE E SOLICITAÇÕES</small><h2>Fale com a equipe sem perder o histórico.</h2><p>Centralize dúvidas, ajustes, aprovações e solicitações para acompanhar cada conversa do início ao fim.</p></div></div><div className="client-support-actions"><button><Icon name="ticket" /> Nova solicitação</button><button className="is-light">Ver solicitações abertas <Icon name="arrow-right" size={16} /></button></div></section>

          <section className="client-integrations" id="integracoes"><div className="client-card-heading"><div><span>ECOSSISTEMA</span><h2>Integrações da sua operação</h2><p>Um espaço preparado para conectar ferramentas e centralizar indicadores.</p></div><span className="client-coming">Em expansão</span></div><div className="client-integration-grid">{[['globe','Site e domínio','Ativo'],['bar-chart','Google Analytics','Disponível'],['shopping-cart','E-commerce','Disponível'],['server','Hospedagem','Ativo'],['workflow','Automações','Disponível'],['activity','Performance','Em breve']].map(([icon,title,status])=><article key={title}><i><Icon name={icon as IconName} /></i><span><strong>{title}</strong><small>{status}</small></span><Icon name="chevron-right" size={16} /></article>)}</div></section>
        </div>
      </section>
    </main>
  );
}
