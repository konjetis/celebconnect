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
│  ┌───────────────▼──────────────────────────┐              │
│  │     PostgreSQL (Railway)                 │              │
│  │  • events table (id, data JSONB, user_id)│              │
│  │  • users table  (id, data JSONB)         │              │
│  └──────────────────────────────────────────┘              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Expo Push Notification Service              │
│   Delivers the reminder to the OWNER's device only          │
└──────────────────────────┬──────────────────────────────────┘
                           │  user taps
                           ▼
┌─────────────────────────────────────────────────────────────┐
│        WhatsApp on the user's phone (deep link)             │
│  Opens with recipient + message pre-filled. User hits Send. │
└─────────────────────────────────────────────────────────────┘
```

**The backend never sends a message to a contact.** It notifies the event's owner,
and the owner sends from their own WhatsApp. See "Why not auto-send?" below.

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
| `scheduler.js` | `node-cron` job that runs at 9:00 AM daily and pushes reminders to owners |
| `instagram.js` | Instagram Business Login OAuth + one-time code exchange |
| `email.js` / `sms.js` | Password reset delivery (Resend / Twilio) |
| `whatsapp.js` | Legacy WhatsApp Business Cloud API client. **Not wired into the scheduler** — kept for reference only. See "Why not auto-send?" |
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

### Daily Reminder Scheduler

```
9:00 AM (server local time)
   │
   ├── readAllForScheduler()      ← every OWNED event, tagged with its userId
   ├── keep events where date === today OR recurrence matches today
   ├── build Map(userId → expoPushToken)
   │
   └── for each event with whatsappEnabled:
         ├── look up the OWNER's push token — skip if they have no device
         └── for each contact with a phone number:
               ├── fill {name} placeholder in message template
               ├── enrich yearly events with ordinal year (e.g. "3rd Birthday")
               └── push ONE notification to the owner's device only
                     payload: { waPhone, message, eventId, eventTitle }
```

⚠️ **Invariant:** a notification payload contains a contact's real phone number.
It must only ever be addressed to `tokenById.get(event.userId)`. Never iterate
over all tokens. `backend/__tests__/scheduler.test.js` has regression tests for
this — an earlier version broadcast every event to every registered device.

### Why not auto-send?

Two independent blockers, either one fatal:

1. **iOS forbids it.** No third-party app can dispatch a WhatsApp message without
   user interaction. Every app that genuinely auto-sends is Android-only.
2. **Meta's Business Messaging Policy forbids it.** The WhatsApp Business Cloud
   API requires documented prior opt-in from each recipient. Using it to send
   personal greetings is unsolicited messaging and gets the sending number
   restricted or permanently disabled.

The push → one-tap design sidesteps both, and produces a better result anyway:
the message arrives from the user's own number rather than a business account.

### Database Schema

```sql
-- Events
CREATE TABLE events (
  id      TEXT PRIMARY KEY,
  data    JSONB NOT NULL,     -- Full event object stored as JSON
  user_id TEXT                -- Owner. Rows with NULL are legacy and hidden.
);
CREATE INDEX events_user_id_idx ON events (user_id);

-- Users
CREATE TABLE users (
  id   TEXT PRIMARY KEY,
  data JSONB NOT NULL         -- Full user object (email, phone, passwordHash,
);                            -- instagramId, expoPushToken, profilePhoto, ...)
```

**`user_id` is the security boundary.** Every `store.js` function takes a
`userId` and filters on it; there is no unscoped read available to a request
handler. The only unscoped reader is `readAllForScheduler()`, which is used by
the cron job and returns each event tagged with its owner.

#### Migration note (pre-1.0 → 1.0)

`initDb()` adds `user_id` with `ADD COLUMN IF NOT EXISTS` on every boot. Events
created before this column existed have `user_id = NULL` and are invisible to
every user and to the scheduler — deliberately fail-closed. To claim them, set
`ADOPT_ORPHAN_EVENTS_USER_ID` to the owning user id and restart once; the
startup log reports how many rows were adopted. Then remove the variable.

---

## CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`) runs on every push to `main`:

1. **Backend Tests** — Jest tests for scheduler logic, store CRUD, auth routes, and cross-user isolation
2. **Frontend Tests** — Jest + React Native Testing Library for screens and utilities
3. **TypeScript Check** — `npm run typecheck` (`tsc --noEmit`)
4. **ESLint** — `npm run lint` across app and backend

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
   └── backendSync.syncEventToBackend(event)
         ├── reads JWT from SecureStore — no-ops if signed out
         └── POST /api/events   Authorization: Bearer <jwt>
               └── requireAuth → store.upsertEvent(event, req.user.id)
                     └── PostgreSQL INSERT/UPDATE ... WHERE user_id = $3
```

## Data Flow: Reminding the user on a birthday

```
9:00 AM cron fires
   │
   ▼
scheduler.sendTodaysMessages()
   ├── readAllForScheduler()      ← all owned events, each tagged with userId
   ├── filter to today (exact date OR recurrence match)
   ├── Map(userId → expoPushToken) from getAllUsers()
   │
   └── for each matching event, for each contact with a phone:
         POST https://exp.host/--/api/v2/push/send
           to:   tokenById.get(event.userId)      ← OWNER ONLY
           data: { waPhone, message, eventId, eventTitle }
   │
   ▼
User taps the notification
   │
   ▼
App.tsx addNotificationResponseReceivedListener
   └── Linking.openURL('whatsapp://send?phone=…&text=…')
         └── falls back to https://wa.me/… if WhatsApp isn't installed
   │
   ▼
User taps Send inside WhatsApp — message goes from their own number
```
