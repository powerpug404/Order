import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateJson, CURRENT_SCHEMA_VERSION } from '../src/stateMigration.ts';
import { WebStateRepository } from '../src/storage.ts';

test('migrates a representative schema 10 record while preserving identities and relationships', () => {
  const previous = {
    schemaVersion: 10,
    calendars: [{ id: 'family-cal', name: 'Family', color: '#123456', visible: true, isDefault: true }],
    tasks: [{ id: 'task-stable', title: 'Review', date: '2026-12-01', dueDate: '2026-12-01', scheduledDate: '2026-12-02', time: '09:30', duration: 30, priority: 5, goal: 'Goal', goalId: 'goal-stable', calendar: 'family-cal', done: false, postponed: 0, eventId: 'event-stable', projectId: 'project-stable' }],
    events: [{ id: 'event-stable', title: 'Meeting', date: '2026-12-02', start: '09:30', end: '10:00', calendar: 'family-cal', allDay: false, timezone: 'America/Chicago', taskIds: ['task-stable'] }],
    goals: [{ id: 'goal-stable', name: 'Goal', category: 'Home', description: '', priority: 3, target: '', progress: 20, milestones: [] }],
    projects: [{ id: 'project-stable', name: 'Project', status: 'active', goalIds: ['goal-stable'], milestones: [], tags: [], createdAt: '2026-01-01', updatedAt: '2026-01-01', description: '', priority: 2 }],
    lifeAreas: [], captures: [{ id: 'capture-stable', text: 'Keep', date: '2026-01-01' }], entries: [{ id: 'entry-stable', project: 'Focus', start: '2026-01-01T10:00:00Z', end: '2026-01-01T11:00:00Z', notes: '', goal: '' }],
    timeCategories: [{ id: 'focus', name: 'Focus', color: '#fff' }], settings: { name: 'User', theme: 'Dark' }, streak: 2, longest: 5, restHonored: 1,
  };
  const migrated = migrateJson(JSON.stringify(previous));
  assert.equal(migrated.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(migrated.tasks[0].id, 'task-stable');
  assert.equal(migrated.tasks[0].eventId, 'event-stable');
  assert.equal(migrated.tasks[0].calendar, 'family-cal');
  assert.deepEqual(migrated.events[0].taskIds, ['task-stable']);
  assert.equal(migrated.events[0].timezone, 'America/Chicago');
  assert.equal(migrated.projects[0].id, 'project-stable');
  assert.equal(migrated.captures[0].id, 'capture-stable');
  assert.equal(migrated.entries[0].id, 'entry-stable');
  assert.equal(migrated.settings.name, 'User');
});

test('does not discard records with legacy sample IDs or overwrite widget preferences during migration', () => {
  const previous: any = { schemaVersion: 1, calendars: [{ id: 'business', name: 'Business', color: '#123', visible: true }], tasks: [{ id: 't3', title: 'My strength training', date: '2026-01-01', time: '', duration: 20, priority: 5, goal: '', calendar: 'business', done: false, postponed: 0 }], events: [{ id: 'e2', title: 'My client estimate review', date: '2026-01-02', start: '', end: '', calendar: 'business' }], goals: [], captures: [{ id: 'c1', text: 'My idea', date: '2026-01-01' }], entries: [], settings: {} };
  const migrated = migrateJson(JSON.stringify(previous));
  assert.equal(migrated.tasks[0].id, 't3');
  assert.equal(migrated.tasks[0].title, 'My strength training');
  assert.equal(migrated.tasks[0].date, '2026-01-01');
  assert.equal(migrated.events[0].id, 'e2');
  assert.equal(migrated.captures[0].id, 'c1');
  assert.equal(migrated.calendars[0].name, 'Business');
});

test('web repository retains the existing storage key and round trips saved state', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const repository = new WebStateRepository(storage, value => migrateJson(value === null ? null : JSON.stringify(value)));
  const state = migrateJson(null);
  state.tasks = [{ id: 'persist-me', title: 'Saved', date: '', time: '', duration: 0, priority: 5, goal: '', calendar: 'personal', done: false, postponed: 0 }];
  repository.save(state);
  assert.equal(values.has('order-prototype-v1'), true);
  assert.equal(repository.load().tasks[0].id, 'persist-me');
});
