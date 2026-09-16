/**
 * Real HTTP + MongoDB integration checks. Intentionally refuses remote servers,
 * non-test databases, populated databases, or an app bound to another database.
 * See docs/testing-workspace.md. No external mail/prospect calls are made.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';

const base = new URL(process.env.WORKSPACE_TEST_URL || 'http://127.0.0.1:3100');
const uri = process.env.WORKSPACE_TEST_URI;
const databaseName = process.env.WORKSPACE_TEST_DB;
const email = process.env.WORKSPACE_TEST_ADMIN_EMAIL;
const password = process.env.WORKSPACE_TEST_ADMIN_PASSWORD;
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
assert(uri && databaseName && email && password, 'Set all WORKSPACE_TEST_URI, WORKSPACE_TEST_DB, WORKSPACE_TEST_ADMIN_EMAIL and WORKSPACE_TEST_ADMIN_PASSWORD variables.');
assert(base.protocol === 'http:' && localHosts.has(base.hostname), 'The test app must use local HTTP.');
assert(base.pathname === '/' && !base.search && !base.hash, 'Use a base URL without a path.');
const mongoUrl = new URL(uri);
assert(mongoUrl.protocol === 'mongodb:' && localHosts.has(mongoUrl.hostname), 'The test database must be a local MongoDB instance.');
assert(/^thynkxp_test_[a-z0-9_]+$/.test(databaseName), 'Database name must start with thynkxp_test_.');
assert(decodeURIComponent(mongoUrl.pathname.slice(1)) === databaseName, 'The MongoDB URI must explicitly name the same test database.');

const mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
const db = mongo.db(databaseName);
const runId = randomUUID();
const clientPassword = `Test-only-${randomUUID()}!`;
const streams = [];
let ownsDatabase = false;
let checks = 0;
function check(condition, description) {
  assert(condition, description);
  checks += 1;
  console.log(`ok ${checks} - ${description}`);
}

async function request(path, { method = 'GET', cookie = '', body, headers = {}, expected = 200 } = {}) {
  const response = await fetch(new URL(path, base), {
    method, redirect: 'error', signal: AbortSignal.timeout(45_000),
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error(`${method} ${path}: expected JSON, received status ${response.status}`); }
  const accepted = Array.isArray(expected) ? expected : [expected];
  assert(accepted.includes(response.status), `${method} ${path}: expected ${accepted.join('/')}, received ${response.status}: ${JSON.stringify(data)}`);
  return { response, data };
}
async function login(path, credentials) {
  const { response, data } = await request(path, { method: 'POST', body: credentials });
  assert.equal(data.ok, true);
  const cookies = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert(cookies, 'A successful login must set an authentication cookie.');
  return cookies;
}
async function openEvents(cookie) {
  const controller = new AbortController();
  const response = await fetch(new URL('/api/workspace/events?role=client', base), { headers: { Cookie: cookie }, signal: controller.signal });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/event-stream/);
  const events = [];
  const waiters = new Set();
  let finished = false;
  let failure;
  const reader = response.body.getReader();
  const readerTask = (async () => {
    let pending = '';
    const decoder = new TextDecoder();
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        pending += decoder.decode(chunk.value, { stream: true }).replace(/\r\n/g, '\n');
        let boundary;
        while ((boundary = pending.indexOf('\n\n')) >= 0) {
          const frame = pending.slice(0, boundary);
          pending = pending.slice(boundary + 2);
          let event = 'message';
          const lines = [];
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            if (line.startsWith('data:')) lines.push(line.slice(5).trimStart());
          }
          if (lines.length) {
            events.push({ event, data: JSON.parse(lines.join('\n')) });
            for (const notify of waiters) notify();
          }
        }
      }
    } catch (error) { if (!controller.signal.aborted) failure = error; }
    finally { finished = true; for (const notify of waiters) notify(); reader.releaseLock(); }
  })();
  const stream = {
    events,
    async next(event, predicate = () => true, from = 0, timeout = 12_000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => complete(new Error(`Timed out waiting for SSE ${event}`)), timeout);
        function complete(error, value) { clearTimeout(timer); waiters.delete(inspect); error ? reject(error) : resolve(value); }
        function inspect() {
          const result = events.slice(from).find(item => item.event === event && predicate(item.data));
          if (result) complete(null, result.data);
          else if (failure || finished) complete(failure || new Error(`SSE closed before ${event}`));
        }
        waiters.add(inspect);
        inspect();
      });
    },
    async close() { controller.abort(); await readerTask; },
  };
  streams.push(stream);
  return stream;
}

try {
  await mongo.connect();
  assert.equal((await db.listCollections({}, { nameOnly: true }).toArray()).length, 0, 'The test database must be completely empty; create a fresh isolated database.');
  await db.collection('_integration_run').insertOne({ _id: runId, createdAt: new Date() });
  ownsDatabase = true;

  // A sentinel read proves the HTTP server points to this exact disposable DB
  // before the first application mutation. Synthetic login alone cannot do so.
  const sentinel = await db.collection('clients').insertOne({ status: 'ativo', business: { tradeName: `Integration sentinel ${runId}` }, access: { portalEnabled: false }, createdAt: new Date(), updatedAt: new Date() });
  const admin = await login('/api/admin/login', { email, password });
  const visibleSentinel = await request('/api/admin/clients', { cookie: admin });
  assert(visibleSentinel.data.clients.some(row => row._id === sentinel.insertedId.toHexString()), 'REFUSING MUTATIONS: the app is not connected to the disposable database.');
  await db.collection('clients').deleteOne({ _id: sentinel.insertedId });
  check(true, 'HTTP server database identity matches the isolated MongoDB database');

  for (const path of ['/api/workspace/projects', '/api/workspace/tickets', '/api/workspace/domains', '/api/workspace/me', '/api/workspace/events']) {
    await request(path, { expected: 401 });
  }
  check(true, 'Workspace endpoints reject unauthenticated requests');

  const clients = [];
  for (const [index, name] of ['Alpha', 'Beta'].entries()) {
    const clientEmail = `workspace-${name.toLowerCase()}-${runId}@example.invalid`;
    const created = await request('/api/admin/clients', { method: 'POST', cookie: admin, expected: 201, body: {
      business: { cnpj: `9000000000000${index + 1}`, tradeName: `Fixture ${name}`, legalName: `Fixture ${name} Ltda`, email: clientEmail },
      access: { fullName: `${name} Test`, email: clientEmail, password: clientPassword },
      billing: { monthlyFee: 100 }, notes: `Private account note ${runId}`,
    } });
    assert(!JSON.stringify(created.data).includes('passwordHash'));
    const client = { id: created.data.client._id, email: clientEmail };
    assert(await db.collection('clients').findOne({ _id: new ObjectId(client.id) }));
    client.cookie = await login('/api/cliente/login', { email: clientEmail, password: clientPassword });
    clients.push(client);
  }
  const [a, b] = clients;
  check(true, 'Two client accounts persist in MongoDB and receive independent login sessions');
  const me = await request('/api/workspace/me', { cookie: a.cookie });
  assert(!JSON.stringify(me.data).includes('passwordHash'));
  assert(!JSON.stringify(me.data).includes('passwordSalt'));
  assert(!JSON.stringify(me.data).includes(`Private account note ${runId}`));
  check(true, 'Client profile excludes credentials and private account notes');

  const hostname = `ALPHA-${runId}.EXAMPLE.COM.`;
  const domainResult = await request('/api/workspace/domains', { method: 'POST', cookie: admin, expected: 201, body: { clientId: a.id, hostname, label: 'Portal Alpha', type: 'plataforma', status: 'ativo' } });
  const domain = domainResult.data.domain;
  assert.equal(domain.hostname, hostname.toLowerCase().slice(0, -1));
  assert.equal((await db.collection('client_domains').findOne({ _id: new ObjectId(domain._id) })).hostname, domain.hostname);
  await request('/api/workspace/domains', { method: 'POST', cookie: admin, expected: 409, body: { clientId: b.id, hostname: domain.hostname } });
  await request('/api/workspace/domains', { method: 'POST', cookie: admin, expected: 400, body: { clientId: a.id, hostname: 'javascript:alert(1)' } });
  await request('/api/workspace/domains', { method: 'POST', cookie: a.cookie, expected: [401, 403], body: { clientId: a.id, hostname: 'forged.example.com' } });
  assert.deepEqual((await request('/api/workspace/domains', { cookie: b.cookie })).data.domains, []);
  assert((await request('/api/workspace/domains', { cookie: a.cookie })).data.domains.some(row => row._id === domain._id));
  await request(`/api/workspace/domains?clientId=${a.id}`, { cookie: b.cookie, expected: 403 });
  check(true, 'Domain normalization, global uniqueness, safe schemes and tenant isolation hold');

  const projectResult = await request('/api/workspace/projects', { method: 'POST', cookie: admin, expected: 201, body: {
    clientId: a.id, name: 'Portal Alpha', description: 'Integration delivery', status: 'em_andamento',
    startAt: '2026-09-01', dueAt: '2026-10-01', milestones: [{ id: 'design', title: 'Design approved', done: false }, { id: 'release', title: 'Release approved', done: false }],
  } });
  const project = projectResult.data.project;
  assert.equal(project.progress, 0);
  const updatedProject = await request(`/api/workspace/projects/${project._id}`, { method: 'PATCH', cookie: admin, body: { updatedAt: project.updatedAt, milestones: project.milestones.map((row, index) => ({ ...row, done: index === 0 })) } });
  assert.equal(updatedProject.data.project.progress, 50);
  assert.equal((await db.collection('workspace_projects').findOne({ _id: new ObjectId(project._id) })).milestones[0].done, true);
  await request(`/api/workspace/projects/${project._id}`, { method: 'PATCH', cookie: admin, expected: 409, body: { updatedAt: project.updatedAt, name: 'Stale overwrite' } });
  const ownProjects = await request('/api/workspace/projects', { cookie: a.cookie });
  assert.equal(ownProjects.data.projects.find(row => row._id === project._id).progress, 50);
  assert.deepEqual((await request(`/api/workspace/projects?id=${project._id}&clientId=${a.id}`, { cookie: b.cookie })).data.projects, []);
  await request(`/api/workspace/projects/${project._id}`, { method: 'PATCH', cookie: a.cookie, expected: [401, 403], body: { updatedAt: updatedProject.data.project.updatedAt, status: 'concluido' } });
  await request('/api/workspace/projects', { method: 'POST', cookie: b.cookie, expected: [401, 403], body: { clientId: a.id, name: 'Forbidden' } });
  check(true, 'Project progress persists, stale updates conflict and client sessions cannot modify or read foreign projects');

  const ticketBody = { title: 'Change portal heading', description: 'Please update the portal heading.', category: 'alteracao', priority: 'normal', projectId: project._id, domainId: domain._id };
  const ticket = (await request('/api/workspace/tickets', { method: 'POST', cookie: a.cookie, expected: 201, body: ticketBody })).data.ticket;
  assert.equal(ticket.clientId, a.id);
  assert.match(ticket.number, /^THX-\d+$/);
  assert(await db.collection('workspace_tickets').findOne({ _id: new ObjectId(ticket._id), clientId: a.id }));
  await request('/api/workspace/tickets', { method: 'POST', cookie: a.cookie, expected: 403, body: { ...ticketBody, clientId: b.id } });
  await request('/api/workspace/tickets', { method: 'POST', cookie: b.cookie, expected: 400, body: ticketBody });
  await request('/api/workspace/tickets', { method: 'POST', cookie: a.cookie, expected: 403, body: { ...ticketBody, owner: 'Forged team member' } });
  assert.deepEqual((await request('/api/workspace/tickets', { cookie: b.cookie })).data.tickets, []);
  await request(`/api/workspace/tickets?clientId=${a.id}`, { cookie: b.cookie, expected: 403 });
  await request(`/api/workspace/tickets/${ticket._id}`, { cookie: b.cookie, expected: 404 });
  await request(`/api/workspace/tickets/${ticket._id}/messages`, { cookie: b.cookie, expected: 404 });
  await request(`/api/workspace/tickets/${ticket._id}/messages`, { method: 'POST', cookie: b.cookie, expected: 404, body: { body: 'Cross-tenant write attempt' } });
  await request(`/api/workspace/tickets/${ticket._id}`, { method: 'PATCH', cookie: a.cookie, expected: [401, 403], body: { status: 'resolvido' } });
  check(true, 'Ticket ownership is enforced for lists, detail, replies, references and forged client fields');

  const concurrentTickets = await Promise.all(Array.from({ length: 8 }, (_, index) => request('/api/workspace/tickets', { method: 'POST', cookie: a.cookie, expected: 201, body: { ...ticketBody, title: `Concurrent ticket ${index + 1}` } })));
  const concurrentRows = concurrentTickets.map(result => result.data.ticket);
  assert.equal(new Set(concurrentRows.map(row => row.number)).size, 8);
  assert.equal(new Set(concurrentRows.map(row => row._id)).size, 8);
  assert.equal(await db.collection('workspace_tickets').countDocuments({ _id: { $in: concurrentRows.map(row => new ObjectId(row._id)) } }), 8);
  check(true, 'Concurrent ticket creation persists every request with a unique ticket number');

  const messagesPath = `/api/workspace/tickets/${ticket._id}/messages`;
  await request(messagesPath, { method: 'POST', cookie: admin, expected: 201, body: { body: 'Public team response', internal: false } });
  await request(messagesPath, { method: 'POST', cookie: admin, expected: 201, body: { body: `Internal-only ${runId}`, internal: true } });
  const reply = (await request(messagesPath, { method: 'POST', cookie: a.cookie, expected: 201, body: { body: 'Client reply', authorRole: 'admin', authorName: 'Forged team member' } })).data.message;
  assert.equal(reply.authorRole, 'client');
  assert.notEqual(reply.authorName, 'Forged team member');
  await request(messagesPath, { method: 'POST', cookie: a.cookie, expected: 403, body: { body: 'Forged internal note', internal: true } });
  const clientMessages = (await request(messagesPath, { cookie: a.cookie })).data.messages;
  assert.equal(clientMessages.length, 2);
  assert(clientMessages.every(row => row.internal === false));
  assert(!JSON.stringify(clientMessages).includes(`Internal-only ${runId}`));
  assert.equal((await request(messagesPath, { cookie: admin })).data.messages.length, 3);
  assert.equal((await request(`/api/workspace/tickets/${ticket._id}`, { cookie: a.cookie })).data.ticket.messageCount, 2);
  assert.equal((await request(`/api/workspace/tickets/${ticket._id}`, { cookie: admin })).data.ticket.messageCount, 3);
  const firstPage = (await request(`${messagesPath}?limit=1`, { cookie: a.cookie })).data;
  assert.equal(firstPage.messages.length, 1);
  assert.equal(firstPage.hasMore, true);
  const secondPage = (await request(`${messagesPath}?limit=1&before=${firstPage.before}`, { cookie: a.cookie })).data;
  assert.equal(secondPage.messages.length, 1);
  assert.notEqual(firstPage.messages[0]._id, secondPage.messages[0]._id);
  check(true, 'Public conversation persists; internal notes and counts stay private; pagination and author identity are safe');

  const beforeTicketUpdate = (await request(`/api/workspace/tickets/${ticket._id}`, { cookie: admin })).data.ticket;
  await request(`/api/workspace/tickets/${ticket._id}`, { method: 'PATCH', cookie: admin, body: { updatedAt: beforeTicketUpdate.updatedAt, status: 'em_andamento', owner: 'Integration tester' } });
  await request(`/api/workspace/tickets/${ticket._id}`, { method: 'PATCH', cookie: admin, expected: 409, body: { updatedAt: beforeTicketUpdate.updatedAt, status: 'resolvido', owner: 'Stale overwrite' } });
  const savedTicket = await db.collection('workspace_tickets').findOne({ _id: new ObjectId(ticket._id) });
  assert.equal(savedTicket.status, 'em_andamento');
  assert.equal(savedTicket.owner, 'Integration tester');
  check(true, 'Ticket update conflicts preserve the first saved status and assignee');

  const betaTicket = (await request('/api/workspace/tickets', { method: 'POST', cookie: b.cookie, expected: 201, body: { title: 'Private Beta request', description: 'Visible only to Beta and admin.' } })).data.ticket;
  const mixedCookies = `${admin}; ${a.cookie}`;
  const mixedProfile = await request('/api/workspace/me', { cookie: mixedCookies });
  assert.equal(mixedProfile.data.client._id, a.id);
  const mixedTickets = await request('/api/workspace/tickets', { cookie: mixedCookies, headers: { 'x-workspace-role': 'client' } });
  assert(mixedTickets.data.tickets.every(row => row.clientId === a.id));
  assert(!mixedTickets.data.tickets.some(row => row._id === betaTicket._id));
  await request('/api/workspace/tickets', { cookie: a.cookie, headers: { 'x-workspace-role': 'admin' }, expected: 401 });
  check(true, 'Explicit portal role keeps concurrent admin/client cookies isolated and cannot elevate a client session');

  const beforeClose = (await request(`/api/workspace/tickets/${ticket._id}`, { cookie: admin })).data.ticket;
  await request(`/api/workspace/tickets/${ticket._id}`, { method: 'PATCH', cookie: admin, body: { updatedAt: beforeClose.updatedAt, status: 'fechado' } });
  const countBeforeClosedReply = await db.collection('workspace_ticket_messages').countDocuments({ ticketId: ticket._id });
  await request(messagesPath, { method: 'POST', cookie: a.cookie, expected: 409, body: { body: 'Attempt to reply to closed ticket' } });
  assert.equal(await db.collection('workspace_ticket_messages').countDocuments({ ticketId: ticket._id }), countBeforeClosedReply);
  check(true, 'A closed ticket rejects a client reply without inserting a message');

  await request('/api/workspace/tickets', { method: 'POST', cookie: a.cookie, headers: { Origin: 'https://other.example.invalid' }, expected: 403, body: ticketBody });
  await request('/api/workspace/tickets', { method: 'POST', cookie: a.cookie, headers: { 'Sec-Fetch-Site': 'cross-site' }, expected: 403, body: ticketBody });
  await request('/api/workspace/tickets', { method: 'POST', cookie: a.cookie, expected: 413, body: { ...ticketBody, description: 'x'.repeat(41_000) } });
  await request('/api/workspace/tickets?limit=100000', { cookie: a.cookie, expected: 400 });
  check(true, 'Cross-site writes, oversized bodies and excessive pagination are rejected');

  const beforePasswordReset = (await request(`/api/admin/clients/${b.id}`, { cookie: admin })).data.client;
  const oldPasswordHash = (await db.collection('clients').findOne({ _id: new ObjectId(b.id) })).access.passwordHash;
  const newClientPassword = `Rotated-test-${randomUUID()}!`;
  const resetResult = await request(`/api/admin/clients/${b.id}`, { method: 'PATCH', cookie: admin, body: { expectedUpdatedAt: beforePasswordReset.updatedAt, access: { password: newClientPassword } } });
  assert(!JSON.stringify(resetResult.data).includes(newClientPassword));
  assert(!JSON.stringify(resetResult.data).includes('passwordHash'));
  assert.notEqual((await db.collection('clients').findOne({ _id: new ObjectId(b.id) })).access.passwordHash, oldPasswordHash);
  await request('/api/workspace/me', { cookie: b.cookie, expected: 401 });
  await request('/api/cliente/login', { method: 'POST', expected: 401, body: { email: b.email, password: clientPassword } });
  b.cookie = await login('/api/cliente/login', { email: b.email, password: newClientPassword });
  await request('/api/workspace/me', { cookie: b.cookie });
  await request('/api/workspace/me', { cookie: a.cookie });
  check(true, 'Password rotation changes the hash, revokes previous sessions and admits only the new password');

  const stream = await openEvents(a.cookie);
  await stream.next('ready');
  const from = stream.events.length;
  await request(messagesPath, { method: 'POST', cookie: admin, expected: 201, body: { body: 'A real-time public update' } });
  const event = await stream.next('workspace', data => data.kind === 'tickets', from);
  assert(!JSON.stringify(event).includes(`Internal-only ${runId}`));
  check(true, 'Authenticated SSE emits ready and notices a persisted conversation update');
  const beforeDisable = (await request(`/api/admin/clients/${a.id}`, { cookie: admin })).data.client;
  await request(`/api/admin/clients/${a.id}`, { method: 'PATCH', cookie: admin, body: { expectedUpdatedAt: beforeDisable.updatedAt, access: { portalEnabled: false } } });
  await request(`/api/admin/clients/${a.id}`, { method: 'PATCH', cookie: admin, expected: 409, body: { expectedUpdatedAt: beforeDisable.updatedAt, access: { portalEnabled: true } } });
  for (const path of ['/api/workspace/me', '/api/workspace/tickets', '/api/workspace/projects', '/api/workspace/domains', '/api/cliente/session']) {
    await request(path, { cookie: a.cookie, expected: 401 });
  }
  await stream.next('auth', data => data.error === 'unauthorized');
  await request('/api/cliente/login', { method: 'POST', expected: 401, body: { email: a.email, password: clientPassword } });
  assert.equal((await request('/api/workspace/me', { cookie: b.cookie })).response.status, 200);
  check(true, 'Disabling access revokes existing HTTP and SSE sessions without affecting another tenant');

  console.log(`\nPASS: ${checks} integration groups completed using synthetic data.`);
} finally {
  await Promise.allSettled(streams.map(stream => stream.close()));
  if (ownsDatabase) {
    const marker = await db.collection('_integration_run').findOne({ _id: runId });
    assert(marker, 'Refusing cleanup: isolated database ownership marker is missing.');
    await db.dropDatabase();
    console.log('Removed the isolated test database.');
  }
  await mongo.close();
}
