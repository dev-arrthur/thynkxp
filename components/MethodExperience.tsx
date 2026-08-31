'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon, { type IconName } from './Icon';

const phases: { letter: string; name: string; title: string; text: string; icon: IconName }[] = [
  {
    letter: 'T',
    name: 'Think',
    title: 'Entender',
    text: 'Entramos no problema antes de entrar na ferramenta. Negócio, público, objetivo, contexto e oportunidade vêm primeiro.',
    icon: 'search',
  },
  {
    letter: 'H',
    name: 'Hypothesis',
    title: 'Direcionar',
    text: 'Transformamos informação em hipóteses, prioridades, arquitetura e uma direção clara para a solução que será construída.',
    icon: 'layers',
  },
  {
    letter: 'Y',
    name: 'Your Experience',
    title: 'Desenhar',
    text: 'A experiência nasce para quem vai usar. Jornada, conteúdo, interface e identidade passam a trabalhar como um único sistema.',
    icon: 'pen-tool',
  },
  {
    letter: 'N',
    name: 'Next',
    title: 'Construir',
    text: 'Design vira produto. Desenvolvimento, integrações, performance, testes e homologação colocam a experiência de pé.',
    icon: 'code',
  },
  {
    letter: 'K',
    name: 'Keep Evolving',
    title: 'Evoluir',
    text: 'Publicamos, medimos e melhoramos. O projeto continua aprendendo com comportamento, dados, operação e resultado.',
    icon: 'trending-up',
  },
];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export default function MethodExperience() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const host = document.querySelector<HTMLElement>('.thx-capabilities .thx-shell');
    if (!host) return;

    const node = document.createElement('div');
    node.className = 'thx-method-portal-mount';
    host.prepend(node);
    setMount(node);

    const processLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href="#processo"], a[href="#nosso-metodo"]'));
    processLinks.forEach((link) => {
      link.setAttribute('href', '#nosso-metodo');
      const textNode = Array.from(link.childNodes).find((child) => child.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = 'Nosso método';
    });

    return () => node.remove();
  }, []);

  useEffect(() => {
    if (!mount) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) {
      setProgress(1);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const scrollable = Math.max(1, section.offsetHeight - window.innerHeight);
      const next = clamp(-rect.top / scrollable);
      setProgress((current) => (Math.abs(current - next) > 0.001 ? next : current));
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [mount]);

  if (!mount) return null;

  const cardProgress = phases.map((_, index) => {
    const start = 0.06 + index * 0.17;
    const end = start + 0.18;
    return clamp((progress - start) / (end - start));
  });

  const active = Math.min(
    phases.length - 1,
    Math.max(0, cardProgress.filter((value) => value >= 0.55).length - 1),
  );
  const formed = cardProgress.every((value) => value > 0.985);

  return createPortal(
    <section ref={sectionRef} className="thx-method-v5" id="nosso-metodo" aria-label="Método THYNK">
      <div className="thx-method-v5-sticky">
        <header className="thx-method-v5-heading">
          <span className="thx-section-index"><span>03</span>Nosso método</span>
          <div className="thx-method-v5-heading-row">
            <h2>Nosso jeito de pensar<br/><em>antes de construir.</em></h2>
            <p>Role para montar o nosso método. Cada etapa sobe, encontra seu lugar e revela uma letra de <strong>THYNK</strong>.</p>
          </div>
        </header>

        <div className={`thx-thynk-stage ${formed ? 'is-formed' : ''}`}>
          <div className="thx-thynk-guide" aria-hidden="true">
            {phases.map((phase) => <span key={phase.letter}>{phase.letter}</span>)}
          </div>

          <div className="thx-thynk-cards" aria-label="THYNK">
            {phases.map((phase, index) => {
              const value = cardProgress[index];
              const y = (1 - value) * (96 + index * 8);
              const rotation = (1 - value) * (index % 2 === 0 ? -4 : 4);
              const scale = 0.88 + value * 0.12;
              return (
                <article
                  className={`thx-thynk-card ${value > 0.55 ? 'is-arriving' : ''} ${value > 0.985 ? 'is-locked' : ''}`}
                  key={phase.letter}
                  style={{
                    transform: `translate3d(0, ${y}vh, 0) rotate(${rotation}deg) scale(${scale})`,
                    opacity: 0.12 + value * 0.88,
                  }}
                >
                  <div className="thx-thynk-card-head">
                    <span>0{index + 1}</span>
                    <Icon name={phase.icon} size={20} />
                  </div>
                  <strong className="thx-thynk-letter">{phase.letter}</strong>
                  <div className="thx-thynk-card-copy">
                    <small>{phase.name}</small>
                    <h3>{phase.title}</h3>
                    <p>{phase.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <footer className="thx-method-v5-footer">
          <div className="thx-method-v5-progress" aria-hidden="true"><span style={{ width: `${progress * 100}%` }} /></div>
          <div className="thx-method-v5-status">
            <span>{formed ? 'THYNK completo' : `0${active + 1} / 05`}</span>
            <strong>{formed ? 'Pensar. Construir. Evoluir.' : phases[active].name}</strong>
          </div>
        </footer>
      </div>
    </section>,
    mount,
  );
}
