import { apiError, getWorkspaceDb, json, requireAdmin } from '../../../../lib/workspace';

export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const db = await getWorkspaceDb();
    const now = new Date();
    const activeTickets = { status: { $nin: ['resolvido', 'fechado'] } };
    const activeProjects = { archivedAt: null, status: { $nin: ['concluido', 'pausado'] } };
    const activeLeads = { anonymous: { $ne: true }, status: { $nin: ['cliente', 'ativo', 'perdido', 'pausado'] } };
    const options = { maxTimeMS: 5000 };
    const [clients, projects, tickets, domains, leads, recentTickets, deadlines, followups, pipeline] = await Promise.all([
      db.collection('clients').aggregate([
        { $match: { status: { $nin: ['arquivado', 'inativo'] } } },
        { $group: { _id: null, total: { $sum: 1 }, monthly: { $sum: { $cond: [{ $eq: ['$status', 'ativo'] }, { $convert: { input: '$billing.monthlyFee', to: 'double', onError: 0, onNull: 0 } }, 0] } } } },
      ], options).toArray(),
      db.collection('workspace_projects').countDocuments(activeProjects, options),
      db.collection('workspace_tickets').aggregate([
        { $match: activeTickets },
        { $group: { _id: null, total: { $sum: 1 }, urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgente'] }, 1, 0] } }, overdue: { $sum: { $cond: [{ $and: [{ $eq: [{ $type: '$dueAt' }, 'date'] }, { $lt: ['$dueAt', now] }] }, 1, 0] } } } },
      ], options).toArray(),
      db.collection('client_domains').countDocuments({}, options),
      db.collection('leads').countDocuments(activeLeads, options),
      db.collection('workspace_tickets').find(activeTickets, { ...options, projection: { number: 1, title: 1, clientName: 1, status: 1, priority: 1, updatedAt: 1, dueAt: 1 } }).sort({ updatedAt: -1 }).limit(5).toArray(),
      db.collection('workspace_projects').find({ ...activeProjects, dueAt: { $type: 'date' } }, { ...options, projection: { name: 1, clientName: 1, status: 1, dueAt: 1, milestones: 1 } }).sort({ dueAt: 1 }).limit(5).toArray(),
      db.collection('leads').find({ ...activeLeads, nextActionAt: { $type: 'date' } }, { ...options, projection: { name: 1, company: 1, nextActionAt: 1, owner: 1, interest: 1 } }).sort({ nextActionAt: 1 }).limit(5).toArray(),
      db.collection('leads').aggregate([
        { $match: { anonymous: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: { $convert: { input: '$estimatedValue', to: 'double', onError: 0, onNull: 0 } } } } },
      ], options).toArray(),
    ]);
    return json({
      metrics: { clients: clients[0]?.total || 0, monthly: clients[0]?.monthly || 0, projects, tickets: tickets[0]?.total || 0, urgent: tickets[0]?.urgent || 0, overdue: tickets[0]?.overdue || 0, domains, leads },
      tickets: recentTickets,
      projects: deadlines.map(project => ({ ...project, progress: Array.isArray(project.milestones) && project.milestones.length ? Math.round(project.milestones.filter((item: { done?: boolean }) => item.done).length / project.milestones.length * 100) : project.status === 'concluido' ? 100 : 0, milestones: undefined })),
      followups, pipeline, updatedAt: now,
    });
  } catch (error) { return apiError(error); }
}
