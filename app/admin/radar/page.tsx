'use client';

import { useEffect, useState } from 'react';
import AdminProspectorGeo from '../../../components/AdminProspectorGeo';
import Icon from '../../../components/Icon';

export default function LeadRadarPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) { window.location.href = '/admin/login'; return; }
        if (active) setReady(true);
      })
      .catch(() => { window.location.href = '/admin/login'; });
    return () => { active = false; };
  }, []);

  if (!ready) return <main className="admin-loading"><div className="admin-loader" /><p>Preparando o Radar de Leads</p></main>;

  return <main className="admin-radar-page geo-radar-page">
    <div className="admin-radar-shell">
      <section className="admin-radar-title">
        <div><span>THYNKXP / INTELIGÊNCIA COMERCIAL</span><h1>Radar de Leads</h1><p>Mapeie empresas por estado, cidade, raio e nicho. Cruze CNPJ, presença digital e negócios locais antes de enviar as melhores oportunidades ao funil.</p></div>
        <div className="admin-radar-badge"><Icon name="location" /><span><strong>Busca geográfica</strong><small>Município + raio local + score</small></span></div>
      </section>
      <AdminProspectorGeo />
    </div>
  </main>;
}
