# ORDER Phase 1: follow-up verification

Use this checklist when browser automation, a deployed AI endpoint, and mobile devices are available. Do not mark items complete until they have been performed.

## Automated checks completed locally

- [x] TypeScript production build (`npm run build`)
- [x] Existing calendar, event, ICS, and recurrence tests (`npm test`)
- [x] Capture suggestion association: source preservation, multiple suggestions, id-less matching, and fail-closed behavior
- [x] Whitespace validation (`git diff --check`)

## Still to test in the app

- [ ] Capture a task, thought, note, idea, multiline text, and long text; confirm one save per submit
- [ ] Navigate away and refresh; confirm capture text, edits, states, and AI review preview remain
- [ ] Edit and delete a capture; verify both actions update the Inbox correctly
- [ ] Convert captures to task, event, goal, and note; verify created entities and source links
- [ ] Select multiple entries; test bulk archive, delete, and organization
- [ ] Use real ORDER AI to organize a single capture and a multi-item capture; inspect dates, types, and goal links
- [ ] Exercise missing `OPENAI_API_KEY`, network failure, invalid JSON, and retry; verify source captures remain untouched
- [ ] Remove/edit suggestions, dismiss review, refresh during review, and approve; verify no unexpected entity changes
- [ ] Test capture open/close, keyboard submit, and keyboard overlap on desktop and narrow mobile screens
- [ ] Confirm Calendar and Goals quick capture entry points and existing task, calendar, goal, and stopwatch workflows

## Infrastructure boundary

AI organization uses the existing Vercel assistant endpoint and needs its configured `OPENAI_API_KEY`. Capture storage uses the app's existing browser `localStorage`; it does not sync across browsers or devices.
