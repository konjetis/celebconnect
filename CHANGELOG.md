# Changelog

All notable changes to CelebConnect are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-08-04

### Security

- **Event API now requires authentication and is scoped per user.** `GET`, `POST`
  and `DELETE /api/events` previously had no auth and operated on a single global
  event collection, so any caller could read every user's events (including
  contact names and phone numbers), overwrite any event by reusing its id, or
  delete any event. All three routes now require a JWT and only ever touch rows
  owned by the token holder. A client-supplied `userId` is ignored.
- **Scheduler no longer broadcasts reminders to every device.** It collected push
  tokens from all users and sent each event's notification to all of them —
  meaning one user's contact's phone number was delivered to every other user's
  phone. Each event is now pushed only to its owner's device.
- `POST /api/send-now` is authenticated and scoped to the caller.
- Added `user_id` to the events table, with an index and an automatic
  `ADD COLUMN IF NOT EXISTS` migration on boot. Pre-migration rows are hidden
  from everyone until claimed via `ADOPT_ORPHAN_EVENTS_USER_ID` (fail-closed).
- Added regression tests for all of the above: 11 API-level isolation tests in
  `backend/__tests__/events.api.test.js`, plus store- and scheduler-level tests.
- The mobile app now sends its JWT with every event sync request.

### Fixed

- Instagram login was broken end to end: the backend redirects to
  `celebconnect://instagram-callback?code=…` but the app read `?token=`, so
  cold-start Instagram sign-in silently did nothing. The app now exchanges the
  one-time code via `authService.exchangeInstagramCode()`.
- Fixed a TypeScript compile error in `AppNavigator.tsx` (`loginWithInstagram`
  called with one argument) that was failing CI.
- Removed unused `READ_CALENDAR` / `WRITE_CALENDAR` permissions and the
  `NSCalendarsUsageDescription` string — the app has no calendar integration and
  both stores flag unused sensitive permissions.
- Added the missing `NSPhotoLibraryUsageDescription`, which `AccountScreen`
  requires for profile photo upload.
- De-duplicated `LSApplicationQueriesSchemes` in `app.json`.
- Fixed a latent timezone bug in the scheduler tests that built "today" in UTC
  while the scheduler uses local time.

### Changed

- **Store listing, README, Terms and Privacy Policy no longer claim "auto-send".**
  The app moved to push-notification → one-tap sending; the marketing copy hadn't
  caught up, which risks rejection under App Store Guideline 2.3.1. Documented
  why auto-send is neither possible on iOS nor permitted by Meta's Business
  Messaging Policy.
- Privacy Policy now discloses Instagram OAuth data collection, Cloudinary,
  Resend, Twilio, and the Expo push service; added an App Store Connect privacy
  questionnaire crib sheet to `APP_STORE_METADATA.md`.
- `backend/.env.example` now documents all 21 environment variables the code
  reads (was 10).
- Added an ESLint config so `npm run lint` works, added `npm run typecheck`, and
  added a lint job to CI.
- Untracked the generated `coverage/` directory and `.DS_Store` files.

---

## [0.9.0] — 2026-04-23

### Added

**Mobile app**
- Login, Register, and Forgot Password screens with real JWT authentication
- Home dashboard showing upcoming events with days-until countdown
- Calendar view with monthly grid and event indicators
- Add/Edit event screen with recurrence support (yearly, monthly, weekly, one-time)
- Account screen with profile editing and persistent photo upload (expo-file-system)
- WhatsApp deep-link integration — pre-filled messages open WhatsApp directly
- Instagram profile deep-link — tap to open any contact's Instagram instantly
- Local push notifications — reminders 1–7 days before events
- Offline support — events and notifications work without internet
- Shared UI components: Button, Card, LoadingSpinner, EmptyState
- Custom hooks: useForm, useAsync, useDebounce

**Backend**
- Express.js REST API deployed on Railway
- JWT authentication with bcrypt password hashing (12 rounds)
- PostgreSQL event store with JSON fallback for local development
- Daily WhatsApp scheduler (node-cron) — fires at configurable time each morning
- Recurring event engine — supports yearly, monthly, and weekly patterns
- Ordinal year enrichment — e.g. "Happy 3rd Birthday!" for yearly events
- Health check endpoint (`GET /api/health`)
- Manual send trigger (`POST /api/send-now`) for testing
- Seed script for test data (`node seed.js`)
- Backend unit tests (Jest + supertest)

**Infrastructure & tooling**
- EAS build configuration for iOS and Android production builds
- GitHub Actions CI — runs backend tests, frontend tests, and TypeScript check on every push
- App icons, splash screen, adaptive icon, and favicon (1024×1024 brand assets)
- Privacy Policy, Terms of Service, and App Store metadata documents
- Architecture overview (ARCHITECTURE.md)

### Security
- backend/.env excluded from version control via .gitignore
- Database credentials rotated before first commit
- Passwords stored as bcrypt hashes, never in plain text
- JWT tokens stored in iOS Keychain / Android Keystore via expo-secure-store
- All API traffic over HTTPS
