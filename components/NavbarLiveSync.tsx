'use client';

import { useEffect } from 'react';

const budgetHref = 'https://wa.me/5532988221108?text=Ol%C3%A1%21%20Tudo%20bem%3F%20Conheci%20a%20ThynkXP%20pelo%20site%20e%20gostaria%20de%20solicitar%20um%20or%C3%A7amento%20para%20o%20meu%20projeto.%20Poderiam%20me%20orientar%20sobre%20os%20pr%C3%B3ximos%20passos%3F';

const navHtml = `
  <a href="#sobre-nos">Sobre nós</a>
  <a href="#servicos">Serviços</a>
  <a href="#projetos">Projetos</a>
  <a href="#faq">FAQ</a>
  <a href="/programa-indicacao.html">Programa de Indicação</a>
`;

const drawerHtml = `
  <a href="#sobre-nos">Sobre nós</a>
  <a href="#servicos">Serviços</a>
  <a href="#projetos">Projetos</a>
  <a href="#faq">FAQ</a>
  <a href="/programa-indicacao.html">Programa de Indicação</a>
`;

export default function NavbarLiveSync() {
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('.thx-nav-links');
    if (nav) nav.innerHTML = navHtml;

    const actions = document.querySelector<HTMLElement>('.thx-nav-actions');
    if (actions) {
      actions.innerHTML = `
        <a class="thx-live-budget" href="${budgetHref}" target="_blank" rel="noopener noreferrer">
          Quero um orçamento <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
        <a class="thx-live-social" href="https://www.instagram.com/thynkxp/" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-instagram"></i></a>
        <a class="thx-live-social" href="#" aria-label="LinkedIn"><i class="fa-brands fa-linkedin"></i></a>
        <a class="thx-live-social" href="https://wa.me/5532988221108" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i></a>
      `;
    }

    const drawerNav = document.querySelector<HTMLElement>('.thx-drawer nav');
    if (drawerNav) drawerNav.innerHTML = drawerHtml;
  }, []);

  return null;
}
