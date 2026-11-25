import test from 'node:test';
import assert from 'node:assert/strict';
import { WebJsonRepository, type KeyValueStorage } from '../src/storage.ts';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: KeyValueStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  };
  return { data, storage };
}

test('raw preferences keep their current storage format and support removal', () => {
  const { data, storage } = memoryStorage({ 'order-home-default-tab': 'Tasks' });
  assert.equal(storage.getItem('order-home-default-tab'), 'Tasks');
  storage.setItem('order-home-default-tab', 'Events');
  assert.equal(data.get('order-home-default-tab'), 'Events');
  storage.removeItem('order-home-default-tab');
  assert.equal(storage.getItem('order-home-default-tab'), null);
});

test('auxiliary repository reads and writes existing widget and notification keys unchanged', () => {
  const { data, storage } = memoryStorage({ 'order-home-dashboard-v3': '[{"id":"today","type":"today"}]', 'order-notifications': '[{"id":"reminder-1"}]' });
  const repository = new WebJsonRepository(storage);
  assert.equal(repository.read<any[]>('order-home-dashboard-v3', [])[0].id, 'today');
  assert.equal(repository.read<any[]>('order-notifications', [])[0].id, 'reminder-1');
  repository.write('order-notification-preferences', { enabled: true });
  assert.equal(data.get('order-notification-preferences'), '{"enabled":true}');
  assert.deepEqual([...data.keys()].sort(), ['order-home-dashboard-v3', 'order-notifications', 'order-notification-preferences'].sort());
});

test('malformed auxiliary JSON falls back without deleting the stored value', () => {
  const { data, storage } = memoryStorage({ 'order-review-history': '{bad json' });
  const repository = new WebJsonRepository(storage);
  assert.deepEqual(repository.read('order-review-history', []), []);
  assert.equal(data.get('order-review-history'), '{bad json');
});
