# Architecture — CelebConnect

This document explains how all the pieces of CelebConnect connect and work together.

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Phone                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           CelebConnect (React Native / Expo)        │   │
│  │                                                     │   │
│  │  AuthContext ◄──► authService ──────────────────┐  │   │
│  │  EventContext ◄─► backendSync ──────────────────┤  │   │
│  │  Screens / Components                           │  │   │
│  │  expo-notifications (local reminders)           │  │   │
│  │  expo-secure-store (JWT token)                  │  │   │
│  └─────────────────────────────────────────────────┘   │   │
│                         │ HTTPS                          │   │
└─────────────────────────┼───────────────────────────────┘   
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Railway Cloud (Backend)                        │
│                                                             │
│  ┌─────────────────────────────────┐                       │
│  │     Node.js / Express (server.js)│                      │
│  │                                 │                       │
│  │  /api/auth/*  ── auth.js        │                       │
│  │  /api/events  ── store.js       │                       │
│  │  /api/health  ── inline         │                       │
│  │  scheduler.js ── node-cron      │                       │
│  └───────────────┬─────────────────┘                       │
│                  │                                          │
│  ┌───────────────▼─────────────────┐                       │
│  │     PostgreSQL (Railway)        │                       │
│  │  • events table (id, data JSONB)│                       │
│  │  • users table  (id, email, ...) │                      │
│  └─────────────────────────────────┘                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Meta / WhatsApp Business Cloud API             │
│  Receives message + phone number → delivers WhatsApp msg   │
└─────────────────────────────────────────────────────────────┘
```

---

## Mobile App

**Framework:** React Native with Expo SDK 54

### Navigation

`AppNavigator` (in `src/navigation/`) handles two states:

- **Unauthenticated:** Stack navigator with Login → Register → ForgotPassword
- **Authenticated:** Bottom tab navigator with Home, Calendar, Account tabs; Add/Edit event in a stack on top

### State Management

Two React Contexts manage global state:

**AuthContext** (`src/context/AuthContext.tsx`)
- Holds the current user object and JWT token
- On app start, restores the session from `expo-secure-store`
- If a stored token exists, validates it with `GET /api/auth/me`; falls back to cached user on network failure
- Exposes `login()`, `register()`, `logout()`, `forgotPassword()`, `updateProfile()`

**EventContext** (`src/context/EventContext.tsx`)
- Holds the list of events
- Syncs creates/updates/deletes to the backend via `backendSync.ts`
- Falls back gracefully if the backend is unreachable (events remain local)

### Services

| File | Purpose |
|------|---------|
| `authService.ts` | Wraps all `/api/auth/*` calls; throws typed `AuthError` with HTTP status |
| `backendSync.ts` | Syncs events to `/api/events`; handles offline gracefully |
| `notifications.ts` | Schedules and cancels local push notifications via expo-notifications |
| `messaging.ts` | Opens WhatsApp / Instagram via deep links |

### Persistent Storage

| Data | Storage |
|------|---------|
| JWT token | `expo-secure-store` (iOS Keychain / Android Keystore) |
| Profile photo | `expo-file-system` (copied to app documents directory) |
| Events | Backend PostgreSQL + local React state |

---

## Backend

**Runtime:** Node.js 18+  
**Framework:** Express.js  
**Deployed on:** Railway (auto-deploys from `main` branch)

### Modules

| File | Role |
|------|------|
| `server.js` | Entry point — mounts routes, initialises DB, starts scheduler |
| `auth.js` | JWT auth: register, login, `/me`, profile update |
| `store.js` | Dual-mode event store (PostgreSQL when `DATABASE_URL` set, JSON file otherwise) |
| `db.js` | PostgreSQL connection pool via `pg` |
| `scheduler.js` | `node-cron` job that runs at 9:00 AM daily |
| `whatsapp.js` | WhatsApp Business Cloud API client (axios) |
| `seed.js` | Populates DB with test data |

### Authentication Flow

```
Mobile app                          Backend
   │                                   │
   │── POST /api/auth/register ────────►│ hash password (bcrypt, 12 rounds)
   │                                   │ store user in PostgreSQL / memory
   │◄─ { token, user } ────────────────│ sign JWT (AUTH_JWT_SECRET, 7d expiry)
   │                                   │
   │── GET /api/auth/me ──────────────►│ verify JWT
   │   Authorization: Bearer <token>   │ look up user by ID
   │◄─ { user } ───────────────────────│
```

### Daily WhatsApp Scheduler

```
9:00 AM (server local time)
   │
   ├── getEventsForToday(today)
   │     ├── exact date matches from DB
   │     └── recurring events (yearly/monthly/weekly) matching today's date
   │
   └── for each event with whatsappEnabled:
         └── for each contact with phone number:
               ├── fill {name} placeholder in message template
               ├── enrich yearly events with ordinal year (e.g. "3rd Birthday")
               └── POST to WhatsApp Business Cloud API
```

### Database Schema

```sql
-- Events
CREATE TABLE events (
  id   TEXT PRIMARY KEY,
  data JSONB NOT NULL        -- Full event object stored as JSON
);

-- Users
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`) runs on every push to `main`:

1. **Backend Tests** — Jest tests for scheduler logic, store CRUD, and auth routes
2. **Frontend Tests** — Jest + React Native Testing Library for screens and utilities
3. **TypeScript Check** — `tsc --noEmit` to catch type errors

**Railway** auto-deploys the backend whenever `main` is pushed to GitHub.

**EAS** (Expo Application Services) builds production iOS and Android binaries on demand:
```bash
eas build --platform all --profile production
eas submit --platform ios
eas submit --platform android
```

---

## Data Flow: Creating an Event

```
User fills Add Event form
   │
   ▼
EventContext.addEvent(event)
   ├── updates local React state (instant UI feedback)
   ├── schedules local push notification (expo-notifications)
   └── backendSync.syncEvent(event)
         └── POST /api/events  ──► store.upsertEvent(event)
                                       └── PostgreSQL INSERT/UPDATE
```

## Data Flow: Auto-sending WhatsApp on a Birthday

```
9:00 AM cron fires
   │
   ▼
scheduler.sendTodaysMessages()
   ├── getEventsForDate(today)    ← exact date matches
   ├── readAll() + filter         ← recurring events matching today
   │
   └── for each matching event:
         whatsapp.sendWhatsAppMessage(phone, message)
            └── POST https://graph.facebook.com/v18.0/{phoneId}/messages
                  Authorization: Bearer WHATSAPP_ACCESS_TOKEN
```
