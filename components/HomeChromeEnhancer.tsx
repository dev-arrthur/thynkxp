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

const VISITOR_KEY = 'thynkxp_visitor_id';

function getVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY) || '';
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `thx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function hasAnalyticsConsent() {
  return document.cookie.split('; ').some((item) => item === 'thynkxp_consent=analytics');
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
    const setActive = (href: string) => navLinks.forEach((anchor) => anchor.classList.toggle('is-active', anchor.getAttribute('href') === href));
    const observed = sectionLinks
      .map((item) => ({ item, section: document.querySelector<HTMLElement>(item.href) }))
      .filter((entry): entry is { item: typeof navItems[number]; section: HTMLElement } => Boolean(entry.section));

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const found = observed.find((entry) => entry.section === visible.target);
      if (found) setActive(found.item.href);
    }, { rootMargin: '-28% 0px -58% 0px', threshold: [0, 0.05, 0.2] });
    observed.forEach(({ section }) => observer.observe(section));

    const finalCta = document.querySelector<HTMLElement>('.thx-final-cta');
    if (finalCta) {
      finalCta.innerHTML = `
        <div class="thx-final-glow glow-a"></div><div class="thx-final-glow glow-b"></div>
        <div class="thx-shell thx-final-lead-grid">
          <div class="thx-final-lead-copy">
            <span class="thx-final-icon"><i class="fa-solid fa-rocket"></i></span>
            <span class="thx-final-kicker"><i class="fa-solid fa-wand-magic-sparkles"></i> Vamos tirar sua ideia do papel</span>
            <h2>Pronto para construir<br><em>algo que faça sentido?</em></h2>
            <p>Conte o que você quer melhorar, automatizar, vender ou lançar. A gente transforma a necessidade em um caminho claro.</p>
            <div class="thx-final-trust">
              <span><i class="fa-solid fa-circle-check"></i> Resposta personalizada</span>
              <span><i class="fa-solid fa-circle-check"></i> Sem proposta genérica</span>
              <span><i class="fa-solid fa-circle-check"></i> Jornada vinculada ao visitante quando analytics estiver autorizado</span>
            </div>
            <div class="thx-final-alt-actions">
              <a class="thx-btn thx-btn-orange" target="_blank" rel="noreferrer" href="https://wa.me/5532988221108?text=Ol%C3%A1!%20Conheci%20a%20ThynkXP%20pelo%20site%20e%20gostaria%20de%20solicitar%20um%20or%C3%A7amento%20para%20o%20meu%20projeto.%20Poderiam%20me%20orientar%20sobre%20os%20pr%C3%B3ximos%20passos%3F">Prefiro WhatsApp <i class="fa-brands fa-whatsapp"></i></a>
              <a class="thx-btn thx-btn-ghost" href="/cliente">Área do cliente <i class="fa-solid fa-arrow-right"></i></a>
            </div>
          </div>
          <form class="thx-lead-form" id="thx-final-lead-form">
            <div class="thx-lead-form-head"><div><span>Fale sobre o projeto</span><strong>Receba um próximo passo claro.</strong></div><span class="thx-lead-badge">leva menos de 1 min</span></div>
            <div class="thx-lead-fields two-col">
              <label><span>Nome *</span><input name="name" required autocomplete="name" placeholder="Como podemos te chamar?"></label>
              <label><span>E-mail *</span><input name="email" required type="email" autocomplete="email" placeholder="voce@empresa.com"></label>
            </div>
            <div class="thx-lead-fields two-col">
              <label><span>WhatsApp / telefone</span><input name="phone" autocomplete="tel" placeholder="(32) 9 9999-9999"></label>
              <label><span>Empresa</span><input name="company" autocomplete="organization" placeholder="Nome da empresa"></label>
            </div>
            <label class="thx-lead-field"><span>O que você quer construir?</span><select name="interest"><option value="">Selecione uma opção</option><option>Site ou landing page</option><option>Sistema / SaaS</option><option>E-commerce</option><option>Automação</option><option>Branding</option><option>Marketing / performance</option><option>Outro</option></select></label>
            <label class="thx-lead-field"><span>Conte um pouco</span><textarea name="message" rows="4" placeholder="Objetivo, problema atual, prazo ou qualquer contexto que ajude."></textarea></label>
            <label class="thx-lead-consent"><input name="consent" type="checkbox" required><span>Autorizo a ThynkXP a usar estes dados para entrar em contato sobre este projeto. *</span></label>
            <button class="thx-lead-submit" type="submit"><span>Quero receber uma orientação</span><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
            <div class="thx-lead-feedback" aria-live="polite"></div>
            <small class="thx-lead-privacy">Ao enviar, você concorda com o contato relacionado a esta solicitação. <a href="/privacidade">Ver política de privacidade</a>.</small>
          </form>
        </div>`;
    }

    const form = document.querySelector<HTMLFormElement>('#thx-final-lead-form');
    const onSubmit = async (event: Event) => {
      event.preventDefault();
      if (!form) return;
      const button = form.querySelector<HTMLButtonElement>('.thx-lead-submit');
      const feedback = form.querySelector<HTMLElement>('.thx-lead-feedback');
      const data = new FormData(form);
      const params = new URLSearchParams(location.search);
      if (button) { button.disabled = true; button.querySelector('span')!.textContent = 'Enviando...'; }
      if (feedback) { feedback.className = 'thx-lead-feedback'; feedback.textContent = ''; }
      try {
        const response = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.get('name'), email: data.get('email'), phone: data.get('phone'), company: data.get('company'),
            interest: data.get('interest'), message: data.get('message'), consent: data.get('consent') === 'on',
            analyticsConsent: hasAnalyticsConsent(), visitorId: getVisitorId(), source: 'CTA final / formulário',
            landingPath: location.pathname + location.search, referrer: document.referrer,
            utm: { source: params.get('utm_source') || '', medium: params.get('utm_medium') || '', campaign: params.get('utm_campaign') || '', term: params.get('utm_term') || '', content: params.get('utm_content') || '' },
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Não foi possível enviar agora.');
        form.reset();
        if (feedback) { feedback.className = 'thx-lead-feedback success'; feedback.innerHTML = '<i class="fa-solid fa-circle-check"></i> Recebemos seus dados. Vamos dar continuidade ao atendimento.'; }
      } catch (error) {
        if (feedback) { feedback.className = 'thx-lead-feedback error'; feedback.textContent = error instanceof Error ? error.message : 'Não foi possível enviar agora.'; }
      } finally {
        if (button) { button.disabled = false; button.querySelector('span')!.textContent = 'Quero receber uma orientação'; }
      }
    };
    form?.addEventListener('submit', onSubmit);

    return () => { observer.disconnect(); form?.removeEventListener('submit', onSubmit); };
  }, []);

  return null;
}
