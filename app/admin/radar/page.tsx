'use client';

import { useEffect, useState } from 'react';
import AdminProspector from '../../../components/AdminProspector';
import Icon from '../../../components/Icon';

const LOGO = '/brand/thynkxp-logo.png';

export default function LeadRadarPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          window.location.href = '/admin/login';
          return;
        }
        if (active) setReady(true);
      })
      .catch(() => {
        window.location.href = '/admin/login';
      });
    return () => { active = false; };
  }, []);

  if (!ready) {
    return <main className="admin-loading"><div className="admin-loader" /><img src={LOGO} alt="ThynkXP" /><p>Preparando o Radar de Leads</p></main>;
  }

  return (
    <main className="admin-radar-page">
      <header className="admin-radar-header">
        <a className="admin-radar-brand" href="/admin"><img src={LOGO} alt="ThynkXP" /></a>
        <div className="admin-radar-breadcrumb"><span>Administração</span><Icon name="chevron-right" size={14} /><strong>Radar de Leads</strong></div>
        <a className="admin-radar-back" href="/admin"><Icon name="arrow-right" size={15} /> Voltar ao painel</a>
      </header>

      <div className="admin-radar-shell">
        <section className="admin-radar-title">
          <div><span>THYNKXP / INTELIGÊNCIA COMERCIAL</span><h1>Radar de Leads</h1><p>Descubra empresas por nicho e região, priorize as melhores oportunidades e leve os contatos qualificados para o CRM.</p></div>
          <div className="admin-radar-badge"><Icon name="sparkles" /><span><strong>Score automático</strong><small>0–100 por potencial comercial</small></span></div>
        </section>
        <AdminProspector />
      </div>
    </main>
  );
}
