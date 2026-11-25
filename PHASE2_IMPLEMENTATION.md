# ORDER Phase 2 implementation notes

## Audit and plan

ORDER is a Vite + React + TypeScript app. `src/App.tsx` owns the app shell, localStorage persistence, task and event editing, calendar views, and the server-backed AI action handler. `src/types.ts` is the shared model layer; `src/eventStore.ts` and `src/eventActions.ts` already keep recurring calendar behavior out of the UI. Phase 1 capture/inbox code is already present in this worktree as uncommitted work and is preserved.

Existing task records already include optional goals, projects, calendar links, event links, subtasks, dependencies, notes, priority, duration, date/time, and completion. The main data issue was one `date` value serving both deadline and calendar placement. Calendar metadata only had name, color, visibility, and default status. The server-side assistant endpoint is real and uses `OPENAI_API_KEY`; `organizeCapture` remains deterministic local suggestions and is not a substitute for that endpoint. The app has no database server; persistent app data is browser localStorage.

Implementation plan: add explicit task dates and normalized status with a migration; keep the existing quick-add and task/calendar sheets, extending optional details; add reusable task/calendar rules; persist calendar purpose and labels; apply global mobile control sizing and safe areas; add focused domain tests.

## Implemented

- Tasks now carry due date, scheduled work date, scheduled start time, status, timestamps, tags, reminder time, recurrence, and existing optional relationships.
- Schema version 8 migrates old task dates to due dates and retains calendar placement only where the legacy task was shown on the calendar.
- Quick task editing exposes distinct deadline and schedule fields plus workflow, project, tags, reminder, notes, and existing goal/calendar/subtask controls.
- Calendar month and agenda task entries use scheduled work date. Home urgency continues to use deadline.
- AI task creation/update paths accept separate due and scheduled fields. Inbox event suggestions use calendar name/label/purpose matching and keep the selected calendar editable in the organization preview.
- Calendar metadata supports built-in and custom labels and a freeform purpose. These fields do not rewrite event records.
- `src/taskDomain.ts` contains portable task normalization, completion/reopen, calendar selection, and actual-data workload calculations.
- iPhone form font sizes are raised to 16px on mobile for text, select, date/time and editable controls. The viewport remains user-zoomable and adds `viewport-fit=cover`; sheets use safe areas and bounded scrolling.

## Verification gaps

Automated build and unit tests run locally. A browser is not available to the UI automation session, and no iPhone device or configured live AI credentials were used. Therefore visual layout, keyboard overlap, real Safari zoom behavior, live model interpretation, notification delivery, and full manual CRUD/refresh flows remain unverified. The existing architecture has no cross-device sync or server database.

The existing `App.tsx` remains a large component. Phase 2 changes avoid a major rewrite; future work can move its store and action handling into dedicated modules incrementally.
