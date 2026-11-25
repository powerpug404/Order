import type { Cal, Task, TaskStatus } from './types';

export function normalizeTask(task: Task, now = new Date().toISOString()): Task {
  const dueDate = task.dueDate ?? task.date ?? '';
  const scheduledDate = task.scheduledDate ?? (task.showCalendar ? task.date : '') ?? '';
  const status: TaskStatus = task.done ? 'completed' : task.status === 'in_progress' || task.status === 'inbox' ? task.status : task.status === 'todo' ? 'todo' : 'todo';
  return { ...task, dueDate, scheduledDate, status, updatedAt: task.updatedAt || task.createdAt || now, tags: task.tags || [] };
}

export function taskWithChanges(current: Task, changes: Partial<Task>, now = new Date().toISOString()): Task {
  const next = normalizeTask({ ...current, ...changes, updatedAt: now });
  if (changes.done !== undefined || changes.status !== undefined) {
    const done = changes.status === 'completed' || (changes.done ?? next.done);
    next.done = done;
    next.status = done ? 'completed' : changes.status === 'in_progress' ? 'in_progress' : changes.status === 'inbox' ? 'inbox' : 'todo';
    next.completedAt = done ? current.completedAt || now : undefined;
  }
  return next;
}

export function assignCalendar(input: { explicitId?: string; mentioned?: string; context?: string }, calendars: Cal[]): { calendarId: string; reason: string; confidence: 'high' | 'moderate' | 'low' } {
  const visible = calendars;
  if (input.explicitId && visible.some(c => c.id === input.explicitId)) return { calendarId: input.explicitId, reason: 'Selected by you', confidence: 'high' };
  const text = `${input.mentioned || ''} ${input.context || ''}`.toLowerCase();
  if (!text.trim()) return { calendarId: visible.find(c => c.isDefault)?.id || visible[0]?.id || '', reason: 'Default calendar', confidence: 'low' };
  const name = visible.find(c => c.name && text.includes(c.name.toLowerCase()));
  if (name) return { calendarId: name.id, reason: `Matched ${name.name}`, confidence: 'high' };
  const label = visible.find(c => c.label && c.label !== 'Other' && text.includes(c.label.toLowerCase()));
  if (label) return { calendarId: label.id, reason: `Matched ${label.label} calendar`, confidence: 'high' };
  const purpose = visible.map(c => ({ c, hits: (c.purpose || '').toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 3 && text.includes(word)).length })).sort((a, b) => b.hits - a.hits)[0];
  if (purpose && purpose.hits) return { calendarId: purpose.c.id, reason: `Matched its purpose: ${purpose.c.purpose}`, confidence: purpose.hits > 1 ? 'high' : 'moderate' };
  return { calendarId: visible.find(c => c.isDefault)?.id || visible[0]?.id || '', reason: 'Default calendar', confidence: 'low' };
}

export function taskWorkload(tasks: Task[], events: { date: string; start?: string; end?: string; duration?: number; status?: string }[], day: string) {
  const planned = tasks.filter(t => !t.done && (t.scheduledDate || (t.showCalendar ? t.date : '')) === day);
  const taskMinutes = planned.reduce((n, t) => n + Math.max(0, t.duration || 0), 0);
  const eventMinutes = events.filter(e => e.date === day && e.status !== 'canceled').reduce((n, e) => {
    if (e.start && e.end) { const [sh, sm] = e.start.split(':').map(Number), [eh, em] = e.end.split(':').map(Number); if ([sh, sm, eh, em].every(Number.isFinite)) return n + Math.max(0, eh * 60 + em - sh * 60 - sm); }
    return n + Math.max(0, e.duration || 0);
  }, 0);
  return { tasks: planned, taskMinutes, eventMinutes, totalMinutes: taskMinutes + eventMinutes };
}
