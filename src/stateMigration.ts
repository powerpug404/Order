import { emptyState } from './data.ts';
import { normalizeGoal } from './goalDomain.ts';
import { legacyPriority } from './aiService.ts';
import type { State } from './types.ts';

export const CURRENT_SCHEMA_VERSION = 11;
/** Pure migration from the current and previously stored ORDER shapes. */
export function migrateState(value: unknown): State {
  const base = structuredClone(emptyState);
  base.schemaVersion = CURRENT_SCHEMA_VERSION;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const raw = value as any;
  const state: any = { ...base, ...raw };
  for (const key of ['calendars', 'events', 'goals', 'projects', 'lifeAreas', 'captures', 'entries', 'timeCategories'] as const)
    state[key] = Array.isArray(raw[key]) ? raw[key] : base[key];

  // Preserve all user calendar names and records, including IDs resembling old samples.
  if (!state.calendars.some((calendar: any) => calendar.isDefault) && state.calendars.length) state.calendars[0].isDefault = true;
  state.tasks = (Array.isArray(raw.tasks) ? raw.tasks : base.tasks).map((task: any) => ({
    ...task,
    priorityLevel: task.priorityLevel || legacyPriority(task.priority),
    showToday: task.showToday ?? true,
    showCalendar: task.showCalendar ?? Boolean(task.date),
    date: task.date || '',
    time: task.time || '', dueDate: task.dueDate ?? (task.date || ''),
    scheduledDate: task.scheduledDate ?? (task.showCalendar ? task.date || '' : ''),
    status: task.done ? 'completed' : task.status || 'todo', tags: task.tags || [],
    updatedAt: task.updatedAt || task.createdAt || new Date().toISOString(),
  }));
  state.events = state.events.map((event: any) => ({ ...event, date: typeof event.date === 'string' ? event.date : '' }));
  state.goals = state.goals.map((goal: any) => normalizeGoal(goal));
  state.settings = { ...base.settings, ...raw.settings,
    dailyCapacityMinutes: Number.isFinite(Number(raw.settings?.dailyCapacityMinutes)) ? Number(raw.settings.dailyCapacityMinutes) : undefined };
  if (!state.timeCategories.length) state.timeCategories = base.timeCategories;
  state.activeTimer = raw.activeTimer ? {
    categoryId: String(raw.activeTimer.categoryId || 'focus'), project: String(raw.activeTimer.project || 'Focus'),
    start: String(raw.activeTimer.start || new Date().toISOString()),
    ...(typeof raw.activeTimer.taskId === 'string' ? { taskId: raw.activeTimer.taskId } : {}),
    ...(typeof raw.activeTimer.projectId === 'string' ? { projectId: raw.activeTimer.projectId } : {}),
  } : undefined;
  state.projects = Array.isArray(raw.projects) ? raw.projects : [];
  state.lifeAreas = Array.isArray(raw.lifeAreas) ? raw.lifeAreas : [];
  state.schemaVersion = CURRENT_SCHEMA_VERSION;
  return state as State;
}

export function migrateJson(raw: string | null): State {
  return migrateState(raw === null ? null : JSON.parse(raw));
}
