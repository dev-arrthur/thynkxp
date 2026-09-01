'use client';

import { FormEvent, useMemo, useState } from 'react';
import Icon from './Icon';

const VISITOR_KEY = 'thynkxp_visitor_id';

function getVisitorId() {
  if (typeof window === 'undefined') return '';
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
  return typeof document !== 'undefined' && document.cookie.split('; ').some((item) => item === 'thynkxp_consent=analytics');
}

function getUtm() {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
    term: params.get('utm_term') || '',
    content: params.get('utm_content') || '',
  };
}

export default function LeadCaptureForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const whatsapp = useMemo(() => 'https://wa.me/5532988221108?text=' + encodeURIComponent('Olá! Conheci a ThynkXP pelo site e gostaria de solicitar um orçamento para o meu projeto. Poderiam me orientar sobre os próximos passos?'), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setError('');

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name') || ''),
      email: String(form.get('email') || ''),
      phone: String(form.get('phone') || ''),
      company: String(form.get('company') || ''),
      interest: String(form.get('interest') || ''),
      message: String(form.get('message') || ''),
      consent: form.get('consent') === 'on',
      visitorId: getVisitorId(),
      analyticsConsent: hasAnalyticsConsent(),
      source: 'CTA final / formulário',
      landingPath: window.location.pathname + window.location.search,
      referrer: document.referrer,
      utm: getUtm(),
    };

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar agora.');
      setStatus('success');
      event.currentTarget.reset();
    } catch (submitError) {
      setStatus('error');
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível enviar agora.');
    }
  }

  return (
    <div className="thx-final-lead-grid">
      <div className="thx-final-lead-copy">
        <span className="thx-final-icon"><Icon name="rocket" size={26} /></span>
        <span className="thx-final-kicker"><Icon name="sparkles" size={15} /> Vamos tirar sua ideia do papel</span>
        <h2>Pronto para construir<br/><em>algo que faça sentido?</em></h2>
        <p>Conte o que você quer melhorar, automatizar, vender ou lançar. A gente transforma a necessidade em um caminho claro.</p>
        <div className="thx-final-trust">
          <span><Icon name="check-circle" size={16} /> Resposta personalizada</span>
          <span><Icon name="check-circle" size={16} /> Sem proposta genérica</span>
          <span><Icon name="check-circle" size={16} /> Seus dados ficam vinculados à sua jornada no site quando você autorizou analytics</span>
        </div>
        <div className="thx-final-alt-actions">
          <a className="thx-btn thx-btn-orange" href={whatsapp} target="_blank" rel="noreferrer">Prefiro WhatsApp <Icon name="whatsapp" size={17} /></a>
          <a className="thx-btn thx-btn-ghost" href="/cliente">Área do cliente <Icon name="arrow-right" size={17} /></a>
        </div>
      </div>

      <form className="thx-lead-form" onSubmit={handleSubmit}>
        <div className="thx-lead-form-head">
          <div><span>Fale sobre o projeto</span><strong>Receba um próximo passo claro.</strong></div>
          <span className="thx-lead-badge">leva menos de 1 min</span>
        </div>

        <div className="thx-lead-fields two-col">
          <label><span>Nome *</span><input name="name" required autoComplete="name" placeholder="Como podemos te chamar?" /></label>
          <label><span>E-mail *</span><input name="email" required type="email" autoComplete="email" placeholder="voce@empresa.com" /></label>
        </div>
        <div className="thx-lead-fields two-col">
          <label><span>WhatsApp / telefone</span><input name="phone" autoComplete="tel" placeholder="(32) 9 9999-9999" /></label>
          <label><span>Empresa</span><input name="company" autoComplete="organization" placeholder="Nome da empresa" /></label>
        </div>
        <label className="thx-lead-field"><span>O que você quer construir?</span><select name="interest" defaultValue=""><option value="" disabled>Selecione uma opção</option><option>Site ou landing page</option><option>Sistema / SaaS</option><option>E-commerce</option><option>Automação</option><option>Branding</option><option>Marketing / performance</option><option>Outro</option></select></label>
        <label className="thx-lead-field"><span>Conte um pouco</span><textarea name="message" rows={4} placeholder="Objetivo, problema atual, prazo ou qualquer contexto que ajude." /></label>
        <label className="thx-lead-consent"><input name="consent" type="checkbox" required /><span>Autorizo a ThynkXP a usar estes dados para entrar em contato sobre este projeto. *</span></label>

        <button className="thx-lead-submit" disabled={status === 'sending'} type="submit">
          {status === 'sending' ? 'Enviando...' : 'Quero receber uma orientação'}
          <Icon name="arrow-up-right" size={17} />
        </button>

        {status === 'success' && <div className="thx-lead-feedback success"><Icon name="check-circle" size={17} /> Recebemos seus dados. Vamos usar o contexto enviado para dar continuidade ao atendimento.</div>}
        {status === 'error' && <div className="thx-lead-feedback error">{error}</div>}
        <small className="thx-lead-privacy">Ao enviar, você concorda com o contato relacionado a esta solicitação. <a href="/privacidade">Ver política de privacidade</a>.</small>
      </form>
    </div>
  );
}
