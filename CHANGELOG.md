# Changelog

All notable changes to CelebConnect are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-04-23

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
