# ORDER iOS beta preflight decision

Decision date: 2026-11-25

## Decision

**Use Capacitor for ORDER's first iOS prototype and internal TestFlight beta.** Keep the existing React/Vite UI in a locally bundled WKWebView and reuse the current TypeScript domain and application services. Do not use React Native/Expo for this first effort: it would replace most of ORDER's DOM/CSS UI before there is evidence that native UI is needed.

This is a scoped prototype decision, not a commitment to ship the final app in a WebView. Reconsider only if device tests show unacceptable VoiceOver/accessibility, performance, keyboard/navigation behavior, or native capability limits that cannot be corrected with focused native adapters.

## Beta scope

Keep the four destinations and existing product behavior: Home with the AI command bar first and customizable widgets, Calendar, Tasks, and Clock. Make a private/invited TestFlight beta, not a public App Store release.

The first beta must prove these flows on real hardware:

1. Install, launch, suspend, terminate, and reopen; local records and widget preferences persist.
2. Import a user-selected ORDER backup, preserve stable IDs and relationships, and export it again. Do not attempt to copy Safari/browser storage automatically: Capacitor's default iOS origin is `capacitor://localhost`, distinct from the deployed web origin.
3. Start a Clock entry, background or terminate the app, reopen, see elapsed time recomputed from its saved timestamp, and stop with correct start/end instants.
4. Request notification permission only when the user enables reminders; schedule/cancel a local test reminder and verify delivery while the app is suspended. Denial must leave in-app reminders usable and must not claim background delivery.
5. In a dedicated test calendar, demonstrate explicit device-calendar read/write and permission denial/revocation. This is a capability spike; it does not imply continuous two-way synchronization or silently changing the user's app-calendar assignments.
6. Check 320–430px layouts, keyboard/safe areas, text enlargement, VoiceOver, touch widget reorder and its Move Up/Move Down alternative.

Do not add cloud sync, authentication, a new backend, or provider secrets to the app. Keep the existing AI provider call on the server. **AI is a beta gate:** before enabling it for TestFlight, verify the Vercel endpoint's origin behavior for the Capacitor WebView and confirm distributed rate limiting/usage controls. CORS is not authentication; the current server accepts requests with no `Origin`, and the rate limiter can fall back to in-memory per-instance limits if Upstash is not configured. If those controls are not confirmed, ship the beta with remote AI disabled and keep local app flows testable.

## Data decision

For the first prototype, retain `order-prototype-v1` and the existing web persistence adapter inside the app's WKWebView. It is the smallest way to verify local persistence without introducing an unproven database or rewriting bootstrap. New installs have an app-local store; existing web data enters only through an explicit, validated backup import.

ORDER's backup allowlist was incomplete. This preflight adds Home default tab, tab order, widget list, widget layout v2/v3, and reschedule history. The raw Home default-tab value remains an unquoted string during export/restore; JSON-backed preferences remain JSON. Tests cover a representative export/restore round trip. This improves web backup portability but is not yet an iOS-device migration test. Keep backup versioning and rollback tests as beta acceptance gates.

After the prototype, decide whether to keep WKWebView localStorage or move to native storage based on real record volume, reliability, and backup behavior. No database plugin is selected yet.

## Deployment decision

Continue using the existing Vercel AI handler; do not deploy a second backend as part of the beta setup. Before native AI calls, perform a narrowly scoped server review: allowed Capacitor origin, no-origin behavior, distributed rate limit availability, per-minute and overall cost caps, and failure UX. Never add `OPENAI_API_KEY` to Xcode build settings, `Info.plist`, JavaScript, or app assets. Current handler source allows the two website origins and does not yet allowlist `capacitor://localhost`.

## Sequence

1. **Next user action: enroll in the Apple Developer Program** using the Apple Account that should own ORDER's membership. Enable two-factor authentication first. Apple lists a $99 USD annual membership (regional pricing may differ); membership enables TestFlight distribution. [Apple enrollment](https://developer.apple.com/programs/enroll/) · [Apple enrollment requirements](https://developer.apple.com/help/account/membership/program-enrollment/).
2. Choose the correct seller identity before enrollment. Enroll as an **individual** if ORDER is personally owned and a personal legal name as the App Store seller is acceptable. Enroll as an **organization** only if a verified legal entity should own/publish ORDER; Apple requires a legal entity and D‑U‑N‑S number, and a DBA/trade name is not sufficient. [Apple D‑U‑N‑S guidance](https://developer.apple.com/help/account/membership/D-U-N-S/).
3. Once membership is active, arrange access to a Mac that can run a current Xcode release and the supported iOS Simulator. The present Windows environment can continue web development but cannot build/sign/run the iOS target.
4. Before creating the Xcode project, complete the remaining beta gates: backup/import tests against a real user export, API abuse/cost controls, an explicit calendar/notification plugin choice, and visual/accessibility browser checks. Record supported iOS versions and a device test matrix.
5. Only then add Capacitor and the iOS platform in a separate native-conversion milestone. Bundle web assets locally; do not use a remote hosted website as the app shell. Configure app identity/signing under the enrolled Apple team and run the beta acceptance flows above on physical devices.
6. Start TestFlight only after device proof and data/API gates pass. Invite a small internal cohort, collect crash and usability evidence, and keep App Store release out of scope until the beta exit criteria pass.

## Apple account preparation

Have ready the Apple Account, current legal contact/name/address/phone, two-factor authentication, and payment method. For organization enrollment, also have the exact legal entity name, D‑U‑N‑S record, public organization website, and authority to accept Apple's agreements. Do not send passwords, recovery codes, certificates, or private keys in chat. The account holder should retain them and add collaborators through Apple team roles later.

## Evidence and open gates

- Repository fit is confirmed: React 18 + Vite, React DOM/CSS, static asset build, and existing domain logic; no Capacitor/Expo dependencies or native project exist.
- Apple enrollment and Capacitor requirements are linked above and were checked on the decision date. Recheck Apple's membership terms and Capacitor's supported Xcode/iOS matrix when arranging the Mac.
- Web suite and production build passed after the current portability changes: 133 tests, 0 failures; `npm run build` succeeds.
- No actual iPhone, Xcode, TestFlight, native calendar, suspended notification, native persistence, or native VoiceOver test has occurred. This decision does not award an iOS-readiness verdict.
- Do not proceed to Xcode until the Apple membership is active and the gates in Sequence step 4 have an owner and acceptance criteria.
