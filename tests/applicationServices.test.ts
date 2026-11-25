import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState } from '../src/data.ts';
import { completeTaskUseCase, saveEventUseCase, saveGoalUseCase, saveTaskUseCase } from '../src/applicationServices.ts';

const state = () => structuredClone(emptyState);

test('manual and AI callers can share one task save use case and retain links', () => {
  const initial = state();
  const first = saveTaskUseCase(initial, { title: 'Prepare agenda', calendar: 'personal' }, 'personal', () => 'task-1', '2026-11-25T10:00:00.000Z');
  assert.equal(first.state.tasks[0].id, 'task-1');
  assert.equal(first.state.tasks[0].createdBy, 'manual');
  const ai = saveTaskUseCase(first.state, { id: 'task-1', title: 'Prepare meeting agenda', createdBy: 'ai' }, 'personal', () => 'unused', '2026-11-25T11:00:00.000Z');
  assert.equal(ai.state.tasks[0].id, 'task-1');
  assert.equal(ai.state.tasks[0].title, 'Prepare meeting agenda');
  assert.equal(initial.tasks.length, 0);
});

test('task completion and goal rename preserve related records', () => {
  const initial = state();
  const created = saveTaskUseCase(initial, { title: 'Do it', goal: 'Old goal', goalId: 'goal-1' }, 'personal', () => 'task-1', '2026-11-25T10:00:00.000Z').state;
  const withGoal = saveGoalUseCase(created, { id: 'goal-1', name: 'Old goal', category: 'Home', description: '', priority: 3, target: '', progress: 0, milestones: [] }, '2026-11-25T10:00:00.000Z');
  const renamed = saveGoalUseCase(withGoal, { ...withGoal.goals[0], name: 'New goal' }, '2026-11-25T11:00:00.000Z');
  assert.equal(renamed.tasks[0].goal, 'New goal');
  assert.equal(renamed.tasks[0].goalId, 'goal-1');
  const completed = completeTaskUseCase(renamed, 'task-1', '2026-11-25T12:00:00.000Z');
  assert.equal(completed.tasks[0].done, true);
  assert.equal(completed.tasks[0].completedAt, '2026-11-25T12:00:00.000Z');
});

test('manual and AI event paths share calendar validation and duplicate protection', () => {
  const initial = state();
  const event = { id: 'event-1', title: 'Planning', date: '2026-11-26', start: '09:00', end: '10:00', calendar: 'personal', taskIds: [] };
  const saved = saveEventUseCase(initial, event, () => 'unused', '2026-11-25T10:00:00.000Z');
  assert.equal(saved.ok, true);
  assert.equal(saved.state.events[0].id, 'event-1');
  assert.equal(saveEventUseCase(saved.state, { ...event, id: 'event-2' }, () => 'unused').reason, 'duplicate');
  assert.equal(saveEventUseCase(initial, { ...event, calendar: 'missing' }, () => 'unused').reason, 'calendar');
  assert.equal(initial.events.length, 0);
});
