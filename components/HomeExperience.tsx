'use client';

import { useEffect, useMemo, useState } from 'react';

const RAW = 'https://raw.githubusercontent.com/dev-arrthur/thynkxp/main';
const LOGO = '/brand/thynkxp-logo.png';

const whatsapp = (message: string) =>
  `https://wa.me/5532988221108?text=${encodeURIComponent(message)}`;

const NAV = [
  ['Sobre nós', '#sobre-nos'],
  ['Serviços', '#servicos'],
  ['Projetos', '#projetos'],
  ['FAQ', '#faq'],
];

const tools = ['google-ads.png','meta.png','hotmart.png','chatgpt.png','wordpress.png','elementor.png','trello.png','canva.png','figma.png'];

const services = [
  { icon: '◫', title: 'Criação de Sites e Landing Pages', text: 'Estruturas de alta conversão, responsivas, rápidas e preparadas para gerar contatos e oportunidades.' },
  { icon: '◆', title: 'Criação de E-Commerces', text: 'Lojas virtuais completas, pensadas para vendas, performance, experiência e crescimento.' },
  { icon: '⚙', title: 'SaaS e Sistemas Personalizados', text: 'Sistemas sob medida para automatizar processos, organizar operações e escalar negócios.' },
  { icon: '↗', title: 'Marketing Digital e Tráfego Pago', text: 'Estratégias de aquisição para atrair o público certo e transformar atenção em resultado.' },
  { icon: '✦', title: 'Branding e Identidade Visual', text: 'Construção de marcas fortes, memoráveis e coerentes em todos os pontos de contato.' },
  { icon: '⌁', title: 'Automações Inteligentes', text: 'Fluxos digitais para reduzir tarefas manuais, integrar ferramentas e melhorar produtividade.' },
];

const testimonials = [
  ['Fiquei bem satisfeito com o serviço, são profissionais dedicados que entendem a ideia do cliente e entregam um material muito bom!', 'José Roberto', 'Empresário', 'user1.png'],
  ['O serviço é de fato personalizado. Em todos os serviços que contratamos nossos objetivos foram superados. Conseguiram colocar nos materiais a essência da nossa marca.', 'Eliane Jorge', 'Eng. Civil', 'user2.png'],
  ['Serviço de qualidade com total atenção ao cliente, equipe dedicada e com grande responsabilidade e profissionalismo. Eu recomendo os serviços!', 'Paulo Elbl', 'Sinuelo da Cultura', 'user3.png'],
  ['Atendimento ágil e estratégico do início ao fim. O novo site trouxe mais autoridade para nossa marca e melhorou bastante a geração de leads.', 'Marina Costa', 'Diretora Comercial', 'user4.png'],
  ['A equipe entendeu exatamente o que precisávamos e entregou além do combinado. Hoje temos um processo muito mais organizado e eficiente no digital.', 'Rafael Mendes', 'Gestor de Operações', 'user5.png'],
];

