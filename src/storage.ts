import type { State } from './types';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StateRepository {
  load(): State;
  save(state: State): void;
}

export interface JsonRepository {
  read<T>(key: string, fallback: T): T;
  write<T>(key: string, value: T): void;
}

/** Existing browser JSON keys, kept stable for web users. */
export class WebJsonRepository implements JsonRepository {
  private readonly storage: KeyValueStorage;
  constructor(storage: KeyValueStorage) { this.storage = storage; }
  read<T>(key: string, fallback: T): T {
    try { const raw = this.storage.getItem(key); return raw === null ? fallback : JSON.parse(raw) as T; }
    catch { return fallback; }
  }
  write<T>(key: string, value: T): void { this.storage.setItem(key, JSON.stringify(value)); }
}

/** Raw key/value adapter for the existing web keys whose serialized format must remain unchanged. */
export const webKeyValueStorage: KeyValueStorage = {
  getItem: key => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: key => localStorage.removeItem(key),
};
/** Web preference adapter. A native entry point can provide another JsonRepository. */
export const webJsonRepository = new WebJsonRepository(webKeyValueStorage);

/** Adapter around the existing ORDER localStorage keys. */
export class WebStateRepository implements StateRepository {
  private readonly storage: KeyValueStorage;
  private readonly migrate: (value: unknown) => State;
  constructor(storage: KeyValueStorage, migrate: (value: unknown) => State) { this.storage = storage; this.migrate = migrate; }
  load(): State {
    const raw = this.storage.getItem('order-prototype-v1');
    return this.migrate(raw === null ? null : JSON.parse(raw));
  }
  save(state: State): void { this.storage.setItem('order-prototype-v1', JSON.stringify(state)); }
}
