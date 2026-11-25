import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebLifecyclePlatform } from '../src/lifecyclePlatform.ts';

function eventSource() {
  const listeners = new Map<string, Set<() => void>>();
  return {
    listeners,
    addEventListener(type: string, callback: () => void) {
      const group = listeners.get(type) ?? new Set();
      group.add(callback);
      listeners.set(type, group);
    },
    removeEventListener(type: string, callback: () => void) { listeners.get(type)?.delete(callback); },
    emit(type: string) { for (const callback of listeners.get(type) ?? []) callback(); },
  };
}

test('web lifecycle refreshes only on visible and focus signals and unsubscribes cleanly', () => {
  const doc = eventSource() as ReturnType<typeof eventSource> & { visibilityState: string };
  doc.visibilityState = 'hidden';
  const win = eventSource();
  const platform = createWebLifecyclePlatform(doc, win);
  let calls = 0;
  const unsubscribe = platform.onForeground(() => calls++);

  doc.emit('visibilitychange');
  assert.equal(calls, 0);
  doc.visibilityState = 'visible';
  doc.emit('visibilitychange');
  win.emit('focus');
  assert.equal(calls, 2);

  unsubscribe();
  win.emit('focus');
  assert.equal(calls, 2);
});
