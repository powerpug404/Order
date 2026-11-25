# ORDER developer guide

## Start and verify

Use Node.js 22 and the checked-in lockfile:

```sh
npm ci
npm run dev
```

Before a change is ready to merge, run:

```sh
npm test
npm run build
```

GitHub Pages CI runs both the test suite and production build before deployment. No Xcode, Capacitor, or Expo setup is needed for ordinary web or domain work.

## Where code belongs

- **Domain rules:** pure TypeScript modules such as `taskDomain`, `eventStore`, `goalDomain`, `projectDomain`, recurrence, search, and review logic. Keep these modules independent of React, browser globals, and storage.
- **Application use cases:** `applicationServices.ts` owns shared state transitions used by manual UI and approved AI actions. Add a use case here when a mutation needs the same rules in more than one entry point.
- **Persistence:** `storage.ts` defines repository contracts and the current web adapters. Preserve existing localStorage key names and serialized formats unless an explicit, tested schema migration changes them. `dataBackup.ts` owns validated export/restore and rollback behavior.
- **Platform capabilities:** `notificationPlatform.ts` and `lifecyclePlatform.ts` are small consumed interfaces with web implementations. Add a platform interface only for a capability the app uses. A future native adapter should implement the same contract and must not put platform checks inside domain rules.
- **UI and navigation:** React components own presentation and browser interactions. `App.tsx` is still a large coordinator; avoid adding new business rules there when they can live in a pure module or use case.
- **AI server:** `api/assistant.ts` owns the provider call. Keep provider keys in server environment only. AI plans remain proposals until validated and approved through application services.

## Portability rules

1. Manual and AI mutations should call the same application use case.
2. Domain and application tests should pass in Node without a DOM, browser storage, React renderer, or native runtime.
3. Treat saved IDs and relationships as user data. Reject invalid imports with an actionable error; do not silently filter or reseed stored data.
4. Store Clock start/end as absolute instants. Intervals may refresh the display, but never define elapsed time.
5. Distinguish all-day date strings, local scheduled wall times, and absolute timestamps. Add tests at daylight-saving boundaries when changing date/time behavior.
6. For browser or native APIs, use a focused platform adapter and test the core against a fake. A Node test does not prove iPhone behavior.
7. Keep Home's AI command bar first and preserve customizable widget ordering/configuration. Removing a widget may change its layout only; it must not delete feature records.
8. Do not introduce Capacitor, Expo, authentication, cloud sync, or a new backend as routine portability cleanup. Those require the separate iOS beta plan and decisions.

## Test map

- `tests/*Domain.test.ts`, `events.test.ts`, `ics.test.ts`, `taskViews.test.ts`: business rules and calendar/time behavior.
- `tests/applicationServices.test.ts`: shared transitions for manual and AI callers.
- `tests/storage.test.ts`, `stateMigration.test.ts`, `dataBackup.test.ts`: key compatibility, version migration, import/export, and rollback.
- `tests/portableCore.test.ts`: architectural guard against React/browser globals entering the portable modules.
- `tests/notificationPlatform.test.ts`, `lifecyclePlatform.test.ts`: platform adapter contracts using fakes.

## Before adding a native adapter

Write down the capability contract, permissions and denial behavior, lifecycle semantics, and data mapping first. Keep the web adapter working. Test the contract in Node, then validate the native implementation on a real iPhone; browser emulation and simulator-only results are not device evidence. See [the iOS beta preflight](ios-beta-preflight.md) and [readiness report](ios-readiness.md).
