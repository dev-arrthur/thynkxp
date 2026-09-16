import { randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import { ApiError, text } from './workspace';

const indexes = new WeakMap<Db, Promise<void>>();
export async function projectCollection(db: Db) {
  const collection = db.collection('workspace_projects');
  let ready = indexes.get(db);
  if (!ready) {
    ready = collection.createIndexes([
      { key: { clientId: 1, archivedAt: 1, updatedAt: -1, _id: -1 }, name: 'projects_client_recent' },
      { key: { archivedAt: 1, status: 1, updatedAt: -1, _id: -1 }, name: 'projects_stage_recent' },
      { key: { archivedAt: 1, updatedAt: -1, _id: -1 }, name: 'projects_recent' },
    ]).then(() => undefined).catch(error => { indexes.delete(db); throw error; });
    indexes.set(db, ready);
  }
  await ready;
  return collection;
}

export const PROJECT_STATUSES = ['planejamento', 'em_andamento', 'em_revisao', 'concluido', 'pausado'] as const;
export const PROJECT_PRIORITIES = ['baixa', 'normal', 'alta'] as const;
export type ProjectStatus = typeof PROJECT_STATUSES[number];
export type ProjectMilestone = { id: string; title: string; done: boolean; dueAt: Date | null };

export function projectDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T00:00:00(?:\.000)?Z)?$/.test(value)) throw new ApiError(400, 'invalid_project_date');
  const day = value.slice(0, 10);
  const date = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) throw new ApiError(400, 'invalid_project_date');
  return date;
}

export function projectMilestones(value: unknown): ProjectMilestone[] {
  if (!Array.isArray(value) || value.length > 60) throw new ApiError(400, 'invalid_project_milestones');
  const ids = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ApiError(400, 'invalid_project_milestones');
    const row = item as Record<string, unknown>;
    const id = text(row.id, 80) || randomUUID();
    const title = text(row.title, 220);
    if (!title || typeof row.done !== 'boolean' || !/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) throw new ApiError(400, 'invalid_project_milestones');
    ids.add(id);
    return { id, title, done: row.done, dueAt: projectDate(row.dueAt) };
  });
}

export function projectFields(body: Record<string, unknown>) {
  const name = text(body.name, 160);
  if (!name) throw new ApiError(400, 'project_name_required');
  const status = body.status ?? 'planejamento';
  const priority = body.priority ?? 'normal';
  if (!PROJECT_STATUSES.includes(status as ProjectStatus)) throw new ApiError(400, 'invalid_project_status');
  if (!PROJECT_PRIORITIES.includes(priority as typeof PROJECT_PRIORITIES[number])) throw new ApiError(400, 'invalid_project_priority');
  const startAt = projectDate(body.startAt);
  const dueAt = projectDate(body.dueAt);
  if (startAt && dueAt && dueAt < startAt) throw new ApiError(400, 'project_dates_reversed');
  return {
    name, description: text(body.description, 6000), status: status as ProjectStatus,
    priority: priority as typeof PROJECT_PRIORITIES[number], owner: text(body.owner, 160), startAt, dueAt,
    milestones: projectMilestones(body.milestones ?? []),
  };
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : null;
}

// An explicit allowlist keeps internal audit fields out of the client portal.
export function publicProject(row: Record<string, unknown>) {
  const milestones = Array.isArray(row.milestones) ? row.milestones.map((item) => {
    const milestone = item as Record<string, unknown>;
    return { id: String(milestone.id || ''), title: text(milestone.title, 220), done: milestone.done === true, dueAt: iso(milestone.dueAt) };
  }) : [];
  const completed = milestones.filter((item) => item.done).length;
  return {
    _id: String(row._id), clientId: text(row.clientId, 24), clientName: text(row.clientName, 220),
    name: text(row.name, 160), description: text(row.description, 6000), status: text(row.status, 40),
    priority: text(row.priority, 20), owner: text(row.owner, 160), startAt: iso(row.startAt), dueAt: iso(row.dueAt),
    milestones, progress: milestones.length ? Math.round(completed / milestones.length * 100) : (row.status === 'concluido' ? 100 : 0),
    createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt), archivedAt: iso(row.archivedAt),
  };
}
