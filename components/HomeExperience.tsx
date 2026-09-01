'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon, { type IconName } from './Icon';

const RAW = 'https://raw.githubusercontent.com/dev-arrthur/thynkxp/main';
const LOGO = '/brand/thynkxp-logo.png';
const whatsapp = (message: string) => `https://wa.me/5532988221108?text=${encodeURIComponent(message)}`;

const nav = [
  ['Sobre nós', '#sobre-nos'],
  ['Serviços', '#servicos'],
  ['Processo', '#processo'],
  ['Projetos', '#projetos'],
  ['FAQ', '#faq'],
];

const tools = ['google-ads.png','meta.png','hotmart.png','chatgpt.png','wordpress.png','elementor.png','trello.png','canva.png','figma.png'];

const services: { icon: IconName; title: string; text: string; tags: string[] }[] = [
  { icon: 'monitor', title: 'Sites e Landing Pages', text: 'Experiências rápidas, responsivas e construídas para comunicar valor, gerar confiança e transformar visitas em oportunidades.', tags: ['UX/UI', 'SEO técnico', 'Conversão'] },
  { icon: 'shopping-cart', title: 'E-Commerces', text: 'Operações de venda digital com catálogo, checkout, integrações, automações e jornadas pensadas para reduzir atrito.', tags: ['Vendas', 'Pagamentos', 'Integrações'] },
  { icon: 'server', title: 'SaaS e Sistemas', text: 'Produtos digitais sob medida para organizar processos, conectar equipes, centralizar dados e escalar operações.', tags: ['Dashboards', 'Back-end', 'APIs'] },
  { icon: 'megaphone', title: 'Marketing e Performance', text: 'Estratégia de aquisição e presença digital conectando campanha, página, mensuração e melhoria contínua.', tags: ['Mídia', 'Analytics', 'CRO'] },
  { icon: 'pen-tool', title: 'Branding e Identidade', text: 'Sistemas visuais consistentes para marcas que precisam ser percebidas com clareza, personalidade e profissionalismo.', tags: ['Marca', 'Direção visual', 'Design'] },
  { icon: 'workflow', title: 'Automações', text: 'Fluxos inteligentes que eliminam retrabalho, conectam ferramentas e aceleram tarefas repetitivas no dia a dia.', tags: ['Workflows', 'Integração', 'Produtividade'] },
];

const process = [
  { icon: 'search' as IconName, step: '01', title: 'Diagnóstico', text: 'Entendemos contexto, objetivo, público, operação, gargalos e o que realmente precisa ser resolvido.' },
  { icon: 'layers' as IconName, step: '02', title: 'Arquitetura', text: 'Organizamos escopo, jornada, conteúdo, funcionalidades, integrações e prioridades de produto.' },
  { icon: 'pen-tool' as IconName, step: '03', title: 'Design', text: 'Transformamos estratégia em interface, sistema visual e experiência consistente em todos os dispositivos.' },
  { icon: 'code' as IconName, step: '04', title: 'Desenvolvimento', text: 'Construímos a solução com foco em performance, manutenção, segurança e evolução futura.' },
  { icon: 'check-circle' as IconName, step: '05', title: 'Homologação', text: 'Testamos fluxos, responsividade, integrações, conteúdo, comportamento e cenários críticos.' },
  { icon: 'rocket' as IconName, step: '06', title: 'Publicação e evolução', text: 'Colocamos no ar, acompanhamos indicadores e seguimos melhorando com base em uso e resultado.' },
];

const capabilities: { icon: IconName; value: string; label: string; description: string }[] = [
  { icon: 'zap', value: 'Performance', label: 'Experiência rápida', description: 'Interfaces leves, responsivas e pensadas para manter fluidez em desktop e mobile.' },
  { icon: 'shield', value: 'Segurança', label: 'Base confiável', description: 'Boas práticas de autenticação, dados, variáveis de ambiente e arquitetura de aplicação.' },
  { icon: 'activity', value: 'Analytics', label: 'Decisão com dados', description: 'Eventos, campanhas, origem, comportamento e pontos de conversão prontos para análise.' },
  { icon: 'workflow', value: 'Integração', label: 'Operação conectada', description: 'APIs, bancos, automações, CRMs e serviços externos trabalhando de forma integrada.' },
];

