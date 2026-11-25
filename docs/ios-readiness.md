# ORDER — iOS Readiness 1.0

Assessment date: 2026-11-25

## Verdict

**NOT READY** for iOS conversion. The web product builds and its suite passes, storage and selected application boundaries are in place, and rendered web layouts have had an initial responsive review. UI state, navigation, auxiliary persistence, browser APIs, and many use cases remain coupled to `App.tsx` and React. No iPhone or native-device validation has occurred. This assessment is a portability foundation, not native conversion.

## Current architecture (confirmed)

- **UI/build:** React 18, TypeScript 5.6, Vite 6, Lucide React; single-page app bootstrapped from `src/main.tsx`, with a large `src/App.tsx` (~212 KB) coordinating Home, Calendar, Tasks, Clock, dialogs, forms, and application actions. Home’s AI command UI is first and its widget system is customizable.
- **Domain rules:** Framework-light modules already exist for task normalization/views, goals, projects, calendar recurrence, event persistence rules, planning, search, review, notification derivation, rescheduling, ICS parsing, and AI action planning. Several are covered by Node tests.
- **Persistence:** `order-prototype-v1` is the primary localStorage JSON state. Other keys store widget layouts/preferences, AI action session/history, notification data/preferences, reviews, and planning/capture drafts. Data backup/restore and corruption recovery exist. Primary state and app-coordinator/search keys now go through the raw key/value adapter; several auxiliary JSON stores use the JSON repository. Backup/restore still consumes the browser Storage API because it enumerates/copies the browser's stored records.
- **AI:** `src/aiService.ts` contains local deterministic suggestions and normalization. `src/actionEngine.ts` interprets and validates proposals. `api/assistant.ts` calls OpenAI Responses server-side using `OPENAI_API_KEY` from server environment; the browser calls the app endpoint. AI proposals are reviewed and the UI applies them through the same existing save helpers as manual actions for tasks, events, and goals. Event creation is also protected by `createEventRecord` and duplicate checks.
- **Calendar/file:** ICS import/export is local. Browser file input and `File.text()` handle backups and ICS imports; downloads use browser APIs. ORDER does not currently integrate a device calendar.
- **Notifications/lifecycle:** In-app reminders are derived while the app is open. A `NotificationPlatform` interface and browser adapter isolate permission and display calls; a 30-second foreground interval checks reminders. A `LifecyclePlatform` isolates Clock's browser focus/visible refresh signals. There is no configured service worker or background push. Clock stores an ISO start timestamp in primary state and calculates display elapsed time from it with a one-second display interval; stop creates an entry from persisted start/end timestamps.
- **Navigation/deployment:** Navigation is React state rather than URL/history routing. Vite builds static assets (`base: './'`); GitHub Actions builds and deploys `dist` to GitHub Pages. Vite dev server proxies `/api` to the Vercel deployment. `api/assistant.ts` is a Vercel-style serverless handler, not part of the static GitHub Pages artifact. The inspected API allowlist currently names web origins; a Capacitor origin/network policy needs review before native API use. No native wrapper/project is configured.
- **Dependencies:** Runtime dependencies are React, React DOM, and Lucide React. No Capacitor, Expo, or other native-only package was present or added. Server AI dependencies use the platform `fetch`; its production deployment configuration is not included in the inspected repository.

## Portability inventory

