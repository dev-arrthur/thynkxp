'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/Icon';

type Lead = { status?: string; leadType?: string; anonymous?: boolean };

type Achievement = { title: string; description: string; goal: number; current: number };

function normalized(value?: string) {
  const status = (value || 'novo').toLowerCase().replaceAll(' ', '_');
  if (status === 'convertido') return 'cliente';
  if (status === 'contato') return 'em_contato';
  return status;
}

export default function AdminAchievementsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetch('/api/leads', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : { leads: [] })
      .then((data) => setLeads(Array.isArray(data.leads) ? data.leads.filter((lead: Lead) => !lead.anonymous) : []))
      .catch(() => setLeads([]));
  }, []);

  const achievements = useMemo<Achievement[]>(() => {
    const prospected = leads.filter((lead) => lead.leadType === 'prospected').length;
    const moved = leads.filter((lead) => !['novo'].includes(normalized(lead.status))).length;
    const clients = leads.filter((lead) => ['cliente', 'ativo'].includes(normalized(lead.status))).length;
    return [
      { title: 'Primeiro lead', description: 'Adicionar a primeira oportunidade ao CRM.', goal: 1, current: leads.length },
      { title: 'Radar em ação', description: 'Enviar um lead prospectado pelo Radar para o Kanban.', goal: 1, current: prospected },
      { title: 'Funil em movimento', description: 'Avançar oportunidades para além da etapa Novo.', goal: 5, current: moved },
      { title: 'Primeira conversão', description: 'Transformar a primeira oportunidade em cliente.', goal: 1, current: clients },
      { title: 'Base comercial 10+', description: 'Construir uma base com pelo menos 10 leads.', goal: 10, current: leads.length },
      { title: 'Base comercial 50+', description: 'Alcançar 50 oportunidades identificadas.', goal: 50, current: leads.length },
    ];
  }, [leads]);

  const unlocked = achievements.filter((item) => item.current >= item.goal).length;

  return (
    <main className="admin-v4-section-page">
      <section className="admin-v4-page-heading">
        <div><span>THYNKXP / CONTA</span><h1>Minhas Conquistas</h1><p>Marcos automáticos que acompanham a evolução da sua operação comercial dentro da plataforma.</p></div>
      </section>

      <section className="admin-v4-kpis">
        <article><span>Conquistas liberadas</span><strong>{unlocked}</strong><small>de {achievements.length} marcos atuais</small></article>
        <article><span>Leads no CRM</span><strong>{leads.length}</strong><small>base identificada</small></article>
        <article><span>Progresso geral</span><strong>{Math.round((unlocked / achievements.length) * 100)}%</strong><small>dos marcos concluídos</small></article>
        <article><span>Próximo nível</span><strong><Icon name="sparkles" size={27} /></strong><small>continue movimentando o funil</small></article>
      </section>

      <section className="admin-v4-achievements">
        {achievements.map((item) => {
          const complete = item.current >= item.goal;
          const progress = Math.min(100, Math.round((item.current / item.goal) * 100));
          return <article key={item.title} className={`admin-v4-achievement ${complete ? 'is-unlocked' : ''}`}>
            <span><Icon name={complete ? 'check-circle' : 'sparkles'} size={18} /></span>
            <h3>{item.title}</h3><p>{item.description}</p>
            <progress max={100} value={progress} />
            <small>{complete ? 'Conquista desbloqueada' : `${Math.min(item.current, item.goal)} de ${item.goal}`}</small>
          </article>;
        })}
      </section>
    </main>
  );
}
