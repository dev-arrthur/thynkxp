'use client';

import { useEffect } from 'react';

const navItems = [
  { href: '#sobre-nos', label: 'Quem somos', icon: 'fa-regular fa-building' },
  { href: '#servicos', label: 'Soluções', icon: 'fa-solid fa-layer-group' },
  { href: '#processo', label: 'Como fazemos', icon: 'fa-solid fa-route' },
  { href: '#projetos', label: 'Projetos', icon: 'fa-regular fa-images' },
  { href: '#faq', label: 'Dúvidas', icon: 'fa-regular fa-circle-question' },
  { href: '/cliente', label: 'Área do cliente', icon: 'fa-regular fa-user' },
];

const trustedItems = [
  ['fa-brands fa-react', 'React'],
  ['fa-brands fa-js', 'JavaScript'],
  ['fa-solid fa-code', 'Next.js'],
  ['fa-brands fa-node-js', 'Node.js'],
  ['fa-solid fa-database', 'MongoDB'],
  ['fa-solid fa-cloud', 'Cloud'],
  ['fa-solid fa-chart-line', 'Analytics'],
  ['fa-solid fa-bolt', 'Performance'],
  ['fa-solid fa-gears', 'Automação'],
  ['fa-solid fa-plug', 'APIs'],
  ['fa-solid fa-shield-halved', 'Segurança'],
  ['fa-solid fa-cart-shopping', 'E-commerce'],
  ['fa-solid fa-envelope-open-text', 'CRM'],
  ['fa-solid fa-layer-group', 'SaaS'],
  ['fa-solid fa-wand-magic-sparkles', 'UX/UI'],
  ['fa-solid fa-chart-simple', 'CRO'],
];

function buildTrustedTrack() {
  return [...trustedItems, ...trustedItems].map(([icon, label], index) => (
    `<div class="thx-trusted-item" aria-hidden="${index >= trustedItems.length ? 'true' : 'false'}">` +
      `<span class="thx-trusted-icon"><i class="${icon}" aria-hidden="true"></i></span>` +
      `<strong>${label}</strong>` +
    `</div>`
  )).join('');
}

export default function HomeChromeEnhancer() {
  useEffect(() => {
    const fontAwesomeId = 'thx-font-awesome';
    if (!document.getElementById(fontAwesomeId)) {
      const link = document.createElement('link');
      link.id = fontAwesomeId;
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css';
      link.referrerPolicy = 'no-referrer';
      document.head.appendChild(link);
    }

    const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.thx-nav-links a'));
    navLinks.forEach((anchor) => {
      const item = navItems.find((entry) => anchor.getAttribute('href') === entry.href);
      if (!item) return;
      anchor.innerHTML = `<i class="${item.icon}" aria-hidden="true"></i><span>${item.label}</span>`;
    });

    const sectionLinks = navItems.filter((item) => item.href.startsWith('#'));
    const setActive = (href: string) => {
      navLinks.forEach((anchor) => anchor.classList.toggle('is-active', anchor.getAttribute('href') === href));
    };

    const observed = sectionLinks
      .map((item) => ({ item, section: document.querySelector<HTMLElement>(item.href) }))
      .filter((entry): entry is { item: typeof navItems[number]; section: HTMLElement } => Boolean(entry.section));

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const found = observed.find((entry) => entry.section === visible.target);
      if (found) setActive(found.item.href);
    }, { rootMargin: '-28% 0px -58% 0px', threshold: [0, 0.05, 0.2] });

    observed.forEach(({ section }) => observer.observe(section));

    const trusted = document.querySelector<HTMLElement>('.thx-trusted');
    if (trusted) {
      trusted.innerHTML = `
        <div class="thx-trusted-copy thx-shell">
          <div>
            <span class="thx-trusted-eyebrow"><i class="fa-solid fa-microchip" aria-hidden="true"></i> Ecossistema digital</span>
            <h3>Tecnologia que acompanha<br><em>a operação inteira.</em></h3>
          </div>
          <p>Da interface à automação, conectamos as ferramentas certas para construir experiências rápidas, mensuráveis e preparadas para crescer.</p>
        </div>
        <div class="thx-trusted-window" aria-label="Tecnologias e capacidades utilizadas pela ThynkXP">
          <div class="thx-trusted-track">${buildTrustedTrack()}</div>
        </div>
        <div class="thx-trusted-signals thx-shell">
          <span><i class="fa-solid fa-circle-check"></i> Front-end + back-end</span>
          <span><i class="fa-solid fa-circle-check"></i> Dados + analytics</span>
          <span><i class="fa-solid fa-circle-check"></i> Integrações + automações</span>
          <span><i class="fa-solid fa-circle-check"></i> Performance + conversão</span>
        </div>
      `;
    }

    return () => observer.disconnect();
  }, []);

  return null;
}