| Capability | Confirmed use | Boundary / risk |
|---|---|---|
| `localStorage` | Primary state and some preferences/history, wrapped through `src/storage.ts`; backup and restore still use browser `Storage` enumeration | Browser-only implementation; primary and selected auxiliary state have interfaces, while remaining feature/UI storage and backup enumeration need a portable replacement or adapter. Quota and synchronous semantics differ from native storage. |
| IndexedDB | No use found in `src`, `api`, or current dependencies | Not a current dependency; native storage choice remains open. |
| `window` / `document` | Keyboard/pointer listeners, custom events, element lookup, viewport/browser notification support, download links | UI/platform coupling; replace only at explicit capability boundaries where native behavior is required. |
| Notifications | `NotificationPlatform` web adapter wraps permission and browser display; reminder polling uses `setInterval` | Browser permission and foreground behavior; native notifications require permission and native scheduling/plugin decisions. No reliable suspended-app delivery. |
| Timers | Clock tick `setInterval`; toast and UI `setTimeout`; reminder poll `setInterval` | Intervals are display/check triggers only. Elapsed time must be derived from saved timestamps on render/resume. Background delivery is not guaranteed. |
| Drag/touch | Home uses HTML drag/drop plus pointer events and `elementFromPoint`; Move Up/Move Down controls already provide an accessible alternative | Pointer/DOM mechanics need actual iOS touch testing; accessible alternative is present. |
| File handling | `<input type=file>`, `File.text()`, download anchor/object URL in backup/ICS flows | File picker/share sheet require platform adapter for native integration. |
| Browser navigation | No `history.pushState`, `popstate`, or URL router found; page is React state | Back gesture/history semantics need a navigation policy and likely wrapper integration. |
| DOM/UI | React DOM, CSS, `dvh`, safe-area CSS in some mobile rules, CSS filters/background attachment | React DOM is usable via a WebView path; React Native would require replacing most visual components/styles. Browser behavior is not proof of iOS rendering. |
| Network/provider | Client fetches app API; server handler uses `process.env.OPENAI_API_KEY` and provider fetch | Provider secret is server-side in inspected code. GitHub Pages alone cannot execute this handler; the app currently relies on separately hosted Vercel endpoint. |
| Native-only/unavailable | Device calendar, background push, secure credential storage, share sheet, app lifecycle callbacks | No current implementation or plugin dependency; future native work. No user secrets are stored by inspected client logic. |

## Proposed boundaries and Phase 2 status

- **Domain:** retain existing pure modules (`taskDomain`, `goalDomain`, `eventStore`, `projectDomain`, `dailyPlanning`, `actionEngine`, etc.). Avoid moving UI merely to satisfy a layering diagram.
- **Application services/use cases:** `src/applicationServices.ts` owns pure transitions for task saves/completion, event saves, and goal saves/relationship updates. Manual helpers and Home’s reviewed AI proposals delegate to these transitions. The separate AI action-plan executor still has direct state transitions for some actions; remaining projects, captures, calendars, timer start/stop, settings and AI orchestration include coordinator logic in `App.tsx`.
- **Persistence/external integration:** `StateRepository`, `JsonRepository`, and `KeyValueStorage` in `src/storage.ts` wrap primary state and auxiliary data without changing keys or serialized formats. `WebStateRepository`, `WebJsonRepository`, and `webKeyValueStorage` are working web adapters. The app coordinator and Global Search route preferences, AI session/history, planning/capture drafts, reschedule history, and search history through the key/value adapter. Home widgets, notifications, and review history use the JSON adapter. Backup/restore retains explicit access to browser `Storage` for complete backup enumeration.
- **UI/navigation:** React component tree remains the web UI. Home, Calendar, Tasks, Clock are currently named Today, Calendars, Manage, Timer in internal page state and preserve their product destinations. AI bar remains first on Home. Widget configuration/reorder/removal stays user-controlled; removal only removes a layout entry, not feature records.
- **Platform:** notification permission/delivery and lifecycle foreground refresh now have consumed interfaces with web implementations. Calendar import/export/device-calendar access and file open/share still need focused adapters as those integrations are implemented. There is no need for a secure-storage interface until client credentials exist; the AI key belongs on the server.

Phase 2 is **partially complete**: framework-light rules are preserved and shared task/event/goal services now serve manual UI, Home AI proposals, and action-plan event/goal mutations. Task updates in the action-plan executor and other entity actions still need consolidation. React/browser coupling remains in the coordinator and not every entity has an authoritative service API.

## Work completed in this readiness pass

- Extracted primary schema conversion from `App.tsx` into pure `src/stateMigration.ts`, setting explicit current schema version 11. The app now boots through this migration and saves through `WebStateRepository`.
- Added `src/storage.ts` interfaces and a web adapter that continues reading/writing `order-prototype-v1`.
- Removed migration filters and sample-ID date changes that could silently delete or alter real user records. Legacy records with those IDs retain dates and calendar names. No storage reset or new dependency was introduced.
- Added `src/applicationServices.ts` for common task, event, and goal transitions. Manual helpers and Home AI proposal approval use these services. Other AI action-plan execution paths remain to be consolidated.
- Routed AI action-plan task updates/scheduling, event creation/update, and goal create/update through the same application transitions.
- Routed Home widget preferences, notification preferences/history, and review history through the JSON repository while retaining their existing keys.
- Routed app coordinator and Global Search raw preferences and histories through `webKeyValueStorage`, preserving existing serialized values and key names. Backup/restore remains explicitly web-specific while it depends on `Storage` enumeration.
- Added a notification platform interface and browser adapter; UI and reminder delivery no longer call the browser Notification API directly.
- Added a lifecycle platform interface for Clock's browser focus/visibility refresh signals; timestamp-derived elapsed time remains authoritative.
- Clock display now recalculates from the persisted start instant at mount and on browser visibility/focus return; interval ticks only refresh the display.
- Added tests for schema 10 representative data, relationships, stable IDs, legacy collision preservation, primary and auxiliary repository round trips, shared application-service transitions, elapsed Clock calculation after a long pause, and unsupported notification runtime behavior.
- Existing widget implementation already has touch pointer reordering and keyboard-operable Move Up/Move Down controls; widget removal only edits layout. Existing mobile CSS includes safe-area bottom padding, dynamic viewport units, 16px form inputs in multiple areas, and 44px control sizing. These are source inspections, not viewport/device verification.

