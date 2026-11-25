import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portableModules = [
  'actionEngine.ts',
  'applicationServices.ts',
  'calendarOrder.ts',
  'captureOrganization.ts',
  'dailyPlanning.ts',
  'eventActions.ts',
  'eventStore.ts',
  'goalDomain.ts',
  'ics.ts',
  'icsImport.ts',
  'notifications.ts',
  'personalization.ts',
  'projectDomain.ts',
  'rescheduling.ts',
  'reviewEngine.ts',
  'searchEngine.ts',
  'stateMigration.ts',
  'taskDomain.ts',
  'taskViews.ts',
  'timeTracking.ts',
];

test('domain and application modules stay independent of React and browser globals', () => {
  const violations: string[] = [];
  for (const file of portableModules) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    if (/\bfrom\s*['"]react(?:-dom)?(?:\/[^'"]*)?['"]/.test(source)) violations.push(`${file}: React import`);
    for (const global of ['window', 'document', 'localStorage', 'sessionStorage', 'indexedDB', 'Notification']) {
      if (new RegExp(`\\b${global}\\b`).test(source)) violations.push(`${file}: ${global}`);
    }
  }
  assert.deepEqual(violations, [], 'portable core must use application inputs and explicit platform adapters');
});
