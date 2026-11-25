import { createEventRecord, saveEventRecord } from './eventStore.ts';
import { normalizeGoal } from './goalDomain.ts';
import { reconcileTaskMilestoneLinks } from './projectDomain.ts';
import { normalizeTask, taskWithChanges } from './taskDomain.ts';
import type { EventItem, Goal, State, Task } from './types.ts';

export type StateTransition<T> = { state: State; value: T };

/** Canonical task save path for forms, widgets, and approved AI proposals. */
export function saveTaskUseCase(state: State, raw: Partial<Task>, defaultCalendar: string, makeId: () => string, now = new Date().toISOString()): StateTransition<Task> {
 const prior = state.tasks.find(item => item.id === raw.id);
 const task = normalizeTask({ ...(prior || {}), ...raw, id: raw.id || makeId(), createdAt: raw.createdAt || prior?.createdAt || now, updatedAt: now,
  title: raw.title || '', date: raw.date ?? prior?.date ?? '', dueDate: raw.dueDate ?? prior?.dueDate ?? raw.date ?? '',
  scheduledDate: raw.scheduledDate ?? prior?.scheduledDate ?? (raw.showCalendar ? raw.date || '' : prior?.showCalendar ? prior.date || '' : ''),
  time: raw.time ?? prior?.time ?? '', duration: Number(raw.duration ?? prior?.duration) || 0,
  priorityLevel: raw.priorityLevel || prior?.priorityLevel || 3, priority: [10, 8, 5, 2][((raw.priorityLevel || prior?.priorityLevel || 3) - 1)],
  goal: raw.goal ?? prior?.goal ?? '', calendar: raw.calendar ?? prior?.calendar ?? defaultCalendar, done: raw.done ?? prior?.done ?? false,
  completedAt: raw.done ? raw.completedAt || prior?.completedAt || now : raw.done === false ? undefined : prior?.completedAt,
  postponed: raw.postponed ?? prior?.postponed ?? 0, showToday: raw.showToday ?? prior?.showToday ?? true,
  showCalendar: raw.showCalendar ?? prior?.showCalendar ?? Boolean(raw.date), notes: raw.notes ?? prior?.notes ?? '', description: raw.description ?? prior?.description ?? '',
  eventId: raw.eventId ?? prior?.eventId ?? '', parentTaskId: raw.parentTaskId ?? prior?.parentTaskId ?? '', project: raw.project ?? prior?.project ?? '',
  projectId: Object.prototype.hasOwnProperty.call(raw, 'projectId') ? raw.projectId : prior?.projectId, endTime: raw.endTime ?? prior?.endTime ?? '',
  milestone: raw.milestone ?? prior?.milestone ?? '', dependencies: raw.dependencies ?? prior?.dependencies ?? [], tags: raw.tags ?? prior?.tags ?? [],
  createdBy: raw.createdBy || prior?.createdBy || 'manual' });
 const linked = reconcileTaskMilestoneLinks(state, task.id, task.projectId, task.project || '');
 const oldEventId = linked.tasks.find(item => item.id === task.id)?.eventId;
 const next = { ...linked,
  tasks: linked.tasks.some(item => item.id === task.id) ? linked.tasks.map(item => item.id === task.id ? task : item) : [task, ...linked.tasks],
  events: linked.events.map(event => oldEventId === event.id && oldEventId !== task.eventId ? { ...event, taskIds: (event.taskIds || []).filter(id => id !== task.id) } : event.id === task.eventId ? { ...event, taskIds: [...new Set([...(event.taskIds || []), task.id])] } : event),
 };
 return { state: next, value: task };
}

export function completeTaskUseCase(state: State, id: string, now = new Date().toISOString()): State {
 return { ...state, tasks: state.tasks.map(task => task.id === id ? taskWithChanges(task, { done: !task.done }, now) : task) };
}

/** Canonical event save path with calendar validation, duplicate protection, and task links. */
export function saveEventUseCase(state: State, event: EventItem, makeId: () => string, now = new Date().toISOString()): { state: State; ok: boolean; reason?: 'invalid' | 'duplicate' | 'calendar' } {
 const existing = state.events.find(item => item.id === event.id);
 const record = { ...event, createdAt: event.createdAt || existing?.createdAt || now };
 if (!existing) {
  const result = createEventRecord(state.events, record, state.calendars.map(calendar => calendar.id), makeId);
  if (!result.ok) return { state, ok: false, reason: result.reason };
  if (!result.created) return { state, ok: false, reason: 'duplicate' };
  return { state: { ...state, events: result.events, tasks: state.tasks.map(task => ({ ...task, eventId: (record.taskIds || []).includes(task.id) ? record.id : task.eventId === record.id ? '' : task.eventId })) }, ok: true };
 }
 return { state: { ...state, events: saveEventRecord(state.events, { ...record, createdAt: record.createdAt || existing.createdAt || now }),
  tasks: state.tasks.map(task => ({ ...task, eventId: (event.taskIds || []).includes(task.id) ? event.id : task.eventId === event.id ? '' : task.eventId })) }, ok: true };
}

export function saveGoalUseCase(state: State, raw: Goal, now = new Date().toISOString()): State {
 const goal = normalizeGoal({ ...raw, updatedAt: now });
 const old = state.goals.find(item => item.id === goal.id);
 const renamed = Boolean(old && old.name !== goal.name);
 return { ...state, goals: old ? state.goals.map(item => item.id === goal.id ? goal : item) : [goal, ...state.goals],
  ...(renamed ? { tasks: state.tasks.map(task => task.goalId === goal.id || task.goal === old!.name ? { ...task, goal: goal.name, goalId: goal.id } : task), events: state.events.map(event => event.goal === old!.name ? { ...event, goal: goal.name } : event) } : {}) };
}
