'use client';

import { useEffect, useState } from 'react';

type Lead = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status?: string;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

export default function Admin() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const session = await fetch('/api/admin/session', { cache: 'no-store' });
        if (!session.ok) {
          window.location.href = '/admin/login';
          return;
        }

        const response = await fetch('/api/leads', { cache: 'no-store' });
        if (response.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        if (!response.ok) throw new Error('leads_unavailable');

        const data = await response.json();
        setLeads(data.leads || []);
      } catch {
        setError('Não foi possível carregar os leads agora. Verifique a conexão com o MongoDB.');
      } finally {
        setReady(true);
      }
    }

    load();
  }, []);

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    window.location.href = '/admin/login';
  }

  if (!ready) {
    return (
      <main className="login">
        <p>Carregando CRM…</p>
      </main>
    );
  }

  return (
    <main className="portal">
      <header>
        <span className="brand">thynk<span>XP</span></span>
        <div>
          <a href="/">Site</a> · <button onClick={logout}>Sair</button>
        </div>
      </header>

      <section className="hero">
        <div>
          <small>ADMIN • CRM</small>
          <h1>Leads que viram oportunidades.</h1>
          <p>Seu pipeline comercial em um só lugar.</p>
        </div>
        <div className="metric">
          <strong>{leads.length}</strong>
          <span>leads registrados</span>
        </div>
      </section>

      <nav className="tabs">
        <b>Todos · {leads.length}</b>
        <span>Novos</span>
        <span>Qualificados</span>
        <span>Em contato</span>
        <span>Convertidos</span>
      </nav>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <section className="lead-table">
        <div className="table-head">
          <b>Lead</b>
          <b>Empresa</b>
          <b>Telefone</b>
          <b>Origem</b>
          <b>Status</b>
          <b>Cadastro</b>
        </div>

        {leads.length ? (
          leads.map((lead) => (
            <div className="lead-row" key={String(lead._id)}>
              <div className="lead-contact">
                <strong>{lead.name || 'Sem nome'}</strong>
                {lead.email ? <a href={`mailto:${lead.email}`}>{lead.email}</a> : <span>Sem e-mail</span>}
              </div>
              <span>{lead.company || '—'}</span>
              <span>{lead.phone || '—'}</span>
              <span>{lead.source || 'Direto'}</span>
              <em>{lead.status || 'novo'}</em>
              <span>{formatDate(lead.createdAt)}</span>
            </div>
          ))
        ) : (
          <div className="empty">
            <div>✦</div>
            <h2>Seu pipeline começa aqui.</h2>
            <p>Os leads enviados pelo site aparecerão automaticamente aqui.</p>
          </div>
        )}
      </section>
    </main>
  );
}
