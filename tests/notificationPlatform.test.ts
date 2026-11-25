import test from 'node:test';
import assert from 'node:assert/strict';
import { WebNotificationPlatform } from '../src/notificationPlatform.ts';

test('browser notification adapter reports unsupported cleanly outside a notification-capable runtime', async () => {
  const platform = new WebNotificationPlatform();
  assert.equal(platform.permission(), 'unsupported');
  assert.equal(await platform.requestPermission(), 'unsupported');
  assert.equal(platform.deliver({ title: 'Reminder', body: 'Review', id: 'reminder-1' }), false);
});