## Time, dates, and lifecycle

- Clock’s active timer stores an absolute ISO instant (`activeTimer.start`); elapsed seconds are computed as `Date.now() - start`, and stopping stores ISO `start`/`end`. Display recalculates at mount and when the page becomes visible/focused; interval ticks refresh display and do not define elapsed time. A pure test covers a six-million-millisecond pause. Browser storage close/reopen remains unverified.
- Events distinguish all-day date strings (`allDay`, `date`, `endDate`) from local date plus wall-clock strings (`date`, `start`, `end`) and may retain an imported `timezone`. Time entries and active timer use absolute ISO timestamps. This mixed model is confirmed; it does not yet establish a uniform timezone contract for all event sources.
- Existing tests cover all-day ICS dates, TZID conversion to browser-local wall time, recurring events, and calendar-day queries. They do not cover daylight-saving boundary recurrence comprehensively or real app close/reopen with browser storage.
- **Future tests:** add deterministic DST cases for America/Chicago spring/fall transitions, recurrence over gaps/folds, explicit behavior for timezone-less local events, and reload/resume from a persisted active timer in a browser integration harness. The unit test covers time arithmetic but not browser persistence or UI lifecycle. A native app must recalculate on foreground using persisted instants.
- iOS reminders that must deliver while suspended need native notification scheduling and user permission; server push/background modes have separate entitlement, backend, and power constraints. Do not promise background timer or notification reliability from browser intervals.

## Mobile interface status

An actual browser preview was inspected at 320 CSS px for Home, Calendar, Tasks, and Clock. Page-width measurements were swept at 375, 390, 430, 768, and 1280 CSS px for every destination; document/body width did not exceed the viewport. The 320px screens were visually reviewed and showed no horizontal overflow. The preview used a separate `localhost` origin and a temporary task for layout inspection, so it did not mutate the user's existing `127.0.0.1` browser profile. Rendered screenshots were reviewed during the session, but image files were not saved as repository artifacts; this is not an archived screenshot baseline or iPhone evidence.

Responsive fixes made in `src/styles.css` include a mobile Week default for Calendar, improved small-screen calendar labels and navigation controls, more readable task row text, larger primary task/widget/reorder controls, and clearer spacing for Clock summary cards. The review confirmed that the 320px Tasks screen fits and its task row is readable. This was a narrow visual check; it did not validate every interactive state or fully establish a 44px hit target for every control. The first sweep showed remaining undersized controls (especially Home and Calendar), and these need a systematic post-fix audit.

Still unverified: keyboard-open forms/modals, safe-area behavior on physical hardware, browser back/history behavior, modal dismissal, text scaling/dynamic type, contrast, focus return, VoiceOver labels/navigation, reduced motion, all widget reorder gestures, and actual 44px hit targets across states. Do not treat web viewport screenshots as iPhone validation. Save screenshots in a future visual QA pass and compare the same states on actual devices.

## AI portability and verification

- AI request and result parsing should remain independent of component state; currently networking helper and large action orchestration remain coupled to `App.tsx`.
- Action proposals have structured types, validation, fingerprints/stale checks, reviewable approval, and failed/succeeded history in existing modules/UI. The server validates requests and protects provider credentials. New persistence/service interfaces must ensure AI and manual changes use the same authoritative use cases and verify persisted records before confirmation.
- Existing event tests verify AI-style creation, deduplication, persistence/reload semantics, and calendar query visibility; action engine tests verify proposal validation. Application-service tests cover shared task/event/goal transitions. No end-to-end call against the deployed AI server was made in this pass.
- Retry/network failure currently reports errors and avoids local mutation before a valid response; duplicate prevention includes action review and event-level duplicate checks. Durable idempotency across server retries/relaunch is not established. Resume/recovery for an action interrupted between approval and local persistence remains future work.

