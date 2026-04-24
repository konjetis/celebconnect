# Testing — CelebConnect

This document describes how to run and understand the test suite.

---

## Test Structure

```
CelebConnect/
├── src/
│   └── __tests__/
│       ├── context/
│       │   ├── authReducer.test.ts       # Auth state reducer logic
│       │   ├── eventReducer.test.ts      # Event state reducer logic
│       │   └── EventContext.test.tsx     # EventContext hook behaviour
│       ├── screens/
│       │   ├── HomeScreen.test.tsx       # Home screen rendering & data
│       │   └── CalendarScreen.test.tsx   # Calendar screen rendering
│       └── utils/
│           └── helpers.test.ts           # Date/string utility functions
└── backend/
    └── __tests__/
        ├── scheduler.test.js             # Recurring event matching logic
        ├── store.test.js                 # File-based event store CRUD
        └── auth.test.js                  # Auth routes (register/login/me)
```

---

## Running Tests

### Frontend (React Native / Jest)

```bash
# From the CelebConnect root
npm test                  # Run all tests in watch mode
npm test -- --watchAll=false   # Run once (CI mode)
npm run test:coverage     # Run with coverage report
```

Coverage report is written to `coverage/lcov-report/index.html`.

### Backend (Node.js / Jest + supertest)

```bash
cd backend
npm install               # Install jest and supertest (devDependencies)
npm test                  # Run all backend tests
npm run test:coverage     # Run with coverage report
```

Backend tests run in Node environment with no database required — the file store is used automatically.

---

## What Is Tested

### Frontend unit tests

| File | What it tests |
|------|--------------|
| `authReducer.test.ts` | Login, logout, token restore, profile update actions |
| `eventReducer.test.ts` | Add, edit, delete, and load event state transitions |
| `EventContext.test.tsx` | Context provider exposes correct state and dispatch |
| `HomeScreen.test.tsx` | Renders upcoming events, empty state, loading spinner |
| `CalendarScreen.test.tsx` | Renders calendar grid, marks event dates |
| `helpers.test.ts` | `formatDate`, `daysUntil`, `getInitials`, and other utilities |

### Backend unit tests

| File | What it tests |
|------|--------------|
| `scheduler.test.js` | `recurringEventMatchesToday` — yearly, monthly, weekly logic including edge cases |
| `store.test.js` | `upsertEvent`, `readAll`, `removeEvent`, `getEventsForDate` against file store |
| `auth.test.js` | Register, login, `/me` endpoint — success and failure cases via supertest |

---

## CI

GitHub Actions runs the full test suite on every push to `main` and on every pull request. See `.github/workflows/ci.yml`.

Three jobs run in parallel:
- **Backend Tests** — `npm test` in the `backend/` directory
- **Frontend Tests** — `npm test -- --watchAll=false` in the root
- **TypeScript Check** — `tsc --noEmit` to catch type errors

---

## Seed Data for Manual Testing

To populate the app with realistic test data:

```bash
cd backend
node seed.js
```

This creates 5 sample events (birthdays, an anniversary, a weekly recurring event) and two test user accounts:

| Email | Password | Notes |
|-------|----------|-------|
| `test@celebconnect.app` | `TestPass123!` | Primary test account |
| `reviewer@celebconnect.app` | `ReviewCelebConnect2026!` | App Store reviewer account |

---

## Coverage Targets

| Layer | Current | Target |
|-------|---------|--------|
| Frontend utilities | ~80% | 90% |
| Frontend context/reducers | ~65% | 80% |
| Backend scheduler logic | ~95% | 95% |
| Backend store | ~90% | 90% |
| Backend auth routes | ~85% | 85% |
