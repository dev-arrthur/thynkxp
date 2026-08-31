'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon, { type IconName } from './Icon';

const letters = ['M', 'É', 'T', 'O', 'D', 'O'];

const steps: { icon: IconName; step: string; title: string; text: string }[] = [
  { icon: 'search', step: '01', title: 'Diagnóstico', text: 'Começamos pelo problema. Entendemos o negócio, o público, os gargalos, os objetivos e o que precisa mudar para o projeto fazer sentido.' },
  { icon: 'layers', step: '02', title: 'Arquitetura', text: 'Organizamos conteúdo, funcionalidades, prioridades e jornada. Antes de desenhar a interface, desenhamos a lógica da experiência.' },
  { icon: 'pen-tool', step: '03', title: 'Design', text: 'Transformamos estratégia em direção visual, interface e sistema de componentes com clareza, personalidade e intenção.' },
  { icon: 'code', step: '04', title: 'Desenvolvimento', text: 'Construímos front-end, back-end e integrações com foco em performance, segurança, manutenção e evolução futura.' },
  { icon: 'check-circle', step: '05', title: 'Homologação', text: 'Testamos responsividade, conteúdo, fluxos, integrações, detalhes visuais e cenários reais antes de colocar a solução em produção.' },
  { icon: 'rocket', step: '06', title: 'Evolução', text: 'Publicamos, medimos e seguimos melhorando. Um produto digital bom não termina no deploy: ele aprende com uso, dados e resultado.' },
];

export default function MethodExperience() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const host = document.querySelector<HTMLElement>('.thx-capabilities .thx-shell');
    if (!host) return;

    const node = document.createElement('div');
    node.className = 'thx-method-portal-mount';
    host.prepend(node);
    setMount(node);

    const processLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href="#processo"]'));
    processLinks.forEach((link) => {
      link.setAttribute('href', '#nosso-metodo');
      const textNode = Array.from(link.childNodes).find((child) => child.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = 'Nosso método';
    });

    return () => {
      node.remove();
    };
  }, []);

  useEffect(() => {
    if (!mount) return;

    const cards = Array.from(mount.querySelectorAll<HTMLElement>('[data-method-card]'));
    if (!cards.length) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top + a.boundingClientRect.height / 2 - window.innerHeight / 2) - Math.abs(b.boundingClientRect.top + b.boundingClientRect.height / 2 - window.innerHeight / 2));

      if (visible[0]) {
        const index = Number((visible[0].target as HTMLElement).dataset.methodCard ?? 0);
        setActive(index);
      }
    }, {
      root: null,
      rootMargin: '-40% 0px -40% 0px',
      threshold: 0.01,
    });

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [mount]);

  if (!mount) return null;

  return createPortal(
    <section className="thx-method-v4" id="nosso-metodo" aria-label="Nosso método de trabalho">
      <div className="thx-method-heading" data-reveal>
        <span className="thx-section-index"><span>03</span>Nosso método</span>
        <h2>Uma etapa de cada vez.<br/><em>Até a ideia virar produto.</em></h2>
        <p>Role pela seção. Cada etapa ativa um card e completa uma letra da palavra que guia o nosso processo.</p>
      </div>

      <div className="thx-method-layout">
        <aside className="thx-method-sticky" aria-live="polite">
          <span className="thx-method-eyebrow">A palavra se completa com o projeto</span>
          <div className="thx-method-word" aria-label="Método">
            {letters.map((letter, index) => (
              <span key={`${letter}-${index}`} className={index <= active ? 'is-complete' : ''}>{letter}</span>
            ))}
          </div>
          <div className="thx-method-progress" aria-hidden="true">
            <span style={{ width: `${((active + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="thx-method-current">
            <span>{steps[active].step} / 06</span>
            <strong>{steps[active].title}</strong>
            <small>{Math.round(((active + 1) / steps.length) * 100)}% do método percorrido</small>
          </div>
          <div className="thx-method-scroll-cue"><Icon name="arrow-right" size={16} /><span>Continue rolando para completar</span></div>
        </aside>

        <div className="thx-method-cards">
          {steps.map((item, index) => (
            <article
              key={item.step}
              data-method-card={index}
              className={`thx-method-card ${index < active ? 'is-complete' : ''} ${index === active ? 'is-active' : ''}`}
            >
              <div className="thx-method-card-top">
                <span className="thx-method-number">{item.step}</span>
                <div className="thx-method-icon"><Icon name={item.icon} size={24} /></div>
                <span className="thx-method-letter">{letters[index]}</span>
              </div>
              <div className="thx-method-card-copy">
                <span>Etapa {item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
              <div className="thx-method-card-state">
                <span />
                <small>{index <= active ? 'Etapa conectada ao método' : 'Role para ativar esta etapa'}</small>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="thx-method-foundation">
        <span>O que sustenta cada etapa</span>
        <strong>Performance, segurança, analytics e integração continuam sendo a base técnica do método.</strong>
      </div>
    </section>,
    mount,
  );
}