const faqs = [
  ['Quanto tempo leva para criar um site profissional?', 'O prazo depende do tamanho do projeto, quantidade de páginas, nível de personalização, integrações e velocidade de aprovação. Landing pages costumam ser mais rápidas, enquanto sites institucionais completos, e-commerces e sistemas personalizados exigem etapas adicionais de estratégia, design, desenvolvimento, testes e publicação.'],
  ['Vocês criam apenas o visual ou também desenvolvem o site/sistema?', 'Atuamos do planejamento à entrega: entendemos o objetivo do negócio, estruturamos a experiência, criamos o design, desenvolvemos a solução e orientamos a publicação. Quando necessário, também apoiamos com copy, conteúdo, automações e integrações.'],
  ['Qual é a diferença entre site institucional, landing page e sistema personalizado?', 'O site institucional apresenta sua empresa e serviços. A landing page é focada em uma conversão específica, como captação ou venda. Já um sistema personalizado resolve processos internos com dashboards, áreas de cliente, cadastros, relatórios, pedidos e fluxos sob medida.'],
  ['Meu projeto pode ter WhatsApp, formulários, pagamentos ou integrações?', 'Sim. Desenvolvemos integrações conforme a necessidade do negócio, incluindo WhatsApp, formulários, captura de leads, pixels, analytics, meios de pagamento, CRMs, planilhas, automações e outras plataformas compatíveis com o projeto.'],
  ['Como funciona o processo de criação com a ThynkXP?', 'Normalmente seguimos diagnóstico, definição de escopo, arquitetura, design, aprovação, desenvolvimento, testes e publicação. Durante o processo mantemos comunicação clara para validar decisões importantes e conectar a entrega aos objetivos do negócio.'],
  ['Como é definido o investimento de um site ou sistema?', 'O investimento varia conforme escopo, quantidade de telas, funcionalidades, integrações, prazo, complexidade técnica e nível de estratégia. Primeiro entendemos a necessidade e então apresentamos uma proposta compatível com o objetivo, sem pacotes genéricos.'],
];

function Logo({ className = '' }: { className?: string }) {
  return <img src={LOGO} className={className} alt="ThynkXP" />;
}

function CTAButton({ children, dark = false, href }: { children: React.ReactNode; dark?: boolean; href: string }) {
  return <a className={dark ? 'thx-btn thx-btn-dark' : 'thx-btn thx-btn-orange'} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{children}</a>;
}

