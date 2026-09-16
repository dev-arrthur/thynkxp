/* Run with: node --test tools/project-validation.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { transformSync } = require('next/dist/build/swc');

// Load the application TypeScript directly without building or connecting a database.
require.extensions['.ts'] = function loadTypeScript(module, filename) {
  const source = transformSync(fs.readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'typescript' }, target: 'es2020' }, module: { type: 'commonjs' } });
  module._compile(source.code, filename);
};
const { projectDate, projectMilestones, projectFields, publicProject } = require('../lib/workspace-projects.ts');
const { ApiError } = require('../lib/workspace.ts');
const invalid = code => error => error instanceof ApiError && error.status === 400 && error.message === code;

test('date-only fields reject rollovers and ambiguous timestamps', () => {
  assert.equal(projectDate('2028-02-29').toISOString(), '2028-02-29T00:00:00.000Z');
  assert.equal(projectDate(null), null);
  for (const value of ['2026-02-29', '2026-02-31', '2026-13-01', '01/02/2026', '2026-09-16T15:00:00Z', 123, {}]) {
    assert.throws(() => projectDate(value), invalid('invalid_project_date'));
  }
  assert.throws(() => projectFields({ name: 'Projeto', startAt: '2026-09-20', dueAt: '2026-09-19' }), invalid('project_dates_reversed'));
});

test('milestone writes are bounded, typed, and uniquely addressable', () => {
  const first = { id: 'one', title: 'Briefing', done: false };
  assert.throws(() => projectMilestones([first, first]), invalid('invalid_project_milestones'));
  assert.throws(() => projectMilestones(Array.from({ length: 61 }, (_, index) => ({ ...first, id: String(index) }))), invalid('invalid_project_milestones'));
  assert.throws(() => projectMilestones([{ ...first, done: 'false' }]), invalid('invalid_project_milestones'));
  assert.throws(() => projectMilestones([{ ...first, title: '' }]), invalid('invalid_project_milestones'));
  assert.throws(() => projectMilestones([{ ...first, id: '$set' }]), invalid('invalid_project_milestones'));
  const rows = projectMilestones([{ title: 'Etapa 1', done: false }, { title: 'Etapa 2', done: true }]);
  assert.notEqual(rows[0].id, rows[1].id);
});

test('project writes allow known stages and discard untrusted fields', () => {
  assert.throws(() => projectFields({ name: 'Projeto', status: { $ne: 'concluido' } }), invalid('invalid_project_status'));
  assert.throws(() => projectFields({ name: 'Projeto', priority: 'admin' }), invalid('invalid_project_priority'));
  assert.throws(() => projectFields({ name: '  ' }), invalid('project_name_required'));
  const fields = projectFields({ name: ' Projeto ', createdBy: 'forged', archivedAt: new Date(), clientId: 'forged' });
  assert.equal(fields.name, 'Projeto');
  assert.equal(fields.status, 'planejamento');
  assert.equal(fields.createdBy, undefined);
  assert.equal(fields.clientId, undefined);
});

test('client projection returns derived progress and excludes private audit fields', () => {
  const row = publicProject({ _id: 'project', name: 'Projeto', status: 'em_andamento', createdBy: 'private@example.com', internalNotes: 'private', passwordHash: 'secret', milestones: [{ id: 'a', title: 'One', done: true }, { id: 'b', title: 'Two', done: false }] });
  assert.equal(row.progress, 50);
  for (const key of ['createdBy', 'internalNotes', 'passwordHash', 'updatedBy']) assert.equal(Object.hasOwn(row, key), false);
  assert.equal(publicProject({ _id: 'p', status: 'concluido', milestones: [] }).progress, 100);
});