const testimonials = [
  ['Fiquei bem satisfeito com o serviço, são profissionais dedicados que entendem a ideia do cliente e entregam um material muito bom!', 'José Roberto', 'Empresário', 'user1.png'],
  ['O serviço é de fato personalizado. Em todos os serviços que contratamos nossos objetivos foram superados. Conseguiram colocar nos materiais a essência da nossa marca.', 'Eliane Jorge', 'Eng. Civil', 'user2.png'],
  ['Serviço de qualidade com total atenção ao cliente, equipe dedicada e com grande responsabilidade e profissionalismo. Eu recomendo os serviços!', 'Paulo Elbl', 'Sinuelo da Cultura', 'user3.png'],
  ['Atendimento ágil e estratégico do início ao fim. O novo site trouxe mais autoridade para nossa marca e melhorou bastante a geração de leads.', 'Marina Costa', 'Diretora Comercial', 'user4.png'],
  ['A equipe entendeu exatamente o que precisávamos e entregou além do combinado. Hoje temos um processo muito mais organizado e eficiente no digital.', 'Rafael Mendes', 'Gestor de Operações', 'user5.png'],
];

const faqs = [
  ['Quanto tempo leva para criar um site profissional?', 'O prazo depende do tamanho do projeto, quantidade de páginas, nível de personalização, integrações e velocidade de aprovação. Landing pages costumam ser mais rápidas, enquanto sites completos e sistemas personalizados exigem etapas adicionais de estratégia, design, desenvolvimento, testes e publicação.'],
  ['Vocês criam apenas o visual ou também desenvolvem o site ou sistema?', 'Atuamos do planejamento à entrega: entendemos o objetivo, estruturamos a experiência, criamos o design, desenvolvemos a solução e orientamos a publicação. Quando necessário, também apoiamos com copy, conteúdo, automações e integrações.'],
  ['Qual é a diferença entre site institucional, landing page e sistema personalizado?', 'O site institucional apresenta a empresa e seus serviços. A landing page é focada em uma conversão específica. Um sistema personalizado resolve processos internos com dashboards, áreas de cliente, cadastros, relatórios, pedidos e fluxos sob medida.'],
  ['Meu projeto pode ter WhatsApp, formulários, pagamentos ou integrações?', 'Sim. Desenvolvemos integrações conforme a necessidade do negócio, incluindo WhatsApp, formulários, captura de leads, pixels, analytics, meios de pagamento, CRMs, planilhas, automações e outras plataformas compatíveis.'],
  ['Como funciona o processo de criação com a ThynkXP?', 'Seguimos diagnóstico, definição de escopo, arquitetura, design, aprovação, desenvolvimento, testes e publicação. Durante o processo mantemos comunicação clara para validar decisões e conectar a entrega aos objetivos do negócio.'],
  ['Como é definido o investimento?', 'O investimento varia conforme escopo, quantidade de telas, funcionalidades, integrações, prazo, complexidade técnica e nível de estratégia. Primeiro entendemos a necessidade e depois apresentamos uma proposta compatível com o objetivo.'],
];

function Logo({ className = '' }: { className?: string }) {
  return <img src={LOGO} className={className} alt="ThynkXP" />;
}

function Button({ href, children, dark = false, ghost = false }: { href: string; children: React.ReactNode; dark?: boolean; ghost?: boolean }) {
  const external = href.startsWith('http');
  const cls = ghost ? 'thx-btn thx-btn-ghost' : dark ? 'thx-btn thx-btn-dark' : 'thx-btn thx-btn-orange';
  return <a className={cls} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{children}</a>;
}

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return <span className="thx-section-index"><span>{index}</span>{children}</span>;
}