export default function HomeExperience() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [showTop, setShowTop] = useState(false);

  const budgetHref = useMemo(() => whatsapp('Olá! Conheci a ThynkXP pelo site e gostaria de solicitar um orçamento para o meu projeto. Poderiam me orientar sobre os próximos passos?'), []);
  const specialistHref = useMemo(() => whatsapp('Olá! Vim pelo site da ThynkXP e gostaria de conversar com um especialista para entender como vocês podem ajudar meu negócio.'), []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 360);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <main className="thx-home">
      <header className="thx-header">
        <div className="thx-shell thx-nav-desktop">
          <a href="#top" className="thx-brand" aria-label="ThynkXP - início"><Logo /></a>
          <nav className="thx-nav-links" aria-label="Navegação principal">
            {NAV.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
            <a href="/cliente">Área do cliente</a>
          </nav>
          <div className="thx-nav-actions">
            <CTAButton href={budgetHref}>Quero um orçamento <span>↗</span></CTAButton>
            <a className="thx-social-pill" href="https://www.instagram.com/thynkxp/" target="_blank" rel="noreferrer" aria-label="Instagram">IG</a>
            <a className="thx-social-pill" href="https://wa.me/5532988221108" target="_blank" rel="noreferrer" aria-label="WhatsApp">WA</a>
          </div>
        </div>

        <div className="thx-shell thx-nav-mobile">
          <button className="thx-menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">☰</button>
          <a href="#top" className="thx-brand"><Logo /></a>
          <a className="thx-mobile-contact" href={budgetHref} target="_blank" rel="noreferrer">↗</a>
        </div>
      </header>

      <div className={`thx-overlay ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(false)} />
      <aside className={`thx-drawer ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="thx-drawer-head"><Logo /><button onClick={() => setMenuOpen(false)} aria-label="Fechar menu">×</button></div>
        <span className="thx-overline">Navegação</span>
        <nav>
          {NAV.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<span>↗</span></a>)}
          <a href="/cliente" onClick={() => setMenuOpen(false)}>Área do cliente<span>↗</span></a>
        </nav>
        <div className="thx-drawer-actions">
          <CTAButton href={budgetHref}>Quero um orçamento →</CTAButton>
          <CTAButton href={specialistHref} dark>Converse conosco</CTAButton>
        </div>
        <div className="thx-drawer-social"><a href="https://www.instagram.com/thynkxp/" target="_blank" rel="noreferrer">Instagram</a><a href="https://wa.me/5532988221108" target="_blank" rel="noreferrer">WhatsApp</a></div>
      </aside>

      <section className="thx-hero thx-shell" id="top">
        <div className="thx-hero-copy thx-reveal">
          <span className="thx-kicker"><b>●</b> Agência de desenvolvimento de sistemas</span>
          <h1>Estratégia e<br/>design pra você<br/><em>vender mais!</em></h1>
          <p>Assessoria especializada em atrair, converter e fidelizar seus clientes. Criação de sites de alta performance e soluções digitais para potencializar seus resultados.</p>
          <div className="thx-hero-buttons">
            <CTAButton href={budgetHref}>Quero um orçamento →</CTAButton>
            <CTAButton href={specialistHref} dark>Converse conosco <span>↗</span></CTAButton>
          </div>
          <div className="thx-mini-proof">
            <div><strong>+20</strong><span>projetos e soluções</span></div>
            <div><strong>100%</strong><span>foco em experiência</span></div>
            <div><strong>Full service</strong><span>estratégia ao deploy</span></div>
          </div>
        </div>
        <div className="thx-hero-visual thx-reveal thx-reveal-delay">
          <div className="thx-orbit thx-orbit-one" />
          <div className="thx-orbit thx-orbit-two" />
          <div className="thx-visual-card">
            <img src={`${RAW}/img/imagem1.png`} alt="Ilustração de estratégia e desenvolvimento ThynkXP" />
          </div>
          <span className="thx-floating-tag tag-one">Next.js</span>
          <span className="thx-floating-tag tag-two">Design + Tech</span>
          <span className="thx-floating-tag tag-three">Performance</span>
        </div>
      </section>

      <section className="thx-tools" aria-label="Ferramentas utilizadas">
        <p>As melhores ferramentas do mercado na sua operação.</p>
        {[0,1].map(line => (
          <div className="thx-tool-window" key={line}>
            <div className={`thx-tool-track ${line ? 'reverse' : ''}`}>
              {[...tools, ...tools].map((name, i) => <div className="thx-tool-logo" key={`${line}-${name}-${i}`}><img src={`${RAW}/logos/${name}`} alt="" /></div>)}
            </div>
          </div>
        ))}
      </section>

      <section className="thx-about thx-shell" id="sobre-nos">
        <div className="thx-about-copy">
          <span className="thx-section-index">01 / SOBRE</span>
          <h2>Prazer, <em>Thynk.</em><br/>Clareza, criatividade e foco em resultado.</h2>
          <p>Somos uma agência full service que vai além de campanhas bonitas. Criamos estratégias completas, do diagnóstico à execução, focadas em gerar resultados reais para o seu negócio.</p>
          <p>Nosso diferencial está na estrutura. Não entregamos digital genérico — posicionamos sua marca com clareza, propósito e foco total em conversão, autoridade e performance.</p>
          <CTAButton href={specialistHref}>Falar com um especialista →</CTAButton>
        </div>
        <div className="thx-about-visual">
          <div className="thx-about-badge">THYNK<br/><span>EXPERIENCE</span></div>
          <img src={`${RAW}/img/imagem2.png`} alt="Equipe criativa e tecnologia" />
        </div>
      </section>

      <section className="thx-marquees" aria-label="Diferenciais ThynkXP">
        <div className="thx-text-marquee">
          <div>{['Estratégia que vende','Design com propósito','Sistemas sob medida','Performance real','Experiência memorável','Seja Thynk','Estratégia que vende','Design com propósito','Sistemas sob medida','Performance real','Experiência memorável','Seja Thynk'].map((x,i)=><span key={i}>{x}<b>●</b></span>)}</div>
        </div>
        <div className="thx-text-marquee reverse">
          <div>{['Marcas mais fortes','Sites de alta conversão','Automações inteligentes','Clareza visual','Crescimento digital','Seja diferente','Marcas mais fortes','Sites de alta conversão','Automações inteligentes','Clareza visual','Crescimento digital','Seja diferente'].map((x,i)=><span key={i}>{x}<b>●</b></span>)}</div>
        </div>
      </section>

      <section className="thx-services thx-shell" id="servicos">
        <div className="thx-section-head">
          <div><span className="thx-section-index">02 / SERVIÇOS</span><h2><em>Nossos serviços.</em><br/>Soluções que impulsionam seu crescimento.</h2></div>
          <p>Estratégia, performance e experiência alinhadas para gerar resultados reais e sustentáveis para o seu negócio.</p>
        </div>
        <div className="thx-services-grid">
          {services.map((service, index) => (
            <article className="thx-service-card" key={service.title}>
              <div className="thx-service-number">0{index + 1}</div>
              <div className="thx-service-icon">{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
              <a href={whatsapp(`Olá! Vim pelo site da ThynkXP e tenho interesse em ${service.title}. Gostaria de receber mais informações.`)} target="_blank" rel="noreferrer" aria-label={`Saiba mais sobre ${service.title}`}>↗</a>
            </article>
          ))}
        </div>
      </section>

      <section className="thx-trusted">
        <span>Empresa que confia em nosso serviço.</span>
        <div className="thx-trusted-window"><div className="thx-trusted-track">
          {[0,1,2,3,4,5,6,7].map(i => <img key={i} src={`${RAW}/empresas/logo1.png`} alt="Empresa parceira" />)}
        </div></div>
      </section>

      <section className="thx-projects thx-shell" id="projetos">
        <div className="thx-section-head">
          <div><span className="thx-section-index">03 / PROJETOS</span><h2><em>Projetos.</em><br/>Visual com estratégia, solução com resultado.</h2></div>
          <div className="thx-projects-intro"><p>Tudo é pensado de forma personalizada para sua marca se comunicar com clareza, se conectar com o público certo e crescer com consistência.</p><CTAButton href={budgetHref}>Quero um orçamento →</CTAButton></div>
        </div>
        <div className="thx-project-marquee">
          <div className="thx-project-track">
            {[0,1].map(loop => <div className="thx-project-group" key={loop}>
              <a className="thx-project-card" href={budgetHref} target="_blank" rel="noreferrer">
                <img src={`${RAW}/img/projeto3.png`} alt="Projeto PagBank Next" />
                <div className="thx-project-shade" />
                <span>UI Design</span><div><small>CASE / 01</small><h3>PagBank Next</h3><p>Experiência digital para uma solução financeira moderna, clara e confiável.</p></div><b>↗</b>
              </a>
              <a className="thx-project-card thx-project-orange" href={budgetHref} target="_blank" rel="noreferrer">
                <img src={`${RAW}/img/projeto1.png`} alt="Projeto Saboratti" />
                <div className="thx-project-shade" />
                <span>Branding</span><div><small>CASE / 02</small><h3>Saboratti</h3><p>Branding com personalidade, presença visual marcante e comunicação feita para vender.</p></div><b>↗</b>
              </a>
            </div>)}
          </div>
        </div>
      </section>

      <section className="thx-testimonials thx-shell">
        <div className="thx-testimonial-title"><span className="thx-section-index">04 / DEPOIMENTOS</span><h2><em>Depoimentos.</em><br/>Saiba o que falam de nós.</h2></div>
        <div className="thx-testimonial-stage">
          <div className="thx-testimonial-center"><img src={`${RAW}/img/imagem3.png`} alt="" /></div>
          <div className="thx-testimonial-list">
            {testimonials.map(([text,name,role,image], index) => (
              <article className={`thx-testimonial-card card-${index+1}`} key={name}>
                <span className="thx-quote">“</span><p>{text}</p>
                <div><img src={`${RAW}/img/${image}`} alt="" /><span><strong>{name}</strong><small>{role}</small></span></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="thx-resources thx-shell">
        <div className="thx-section-head">
          <div><span className="thx-section-index">05 / CONTEÚDO</span><h2><em>Materiais e consultoria.</em><br/>Aproveite e solicite agora.</h2></div>
        </div>
        <div className="thx-resource-grid">
          <article><span>◌</span><h3>Diagnóstico digital gratuito</h3><p>Receba uma conversa individualizada sobre estratégia, presença digital, produto e posicionamento do seu negócio.</p><CTAButton href={whatsapp('Olá! Vim pelo site e gostaria de solicitar um diagnóstico estratégico para a minha empresa.')}>Solicitar diagnóstico →</CTAButton></article>
          <article><span>▤</span><h3>Ebook para Empresas</h3><p>Estamos preparando um material prático com ideias para acelerar crescimento, posicionamento, experiência e conversão.</p><button disabled>Em breve</button></article>
        </div>
      </section>

      <section className="thx-faq thx-shell" id="faq">
        <div className="thx-faq-heading">
          <span className="thx-kicker"><b>?</b> Dúvidas frequentes</span>
          <h2>Perguntas <em>Frequentes</em></h2>
          <p>Reunimos as principais dúvidas de quem está planejando criar um site, landing page, e-commerce ou sistema sob medida.</p>
        </div>
        <div className="thx-faq-list">
          {faqs.map(([q,a], index) => (
            <div className={`thx-faq-item ${faqOpen === index ? 'is-open' : ''}`} key={q}>
              <button onClick={() => setFaqOpen(faqOpen === index ? null : index)} aria-expanded={faqOpen === index}><span>{q}</span><b>+</b></button>
              <div className="thx-faq-answer"><div><p>{a}</p></div></div>
            </div>
          ))}
        </div>
        <div className="thx-faq-cta"><div><h3>Ainda ficou com alguma dúvida?</h3><p>Fale com a ThynkXP e receba uma orientação personalizada para o seu projeto.</p></div><CTAButton href={specialistHref}>Tirar dúvidas pelo WhatsApp →</CTAButton></div>
      </section>

      <section className="thx-final-cta thx-shell">
        <div><span className="thx-section-index">06 / VAMOS COMEÇAR</span><h2>Pronto pra <em>começar?</em></h2><p>Seu projeto merece planejamento, criatividade e execução de excelência. Fale com nossa equipe e encontre a melhor solução para o seu negócio.</p><CTAButton href={budgetHref}>Quero um orçamento →</CTAButton></div>
        <img src={`${RAW}/img/imagem3.png`} alt="ThynkXP" />
      </section>

      <footer className="thx-footer">
        <div className="thx-shell thx-footer-grid">
          <div className="thx-footer-brand"><Logo /><p>Agência de desenvolvimento de sistemas full service, especializada em estratégia, design e soluções digitais para marcas que buscam crescimento com resultado.</p><div><a href="https://www.instagram.com/thynkxp/" target="_blank" rel="noreferrer">Instagram ↗</a><a href="https://wa.me/5532988221108" target="_blank" rel="noreferrer">WhatsApp ↗</a></div></div>
          <div><h4>Contato</h4><p>(32) 9 8822-1108</p><p>thynkcontato@gmail.com</p></div>
          <div><h4>Onde estamos?</h4><p>Nosso time trabalha de forma remota em Juiz de Fora / MG.</p></div>
          <div><h4>Mapa do site</h4>{NAV.map(([label,href]) => <a key={href} href={href}>{label}</a>)}<a href="/cliente">Área do cliente</a><a href="/privacidade">Privacidade</a></div>
        </div>
        <div className="thx-footer-bottom">© {new Date().getFullYear()} ThynkXP. Todos os direitos reservados. <span>Think beyond. Build better.</span></div>
      </footer>

      <button className={`thx-scroll-top ${showTop ? 'is-visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Voltar ao topo">↑</button>
    </main>
  );
}
