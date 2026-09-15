'use client';

import { DragEvent, useState } from 'react';
import Icon from './Icon';

export type LeadStage = 'novo' | 'qualificado' | 'em_contato' | 'proposta' | 'negociacao' | 'cliente' | 'ativo' | 'pausado' | 'perdido';

export type KanbanLead = {
  _id: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: string;
  interest?: string;
  estimatedValue?: number;
  nextActionAt?: string | null;
  qualificationScore?: number;
  website?: string;
  instagram?: string;
  cnpj?: string;
  notes?: string;
  updatedAt?: string;
};

type KanbanColumn = {
  key: LeadStage;
  label: string;
  description: string;
  accepts?: LeadStage[];
};

const COLUMNS: KanbanColumn[] = [
  { key: 'novo', label: 'Novos', description: 'Ainda sem abordagem' },
  { key: 'qualificado', label: 'Qualificados', description: 'Bom perfil comercial' },
  { key: 'em_contato', label: 'Em contato', description: 'Abordagem iniciada' },
  { key: 'proposta', label: 'Proposta', description: 'Oferta apresentada' },
  { key: 'negociacao', label: 'Negociação', description: 'Em decisão' },
  { key: 'cliente', label: 'Convertidos', description: 'Virou cliente', accepts: ['cliente', 'ativo'] },
  { key: 'perdido', label: 'Não converteu', description: 'Oportunidade encerrada' },
];

function normalizeStage(value?: string): LeadStage {
  const normalized = (value || 'novo').trim().toLowerCase().replaceAll(' ', '_');
  if (normalized === 'contato') return 'em_contato';
  if (normalized === 'convertido') return 'cliente';
  if (['novo', 'qualificado', 'em_contato', 'proposta', 'negociacao', 'cliente', 'ativo', 'pausado', 'perdido'].includes(normalized)) return normalized as LeadStage;
  return 'novo';
}

function displayStage(value?: string) {
  const stage = normalizeStage(value);
  if (stage === 'ativo') return 'cliente';
  if (stage === 'pausado') return 'negociacao';
  return stage;
}

function title(lead: KanbanLead) {
  return lead.company || lead.name || lead.email || 'Lead sem nome';
}

function formatCurrency(value?: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatDate(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(parsed);
}

export default function LeadKanban({
  leads,
  onOpen,
  onMoved,
}: {
  leads: KanbanLead[];
  onOpen: (lead: KanbanLead) => void;
  onMoved: (id: string, status: LeadStage) => void;
}) {
  const [moving, setMoving] = useState('');
  const [dragged, setDragged] = useState('');
  const [overColumn, setOverColumn] = useState<LeadStage | ''>('');

  async function moveLead(id: string, status: LeadStage) {
    const current = leads.find((lead) => String(lead._id) === id);
    if (!current || normalizeStage(current.status) === status || (status === 'cliente' && normalizeStage(current.status) === 'ativo')) return;
    setMoving(id);
    try {
      const response = await fetch('/api/leads/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      if (!response.ok) throw new Error('status_update_failed');
      onMoved(id, status);
    } finally {
      setMoving('');
      setDragged('');
      setOverColumn('');
    }
  }

  function onDragStart(event: DragEvent<HTMLElement>, lead: KanbanLead) {
    const id = String(lead._id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDragged(id);
  }

  function onDrop(event: DragEvent<HTMLElement>, status: LeadStage) {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || dragged;
    if (id) void moveLead(id, status);
  }

  return (
    <div className="lead-kanban-board" aria-label="Kanban comercial de leads">
      {COLUMNS.map((column) => {
        const accepted = column.accepts || [column.key];
        const rows = leads.filter((lead) => accepted.includes(displayStage(lead.status) as LeadStage));
        const value = rows.reduce((sum, lead) => sum + (Number(lead.estimatedValue) || 0), 0);
        return (
          <section
            className={`lead-kanban-column status-${column.key} ${overColumn === column.key ? 'is-drop-target' : ''}`}
            key={column.key}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOverColumn(column.key); }}
            onDragLeave={() => setOverColumn('')}
            onDrop={(event) => onDrop(event, column.key)}
          >
            <header>
              <div><span className="lead-kanban-dot" /><strong>{column.label}</strong><b>{rows.length}</b></div>
              <p>{column.description}</p>
              {value > 0 && <small>{formatCurrency(value)} em potencial</small>}
            </header>

            <div className="lead-kanban-stack">
              {rows.length ? rows.map((lead) => {
                const score = Math.round(Number(lead.qualificationScore) || 0);
                const due = lead.nextActionAt ? new Date(lead.nextActionAt).getTime() < Date.now() : false;
                return (
                  <article
                    className={`lead-kanban-card ${dragged === String(lead._id) ? 'is-dragging' : ''} ${moving === String(lead._id) ? 'is-moving' : ''}`}
                    key={String(lead._id)}
                    draggable={!moving}
                    onDragStart={(event) => onDragStart(event, lead)}
                    onDragEnd={() => { setDragged(''); setOverColumn(''); }}
                  >
                    <div className="lead-kanban-card-top">
                      <button type="button" onClick={() => onOpen(lead)}>
                        <span className="lead-kanban-avatar">{title(lead).slice(0, 2).toUpperCase()}</span>
                        <span><strong>{title(lead)}</strong><small>{lead.interest || lead.source || 'Sem contexto comercial'}</small></span>
                      </button>
                      {score > 0 && <em className={score >= 72 ? 'is-hot' : score >= 52 ? 'is-warm' : ''}>{score}</em>}
                    </div>

                    <div className="lead-kanban-signals">
                      {lead.phone && <span title="Telefone disponível"><Icon name="phone" size={13} /></span>}
                      {lead.email && <span title="E-mail disponível"><Icon name="mail" size={13} /></span>}
                      {lead.website && <a href={lead.website} target="_blank" rel="noreferrer" title="Abrir site"><Icon name="globe" size={13} /></a>}
                      {lead.instagram && <a href={lead.instagram} target="_blank" rel="noreferrer" title="Abrir Instagram"><Icon name="instagram" size={13} /></a>}
                      {lead.cnpj && <span className="lead-kanban-cnpj">CNPJ {lead.cnpj}</span>}
                    </div>

                    <div className="lead-kanban-card-foot">
                      <span className={due ? 'is-overdue' : ''}>{lead.nextActionAt ? <><Icon name={due ? 'bell' : 'calendar'} size={12} /> {formatDate(lead.nextActionAt)}</> : 'Sem próxima ação'}</span>
                      {Number(lead.estimatedValue) > 0 && <strong>{formatCurrency(lead.estimatedValue)}</strong>}
                    </div>

                    <label className="lead-kanban-mobile-stage">
                      <span>Etapa</span>
                      <select value={displayStage(lead.status)} disabled={moving === String(lead._id)} onChange={(event) => void moveLead(String(lead._id), event.target.value as LeadStage)}>
                        {COLUMNS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                      </select>
                    </label>
                  </article>
                );
              }) : <div className="lead-kanban-empty"><Icon name="plus" size={14} /><span>Arraste um lead para cá</span></div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