## Conversion paths (repository-based assessment)

| Requirement | Capacitor | React Native / Expo |
|---|---|---|
| Reuse current React UI and CSS | High: existing Vite web app can run in a native WebView with selective native plugins | Low to moderate: domain TypeScript can be reused, but React DOM, HTML elements, CSS, and most UI components need a React Native rewrite |
| Device calendar and notifications | Plugin bridge fits a small set of native capabilities; calendar permission and background delivery need device proof | Native modules/libraries are available, with Expo config/plugin and permission constraints to validate |
| Lifecycle and Clock | Web app must recalculate from timestamps on resume; plugin lifecycle event can help | Native AppState events fit lifecycle; timer accuracy still comes from stored timestamps |
| Accessibility/performance | Preserves existing semantics but WebView behavior and VoiceOver must be tested on device | Native controls can improve platform behavior but requires larger accessibility/UI migration |
| Maintenance/distribution | Smallest change set for this React DOM product; maintain plugin and web/native bridge compatibility | Greater UI rewrite and two UI implementations unless much is rebuilt; Expo eases build/distribution but adds ecosystem constraints |

**Decision for the first iOS prototype: Capacitor**, because this repository is a React DOM/Vite application with substantial existing UI and framework-independent TypeScript rules. Keep the web assets bundled locally in WKWebView. Prove device calendar access, notification scheduling while suspended, safe-area/keyboard behavior, and Clock restoration on real hardware before deciding whether to continue with this path for a release. React Native/Expo is preferable only if device evidence shows native UI/performance requirements justify replacing most of the UI.

## Prioritized migration checklist

1. **P0 — Data safety:** expand versioned migration fixtures from actual archived schema snapshots; add rollback/backup strategy when introducing a new native database; migrate all auxiliary localStorage keys, including widget preferences, without resets.
2. **P0 — Service boundary:** extract small application services for task, event, goal, calendar, reminder, and time-entry mutations from `App.tsx`; make manual forms, widgets, and AI approvals invoke the same use cases. Keep domain functions pure.
3. **P0 — Clock/time:** test persisted timer reload/resume and stop behavior, time-zone contract, DST gaps/folds, and recurring events. Keep elapsed time derived from absolute instants.
4. **P1 — Platform adapters:** retain the consumed web notification/lifecycle adapters and implement native adapters only in the approved prototype; add consumed ICS/device calendar and file open/share interfaces when those flows are converted.
5. **P1 — Navigation and UI:** define back/history behavior; perform the specified viewport/rendered screenshot audit and accessibility review; test touch widget reorder and alternatives.
6. **P1 — AI:** move orchestration out of `App.tsx`; version/validate tool schemas; add durable idempotency and post-save readback before success; define interruption/resume behavior and server outage recovery.
7. **P2 — Native proof:** create a separate approved prototype milestone (not part of this initiative) to test Capacitor calendar permission, suspended notifications, lifecycle, sharing, VoiceOver, and store signing/distribution.
8. **P2 — Decision:** confirm or reverse the Capacitor choice after device proof against agreed performance/accessibility criteria and ownership/maintenance expectations.

## Phase 9 verification and handoff

- Production build: `npm run build` passed. Tests: `npm test` passed, 133 tests, including storage, lifecycle and notification adapters, services, migration, and Clock tests. No dependency was added.
- Migration tests: schema 10 records retain task/event/calendar/project/capture/time-entry IDs and relations; legacy sample-ID collisions preserve dates and calendar names; primary web storage uses the existing key and round trips.
- Application-service tests cover task create/update, goal rename relationship propagation, task completion timestamp, event calendar validation and duplicate prevention. Storage tests confirm existing auxiliary keys round-trip and malformed values are not deleted. Notification adapter test confirms unsupported-runtime behavior. Clock arithmetic test covers elapsed time after a long pause independent of interval ticks.
- Key/value adapter test verifies raw string preference format and removal semantics. Lifecycle test verifies refresh signals only on visible/focus and that listeners unsubscribe cleanly.
- Existing tests include local AI action validation and AI event creation/reload/calendar visibility, recurrence, all-day date behavior, imported timezone conversion, task/project/goal rules, and time-entry finalization. They are pure Node tests, not full UI/server/device integration.
- Responsive evidence: live browser preview inspected at 320px and width measurements collected for all four destinations at 375, 390, 430, 768, and 1280 CSS px; no horizontal document overflow observed. Screenshots were transient session captures, not saved test artifacts. Keyboard, accessibility, interaction-state, and device checks remain incomplete.
- Not verified: actual existing browser profile contents, AI network endpoint availability, AI event via real deployed AI interaction, active Clock through a browser close/reopen, iOS lifecycle, notifications while suspended, device calendar, file sharing, App Store signing/distribution.
- Approval decisions before conversion: confirm storage/privacy/back-up product policy for a native database; decide native notification reliability and permission UX; validate the Capacitor recommendation in the native proof milestone. No authentication, cloud sync, new backend, or model provider change is proposed.

