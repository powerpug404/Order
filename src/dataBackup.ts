import type { State } from './types';

export const BACKUP_FORMAT = 'order-local-backup';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export const ORDER_STORAGE_KEYS = [
  'order-prototype-v1', 'order-daily-choices', 'order-organization-preview',
  'order-organization-ids', 'order-ai-action-session', 'order-ai-action-history',
  'order-review-history', 'order-search-history', 'order-notification-preferences',
  'order-notifications', 'order-home-default-tab', 'order-home-tab-order',
  'order-home-widgets', 'order-home-dashboard-v2', 'order-home-dashboard-v3',
  'order-reschedule-history',
] as const;
const RAW_VALUE_KEYS = new Set<string>(['order-home-default-tab']);

export type OrderBackup = {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  dataVersion: number;
  exportedAt: string;
  state: State;
  auxiliary: Record<string, unknown>;
};

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function validateBackup(value: unknown): OrderBackup {
  if (!isObject(value) || value.format !== BACKUP_FORMAT || value.formatVersion !== BACKUP_VERSION || !Number.isFinite(value.dataVersion) || !isObject(value.state)) {
    throw new Error('This file is not a supported ORDER backup.');
  }
  const state = value.state;
  // Phase 9.5 backups predate the Phase 10 records. Keep them restorable as an empty project layer.
  if (Number(value.dataVersion) < 10) {
    if (state.projects === undefined) state.projects = [];
    if (state.lifeAreas === undefined) state.lifeAreas = [];
  }
  const arrays = ['calendars', 'tasks', 'events', 'goals', 'projects', 'lifeAreas', 'captures', 'entries', 'timeCategories'];
  for (const key of arrays) {
    if (!Array.isArray(state[key])) throw new Error(`The backup is missing valid ${key} data.`);
    if (state[key].length > 50000) throw new Error(`The backup contains too many ${key} records.`);
    const ids = state[key].map((row: any) => row?.id).filter((id: any) => typeof id === 'string');
    if (new Set(ids).size !== ids.length) throw new Error(`The backup has duplicate IDs in ${key}.`);
  }
  for (const project of state.projects) {
    if (!isObject(project) || typeof project.id !== 'string' || !project.id || typeof project.name !== 'string' || !project.name.trim() || !['not_started', 'active', 'on_hold', 'completed', 'archived'].includes(project.status) || !Array.isArray(project.milestones) || !Array.isArray(project.goalIds) || !Array.isArray(project.tags)) {
      throw new Error('The backup contains an invalid Project record.');
    }
    const milestoneIds = project.milestones.map((milestone: any) => milestone?.id).filter((id: any) => typeof id === 'string');
    if (new Set(milestoneIds).size !== milestoneIds.length || project.milestones.some((milestone: any) => !isObject(milestone) || typeof milestone.id !== 'string' || !milestone.id || typeof milestone.title !== 'string' || !milestone.title.trim())) {
      throw new Error(`Project “${project.name}” has invalid or duplicate milestones.`);
    }
  }
  for (const area of state.lifeAreas) {
    if (!isObject(area) || typeof area.id !== 'string' || !area.id || typeof area.name !== 'string' || !area.name.trim() || typeof area.archived !== 'boolean' || !Number.isFinite(area.sortOrder)) {
      throw new Error('The backup contains an invalid Life Area record.');
    }
  }
  if (!isObject(state.settings) || !Array.isArray(state.settings.workDays) || typeof state.settings.name !== 'string') {
    throw new Error('The backup has invalid settings.');
  }
  if (!isObject(value.auxiliary)) throw new Error('The backup has invalid auxiliary data.');
  const encoded = JSON.stringify(value);
  if (new TextEncoder().encode(encoded).length > MAX_BACKUP_BYTES) throw new Error('The backup is larger than ORDER can restore safely.');
  return value as OrderBackup;
}

export function createBackup(state: State, storage: Pick<Storage, 'getItem'>, now = new Date()): OrderBackup {
  const auxiliary: Record<string, unknown> = {};
  for (const key of ORDER_STORAGE_KEYS) {
    if (key === 'order-prototype-v1') continue;
    const raw = storage.getItem(key);
    if (raw === null) continue;
    try { auxiliary[key] = RAW_VALUE_KEYS.has(key) ? raw : JSON.parse(raw); }
    catch { throw new Error(`ORDER could not export ${key} because its saved data is damaged. Resolve that storage issue before exporting.`); }
  }
  const backup: OrderBackup = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    dataVersion: Number(state.schemaVersion || 1),
    exportedAt: now.toISOString(),
    state: structuredClone(state),
    auxiliary,
  };
  return validateBackup(backup);
}

export function restoreBackup(backupValue: unknown, storage: Pick<Storage, 'setItem' | 'removeItem'>): State {
  const backup = validateBackup(backupValue);
  // Validate and serialize every write first so malformed input cannot cause a partial restore.
  const writes = Object.entries(backup.auxiliary).filter(([key]) => (ORDER_STORAGE_KEYS as readonly string[]).includes(key) && key !== 'order-prototype-v1').map(([key, value]) => [key, RAW_VALUE_KEYS.has(key) ? String(value) : JSON.stringify(value)] as const);
  const stateJson = JSON.stringify(backup.state);
  const prior = new Map<string, string | null>();
  const readable = storage as Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  for (const [key] of writes) prior.set(key, readable.getItem(key));
  prior.set('order-prototype-v1', readable.getItem('order-prototype-v1'));
  try {
    for (const [key, value] of writes) storage.setItem(key, value);
    storage.setItem('order-prototype-v1', stateJson);
  } catch (error) {
    for (const [key, old] of prior) {
      try { if (old === null) storage.removeItem(key); else storage.setItem(key, old); } catch { /* best-effort rollback; caller reports the failure */ }
    }
    throw error;
  }
  return structuredClone(backup.state);
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
