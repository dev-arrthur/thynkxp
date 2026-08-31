'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon, { type IconName } from './Icon';

const phases: { letter: string; name: string; title: string; text: string; icon: IconName; width: string }[] = [
  {
    letter: 'T',
    name: 'Think',
    title: 'Entender',
    text: 'Negócio, público, objetivo e contexto vêm antes da ferramenta.',
    icon: 'search',
    width: '72%',
  },
  {
    letter: 'H',
    name: 'Hypothesis',
    title: 'Direcionar',
    text: 'Transformamos informação em hipóteses, prioridades e arquitetura.',
    icon: 'layers',
    width: '82%',
  },
  {
    letter: 'Y',
    name: 'Your Experience',
    title: 'Desenhar',
    text: 'Jornada, interface, conteúdo e identidade passam a trabalhar juntos.',
    icon: 'pen-tool',
    width: '100%',
  },
  {
    letter: 'N',
    name: 'Next',
    title: 'Construir',
    text: 'Design vira produto com desenvolvimento, integração, teste e performance.',
    icon: 'code',
    width: '100%',
  },
  {
    letter: 'K',
    name: 'Keep Evolving',
    title: 'Evoluir',
    text: 'Publicamos, medimos e melhoramos a experiência continuamente.',
    icon: 'trending-up',
    width: '100%',
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

  const rowProgress = phases.map((_, index) => {
    const start = 0.035 + index * 0.18;
    const end = start + 0.20;
    return clamp((progress - start) / (end - start));
  });

  const lockedCount = rowProgress.filter((value) => value > 0.985).length;
  const active = Math.min(phases.length - 1, Math.max(0, lockedCount));
  const formed = lockedCount === phases.length;

  return createPortal(
    <section ref={sectionRef} className="thx-method-v6" id="nosso-metodo" aria-label="Método THYNK">
      <div className="thx-method-v6-sticky">
        <header className="thx-method-v6-heading">
          <span className="thx-section-index"><span>03</span>Nosso método</span>
          <div className="thx-method-v6-heading-row">
            <h2>O método <em>THYNK.</em></h2>
            <p>Cada fase sobe com a rolagem e encontra seu lugar. No final, as cinco etapas formam a palavra que representa o nosso jeito de pensar e construir.</p>
          </div>
        </header>

        <div className={`thx-thynk-vertical-stage ${formed ? 'is-formed' : ''}`}>
          <div className="thx-thynk-vertical-guide" aria-hidden="true">
            {phases.map((phase) => (
              <div key={phase.letter} style={{ width: phase.width }}>
                <strong>{phase.letter}</strong><span />
              </div>
            ))}
          </div>

          <div className="thx-thynk-vertical-cards" aria-label="THYNK">
            {phases.map((phase, index) => {
              const value = rowProgress[index];
              const y = (1 - value) * (72 + index * 10);
              const scale = 0.965 + value * 0.035;
              const locked = value > 0.985;

              return (
                <article
                  className={`thx-thynk-row ${value > 0.12 ? 'is-visible' : ''} ${locked ? 'is-locked' : ''}`}
                  key={phase.letter}
                  style={{
                    width: phase.width,
                    transform: `translate3d(0, ${y}vh, 0) scale(${scale})`,
                    opacity: 0.08 + value * 0.92,
                  }}
                >
                  <strong className="thx-thynk-row-letter">{phase.letter}</strong>
                  <div className="thx-thynk-row-line"><span style={{ transform: `scaleX(${Math.max(.08, value)})` }} /></div>
                  <div className="thx-thynk-row-copy">
                    <small>{phase.name}</small>
                    <b>{phase.title}</b>
                    <p>{phase.text}</p>
                  </div>
                  <div className="thx-thynk-row-icon"><Icon name={phase.icon} size={20} /></div>
                </article>
              );
            })}
          </div>
        </div>

        <footer className="thx-method-v6-footer">
          <div className="thx-method-v6-progress" aria-hidden="true"><span style={{ width: `${progress * 100}%` }} /></div>
          <div className="thx-method-v6-status">
            <span>{formed ? 'THYNK formado' : `0${Math.min(lockedCount + 1, 5)} / 05`}</span>
            <strong>{formed ? 'Think different. Build with purpose.' : phases[active].name}</strong>
          </div>
        </footer>
      </div>
    </section>,
    mount,
  );
}