## What to do to start iOS development

This is the practical kickoff list after the current web-readiness work. Native conversion remains a separate milestone; this repository still contains no Xcode project and no native dependencies.

1. **Provide a Mac build environment.** Install a supported Xcode version and its iOS simulator runtimes; verify an iPhone simulator launches. Windows can continue web work, but native iOS build, signing, and device validation require access to macOS/Xcode.
2. **Set up Apple development access.** Sign in with the Apple ID/team that will own the app. Enroll in the Apple Developer Program when device distribution, TestFlight, or App Store release requires it. Decide who owns signing certificates, identifiers, and App Store Connect access.
3. **Approve the prototype scope.** Start with a separate Capacitor proof of concept, subject to the recommendation above. Prioritize a real-device vertical slice for safe-area/keyboard, foreground Clock restoration, calendar permission/read/write, local reminder delivery while suspended, and file sharing. Compare results with agreed performance and accessibility requirements before authorizing full conversion.
4. **Choose product policies before moving user data.** Decide backup/export and recovery behavior, what native database can replace localStorage, how schema upgrades/rollback work, and whether users may have multiple devices. This work does not authorize cloud sync or a new backend.
5. **Resolve API deployment/origin behavior.** Keep `OPENAI_API_KEY` server-side. Confirm the deployed Vercel API endpoint is intended for the native app, then design and review the API origin/CORS policy for the Capacitor WebView. Do not put provider secrets in the app bundle or client configuration. The static GitHub Pages site does not host the serverless AI handler.
6. **Prepare native capability decisions.** Define permission explanations and denial/revocation behavior for device calendars and notifications; decide reminder scheduling expectations; determine whether calendar access is read-only or read/write; document file import/export and share-sheet formats. Secure credential storage is not currently needed by client logic.
7. **Complete the remaining portability foundations.** Consolidate remaining state mutations and AI orchestration out of `App.tsx`; route auxiliary persistence through repositories; add durable AI idempotency/readback; finish DST and persisted Clock reload tests; define navigation/back behavior; archive rendered browser screenshots and complete keyboard/accessibility/touch audits.
8. **Build and test the native prototype on devices.** Exercise supported iOS versions and real iPhones/iPads, including permission prompts, suspended notifications, app termination/relaunch, offline/network failure, VoiceOver, text enlargement, keyboard, and data migration. Simulator or desktop browser results alone are not proof of device behavior.
9. **Before distribution, prepare store ownership and review materials.** Set the final bundle identifier, signing team, privacy policy/support contact, data-use disclosures, app icon/screenshots/metadata, and TestFlight review plan. Confirm all applicable Apple requirements at that time; they can change.

### Current readiness blockers

- No Mac/Xcode/native project or real-device evidence is present in this workspace.
- No device-calendar, native notification scheduling, native lifecycle, file-share, or native persistence adapters exist. The web lifecycle and notification interfaces are only foundations.
- Clock's arithmetic is tested, but browser close/reopen integration and iOS termination/resume are not.
- Existing schema migration and 133 unit tests do not replace fixtures from actual user backups, a rollback plan, or native-store migration tests.
- `App.tsx` remains a large coordinator; task updates and several other AI/domain mutations still bypass authoritative use cases. Backup/restore also retains browser `Storage` coupling.
- The current web responsive review found and addressed several narrow-screen issues but did not finish interaction/accessibility validation; screenshot images were not persisted.
- Native API origin policy for the separately hosted AI service needs explicit review before the wrapper calls it.

The pre-Xcode route, beta scope, Apple account choice, data handling, AI beta gate, and concrete next action are recorded in [docs/ios-beta-preflight.md](ios-beta-preflight.md). The next user action is Apple Developer Program enrollment; do not create the Xcode project until the preflight gates are assigned and met.