export default function HomeExperience() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [showTop, setShowTop] = useState(false);

  const budgetHref = useMemo(() => whatsapp('Olá! Conheci a ThynkXP pelo site e gostaria de solicitar um orçamento para o meu projeto. Poderiam me orientar sobre os próximos passos?'), []);
  const specialistHref = useMemo(() => whatsapp('Olá! Vim pelo site da ThynkXP e gostaria de conversar com um especialista para entender como vocês podem ajudar meu negócio.'), []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 440);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="thx-home" id="top">
      <header className="thx-header">
        <div className="thx-shell thx-nav-desktop">
          <a href="#top" className="thx-brand" aria-label="ThynkXP - início"><Logo /></a>
          <nav className="thx-nav-links" aria-label="Navegação principal">
            {nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
            <a href="/cliente">Área do cliente</a>
          </nav>
          <div className="thx-nav-actions">
            <Button href={budgetHref}>Quero um orçamento <Icon name="arrow-up-right" size={17} /></Button>
            <a className="thx-social-pill" href="https://www.instagram.com/thynkxp/" target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="instagram" size={18} /></a>
            <a className="thx-social-pill" href="https://wa.me/5532988221108" target="_blank" rel="noreferrer" aria-label="WhatsApp"><Icon name="whatsapp" size={18} /></a>
          </div>
        </div>

        <div className="thx-shell thx-nav-mobile">
          <button className="thx-menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Icon name="menu" /></button>
          <a href="#top" className="thx-brand"><Logo /></a>
          <a className="thx-mobile-contact" href={budgetHref} target="_blank" rel="noreferrer" aria-label="Solicitar orçamento"><Icon name="arrow-up-right" /></a>
        </div>
      </header>

      <div className={`thx-overlay ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)} />
      <aside className={`thx-drawer ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="thx-drawer-head"><Logo /><button onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><Icon name="x" /></button></div>
        <span className="thx-overline">Navegação</span>
        <nav>
          {nav.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<Icon name="arrow-up-right" size={18} /></a>)}
          <a href="/cliente" onClick={() => setMenuOpen(false)}>Área do cliente<Icon name="arrow-up-right" size={18} /></a>
        </nav>
        <div className="thx-drawer-actions"><Button href={budgetHref}>Quero um orçamento</Button><Button href={specialistHref} dark>Converse conosco</Button></div>
        <div className="thx-drawer-social"><a href="https://www.instagram.com/thynkxp/" target="_blank" rel="noreferrer"><Icon name="instagram" /> Instagram</a><a href="https://wa.me/5532988221108" target="_blank" rel="noreferrer"><Icon name="whatsapp" /> WhatsApp</a></div>
      </aside>

      <section className="thx-hero thx-shell">
        <div className="thx-hero-copy" data-reveal>
          <span className="thx-kicker"><Icon name="location" size={16} /> Agência de desenvolvimento de sistemas</span>
          <h1>Estratégia e<br/>design pra você<br/><em>vender mais.</em></h1>
          <p>Projetamos sites, sistemas, automações e experiências digitais que unem clareza, tecnologia e performance para transformar presença online em resultado.</p>
          <div className="thx-hero-buttons"><Button href={budgetHref}>Quero um orçamento <Icon name="arrow-right" size={17} /></Button><Button href={specialistHref} dark>Converse conosco <Icon name="whatsapp" size={17} /></Button></div>
          <div className="thx-mini-proof">
            <div><strong>+20</strong><span>projetos e soluções</span></div>
            <div><strong>Full service</strong><span>da estratégia ao deploy</span></div>
            <div><strong>100%</strong><span>foco na experiência</span></div>
          </div>
        </div>
        <div className="thx-hero-visual" data-reveal>
          <div className="thx-orbit thx-orbit-one" /><div className="thx-orbit thx-orbit-two" />
          <div className="thx-visual-card"><img src={`${RAW}/img/imagem1.png`} alt="Ilustração de estratégia e desenvolvimento ThynkXP" /></div>
          <span className="thx-floating-tag tag-one"><Icon name="code" size={15} /> Next.js</span>
          <span className="thx-floating-tag tag-two"><Icon name="pen-tool" size={15} /> Design + Tech</span>
          <span className="thx-floating-tag tag-three"><Icon name="trending-up" size={15} /> Performance</span>
        </div>
      </section>

      <section className="thx-tools" aria-label="Ferramentas utilizadas">
        <p>As melhores ferramentas do mercado na sua operação.</p>
        {[0,1].map(line => <div className="thx-tool-window" key={line}><div className={`thx-tool-track ${line ? 'reverse' : ''}`}>{[...tools,...tools].map((name,i)=><div className="thx-tool-logo" key={`${line}-${i}`}><img src={`${RAW}/logos/${name}`} alt="" /></div>)}</div></div>)}
      </section>

      <section className="thx-about thx-shell" id="sobre-nos">
        <div className="thx-about-copy" data-reveal><SectionLabel index="01">Sobre nós</SectionLabel><h2>Produto digital com<br/><em>pensamento de negócio.</em></h2><p>A ThynkXP combina estratégia, design e engenharia para criar soluções que façam sentido para a operação e para quem usa.</p><div className="thx-about-points"><span><Icon name="check-circle" size={17} /> Estratégia antes da interface</span><span><Icon name="check-circle" size={17} /> Experiência antes da tecnologia</span><span><Icon name="check-circle" size={17} /> Resultado antes da vaidade</span></div><Button href={specialistHref} dark>Conheça nosso processo <Icon name="arrow-right" size={17} /></Button></div>
        <div className="thx-about-visual" data-reveal><img src={`${RAW}/img/imagem2.png`} alt="Equipe e processo criativo ThynkXP" /><div className="thx-about-badge"><Icon name="sparkles" size={20} /><strong>THYNK</strong><span>EXPERIENCE</span></div></div>
      </section>

      <section className="thx-marquees" aria-label="Destaques"><div className="thx-text-marquee"><div>{[0,1].map(group=><span key={group}>Estratégia <i /> Design <i /> Desenvolvimento <i /> Automação <i /> Performance <i /></span>)}</div></div><div className="thx-text-marquee reverse"><div>{[0,1].map(group=><span key={group}>Sistemas <i /> Landing Pages <i /> E-commerce <i /> Branding <i /> Analytics <i /></span>)}</div></div></section>

      <section className="thx-services thx-shell" id="servicos">
        <div className="thx-section-head" data-reveal><div><SectionLabel index="02">Serviços</SectionLabel><h2>Do posicionamento<br/><em>à operação digital.</em></h2></div><p>Construímos produtos e experiências digitais conectando estratégia, design, tecnologia e performance.</p></div>
        <div className="thx-services-grid">{services.map((item,index)=><article className="thx-service-card" key={item.title} data-reveal><div className="thx-service-top"><span className="thx-service-number">0{index+1}</span><div className="thx-service-icon"><Icon name={item.icon} /></div></div><h3>{item.title}</h3><p>{item.text}</p><div className="thx-service-tags">{item.tags.map(tag=><span key={tag}>{tag}</span>)}</div><a className="thx-circle-link" href={budgetHref} target="_blank" rel="noreferrer" aria-label={`Solicitar orçamento para ${item.title}`}><Icon name="arrow-up-right" /></a></article>)}</div>
      </section>

      <section className="thx-capabilities">
        <div className="thx-shell">
          <div className="thx-capabilities-head" data-reveal><SectionLabel index="03">Como construímos</SectionLabel><h2>Mais que páginas bonitas.<br/><em>Produtos pensados para funcionar.</em></h2></div>
          <div className="thx-capabilities-grid">{capabilities.map(item=><article key={item.value} data-reveal><div className="thx-capability-icon"><Icon name={item.icon} /></div><strong>{item.value}</strong><h3>{item.label}</h3><p>{item.description}</p></article>)}</div>
          <div className="thx-code-window" data-reveal><div className="thx-code-window-top"><span /><span /><span /><b>experience.config</b></div><div className="thx-code-body"><div><small>01</small><code>strategy</code><strong>problema, público, objetivo</strong></div><div><small>02</small><code>experience</code><strong>fluxo, interface, conteúdo</strong></div><div><small>03</small><code>technology</code><strong>front-end, back-end, integração</strong></div><div><small>04</small><code>growth</code><strong>analytics, automação, evolução</strong></div></div></div>
        </div>
      </section>

      <section className="thx-process thx-shell" id="processo">
        <div className="thx-section-head" data-reveal><div><SectionLabel index="04">Processo</SectionLabel><h2>Do primeiro diagnóstico<br/><em>à evolução contínua.</em></h2></div><p>Um fluxo organizado reduz ruído, acelera decisões e permite que cada etapa tenha um objetivo claro.</p></div>
        <div className="thx-process-line">{process.map((item,index)=><article key={item.step} data-reveal><span className="thx-process-step">{item.step}</span><div className="thx-process-icon"><Icon name={item.icon} /></div><h3>{item.title}</h3><p>{item.text}</p>{index<process.length-1&&<span className="thx-process-connector" />}</article>)}</div>
      </section>

      <section className="thx-projects" id="projetos">
        <div className="thx-shell thx-projects-head" data-reveal><div><SectionLabel index="05">Projetos</SectionLabel><h2>Visual com estratégia.<br/><em>Solução com resultado.</em></h2></div><p>Projetos construídos para comunicar com clareza, valorizar a marca e entregar uma experiência coerente do primeiro contato à conversão.</p></div>
        <div className="thx-project-marquee"><div className="thx-project-track">{[0,1].map(group=><div className="thx-project-group" key={group} aria-hidden={group===1}>
          <a className="thx-project-card" href="/pagbanknext.html"><img src={`${RAW}/img/projeto3.png`} alt="Projeto PagBank Next" /><div className="thx-project-overlay" /><div className="thx-project-content"><span>UI Design</span><h3>PagBank Next</h3><p>Experiência digital para uma solução financeira moderna, clara e confiável.</p><div><Icon name="arrow-up-right" /></div></div></a>
          <a className="thx-project-card is-orange" href="/saboratti.html"><img src={`${RAW}/img/projeto1.png`} alt="Projeto Saboratti" /><div className="thx-project-overlay" /><div className="thx-project-content"><span>Branding</span><h3>Saboratti</h3><p>Marca com personalidade, presença visual e comunicação desenhada para gerar desejo.</p><div><Icon name="arrow-up-right" /></div></div></a>
          <a className="thx-project-card is-concept" href={budgetHref} target="_blank" rel="noreferrer"><div className="thx-project-grid-bg" /><div className="thx-project-content"><span>Sistemas</span><h3>Seu próximo produto</h3><p>Dashboard, plataforma, automação ou experiência sob medida para a sua operação.</p><div><Icon name="arrow-up-right" /></div></div></a>
        </div>)}</div></div>
      </section>

      <section className="thx-proof thx-shell">
        <div className="thx-proof-heading" data-reveal><SectionLabel index="06">Experiência</SectionLabel><h2>O projeto termina quando<br/><em>começa a gerar valor.</em></h2><p>A entrega precisa ser utilizável, mensurável e preparada para continuar evoluindo.</p></div>
        <div className="thx-proof-grid"><article data-reveal><strong>01</strong><h3>Experiência consistente</h3><p>Interface, conteúdo e comportamento trabalhando juntos em cada breakpoint.</p></article><article data-reveal><strong>02</strong><h3>Operação mais organizada</h3><p>Fluxos e integrações pensados para reduzir atrito dentro e fora da empresa.</p></article><article data-reveal><strong>03</strong><h3>Decisões mais claras</h3><p>Mensuração e dados de navegação conectados aos pontos que realmente importam.</p></article></div>
      </section>

      <section className="thx-testimonials thx-shell">
        <div className="thx-section-head" data-reveal><div><SectionLabel index="07">Depoimentos</SectionLabel><h2>Quem trabalha conosco<br/><em>percebe a diferença.</em></h2></div><p>Projetos são relações de confiança. Processo, atenção e comunicação fazem parte da entrega.</p></div>
        <div className="thx-testimonial-stage"><div className="thx-testimonial-center" data-reveal><img src={`${RAW}/img/imagem3.png`} alt="" /><div className="thx-testimonial-seal"><Icon name="sparkles" /><span>THYNK<br/>EXPERIENCE</span></div></div>{testimonials.map((item,index)=><article className={`thx-testimonial-card card-${index+1}`} key={item[1]} data-reveal><p>“{item[0]}”</p><div><img src={`${RAW}/img/${item[3]}`} alt="" /><span><strong>{item[1]}</strong><small>{item[2]}</small></span></div></article>)}</div>
      </section>

      <section className="thx-resources thx-shell">
        <div className="thx-section-head" data-reveal><div><SectionLabel index="08">Conteúdo e consultoria</SectionLabel><h2>Antes de contratar,<br/><em>entenda o que faz sentido.</em></h2></div><p>Materiais e conversas objetivas para ajudar a transformar uma ideia vaga em uma próxima decisão clara.</p></div>
        <div className="thx-resource-grid"><article data-reveal><div className="thx-resource-icon"><Icon name="message-square" /></div><span>Consultoria</span><h3>Diagnóstico digital gratuito</h3><p>Uma conversa para analisar o cenário, identificar oportunidades e orientar a melhor estrutura para o seu próximo projeto.</p><Button href={whatsapp('Olá! Gostaria de solicitar um diagnóstico digital para minha empresa.') } dark>Solicitar diagnóstico <Icon name="arrow-up-right" size={17} /></Button></article><article data-reveal><div className="thx-resource-icon"><Icon name="file" /></div><span>Material</span><h3>Guia de presença digital</h3><p>Um conteúdo prático sobre estrutura, posicionamento, experiência e os pontos que mais impactam um projeto digital.</p><button className="thx-disabled-action" type="button" disabled>Disponível em breve</button></article></div>
      </section>

      <section className="thx-faq thx-shell" id="faq">
        <div className="thx-faq-head" data-reveal><span className="thx-faq-badge"><Icon name="message-square" size={17} /> Dúvidas frequentes</span><h2>Perguntas antes de<br/><em>começar um projeto.</em></h2><p>Respostas objetivas para as dúvidas que normalmente aparecem antes de um site, sistema, e-commerce ou automação sair do papel.</p></div>
        <div className="thx-faq-list">{faqs.map((item,index)=><article className={faqOpen===index?'is-open':''} key={item[0]} data-reveal><button onClick={()=>setFaqOpen(faqOpen===index?null:index)} aria-expanded={faqOpen===index}><span>{item[0]}</span><i>{faqOpen===index?<Icon name="x" />:<Icon name="chevron-right" />}</i></button><div className="thx-faq-answer"><p>{item[1]}</p></div></article>)}</div>
        <div className="thx-faq-cta" data-reveal><div><Icon name="message-square" /><span><strong>Ainda ficou com alguma dúvida?</strong><p>Converse com a ThynkXP e receba uma orientação personalizada.</p></span></div><Button href={specialistHref}>Falar no WhatsApp <Icon name="whatsapp" size={17} /></Button></div>
      </section>

      <section className="thx-final-cta">
        <div className="thx-final-glow glow-a" /><div className="thx-final-glow glow-b" />
        <div className="thx-shell thx-final-inner" data-reveal><span className="thx-final-icon"><Icon name="rocket" size={26} /></span><h2>Pronto para construir<br/><em>algo que faça sentido?</em></h2><p>Conte o que você quer melhorar, automatizar, vender ou lançar. A gente transforma a necessidade em um caminho claro.</p><div><Button href={budgetHref}>Quero um orçamento <Icon name="arrow-up-right" size={17} /></Button><Button href="/cliente" ghost>Área do cliente <Icon name="arrow-right" size={17} /></Button></div></div>
      </section>

      <footer className="thx-footer">
        <div className="thx-shell thx-footer-grid"><div className="thx-footer-brand"><Logo /><p>Estratégia, design, desenvolvimento e automação para negócios que querem construir experiências digitais mais claras e eficientes.</p><div><a href="https://www.instagram.com/thynkxp/" target="_blank" rel="noreferrer" aria-label="Instagram"><Icon name="instagram" /></a><a href="https://wa.me/5532988221108" target="_blank" rel="noreferrer" aria-label="WhatsApp"><Icon name="whatsapp" /></a></div></div><div><h4>Navegação</h4>{nav.slice(0,4).map(([label,href])=><a href={href} key={href}>{label}</a>)}<a href="/cliente">Área do cliente</a></div><div><h4>Soluções</h4><a href="#servicos">Sites e landing pages</a><a href="#servicos">Sistemas e SaaS</a><a href="#servicos">E-commerce</a><a href="#servicos">Automações</a><a href="#servicos">Branding</a></div><div><h4>Contato</h4><a href="https://wa.me/5532988221108"><Icon name="phone" size={16} /> (32) 9 8822-1108</a><a href="mailto:thynkcontato@gmail.com"><Icon name="mail" size={16} /> thynkcontato@gmail.com</a><p><Icon name="location" size={16} /> Juiz de Fora / MG<br/>Atendimento remoto</p></div></div>
        <div className="thx-footer-bottom"><div className="thx-shell"><span>© {new Date().getFullYear()} ThynkXP. Todos os direitos reservados.</span><div><a href="/privacidade">Privacidade</a><a href="/admin/login">Admin</a></div></div></div>
      </footer>

      <button className={`thx-scroll-top ${showTop?'is-visible':''}`} onClick={()=>window.scrollTo({top:0,behavior:'smooth'})} aria-label="Voltar ao topo"><Icon name="arrow-up-right" /></button>
    </main>
  );
}
