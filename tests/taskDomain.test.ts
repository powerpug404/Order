import test from 'node:test';
import assert from 'node:assert/strict';
import { assignCalendar, normalizeTask, taskWithChanges, taskWorkload } from '../src/taskDomain.ts';
import type { Cal, Task } from '../src/types.ts';

const task: Task = { id: 't', title: 'Work', date: '2026-12-15', time: '', duration: 60, priority: 5, goal: '', calendar: 'personal', done: false, postponed: 0, showCalendar: true };
const calendars: Cal[] = [{ id: 'p', name: 'Personal', color: '#000000', visible: true, isDefault: true, label: 'Personal' }, { id: 'b', name: 'Ops', color: '#ffffff', visible: true, isDefault: false, label: 'Business', purpose: 'Estimates, client visits, and job materials' }];
test('legacy date stays due while scheduled date is distinct and editable', () => {
  const migrated = normalizeTask(task); assert.equal(migrated.dueDate, '2026-12-15'); assert.equal(migrated.scheduledDate, '2026-12-15');
  const moved = taskWithChanges(migrated, { scheduledDate: '2026-12-14' }); assert.equal(moved.dueDate, '2026-12-15'); assert.equal(moved.scheduledDate, '2026-12-14');
});
test('rescheduling a task does not move its deadline', () => {
  const existing = normalizeTask({ ...task, dueDate: '2026-12-18', scheduledDate: '2026-12-16' });
  const moved = taskWithChanges(existing, { scheduledDate: '2026-12-17' });
  assert.equal(moved.dueDate, '2026-12-18');
  assert.equal(moved.scheduledDate, '2026-12-17');
});
test('completion can be reopened and records a timestamp only when complete', () => {
  const done = taskWithChanges(task, { done: true }, 'now'); assert.equal(done.status, 'completed'); assert.equal(done.completedAt, 'now');
  const reopened = taskWithChanges(done, { done: false }, 'later'); assert.equal(reopened.status, 'todo'); assert.equal(reopened.completedAt, undefined);
});
test('calendar selection follows explicit, name, label, purpose, then default', () => {
  assert.equal(assignCalendar({ explicitId: 'p', context: 'estimate' }, calendars).calendarId, 'p');
  assert.equal(assignCalendar({ mentioned: 'Ops', context: 'visit' }, calendars).calendarId, 'b');
  assert.equal(assignCalendar({ context: 'Business estimate' }, calendars).calendarId, 'b');
  assert.equal(assignCalendar({ context: 'client estimates' }, calendars).calendarId, 'b');
  assert.equal(assignCalendar({ context: 'unmatched item' }, calendars).calendarId, 'p');
});
test('workload counts scheduled tasks and calendar commitments by their dates', () => {
  const migrated = normalizeTask(task); const result = taskWorkload([migrated], [{ date: '2026-12-14', start: '09:00', end: '10:00' }], '2026-12-14');
  assert.equal(result.taskMinutes, 0); assert.equal(result.totalMinutes, 60);
  assert.equal(taskWorkload([taskWithChanges(migrated, { scheduledDate: '2026-12-14' })], [], '2026-12-14').taskMinutes, 60);
});
