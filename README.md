# 🎉 CelebConnect

> Never miss a birthday or anniversary. Write the message once; CelebConnect nudges you on the day and sends it from your own WhatsApp in a single tap.

[![CI](https://github.com/konjetis/celebconnect/actions/workflows/ci.yml/badge.svg)](https://github.com/konjetis/celebconnect/actions/workflows/ci.yml)

---

## What It Does

- Add birthdays, anniversaries, and custom events once
- Write a personalised message template per person, with `{name}` placeholders
- Get a push notification at your chosen time on the day — tap it once and WhatsApp opens with the message already written, ready to send
- Send to saved WhatsApp groups, not just individuals
- Set reminders 1–7 days before events so you're never caught off-guard
- Open Instagram profiles instantly to post a story or DM
- Works offline — events and local notifications work without internet

### A note on "auto-send"

CelebConnect deliberately does **not** send messages on your behalf. Two reasons:

1. **iOS won't allow it.** No third-party app can send a WhatsApp message without user interaction. Any app claiming otherwise is Android-only.
2. **Meta's Business Messaging Policy forbids it.** The WhatsApp Business API requires explicit prior opt-in from every recipient. Blasting personal greetings through it gets the sending number restricted or permanently disabled.

So the last step is always yours: one tap. The message arrives from your personal number, which is what the recipient wants anyway.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile app | React Native (Expo SDK 54) |
| Backend | Node.js + Express |
| Database | PostgreSQL (Railway) |
| Reminders | Expo Push Notifications → WhatsApp deep link |
| Auth | JWT + bcrypt |
| Build & Submit | EAS (Expo Application Services) |
| Hosting | Railway |

---

## Project Structure

```
CelebConnect/
├── App.tsx                        # Root component
├── app.json                       # Expo config (EAS project ID, permissions)
├── eas.json                       # EAS build profiles
├── src/
│   ├── screens/
│   │   ├── auth/                  # Login, Register, ForgotPassword
│   │   ├── home/                  # Home dashboard with upcoming events
│   │   ├── calendar/              # Calendar view + Add/Edit event
│   │   └── account/              # Profile management + photo
│   ├── components/                # Button, Card, LoadingSpinner, EmptyState
│   ├── hooks/                     # useForm, useAsync, useDebounce
│   ├── navigation/                # AppNavigator (Stack + Bottom Tabs)
│   ├── context/                   # AuthContext, EventContext
│   ├── services/                  # authService, backendSync
│   ├── utils/                     # theme, helpers, notifications, messaging
│   └── types/                     # Shared TypeScript types
├── backend/
│   ├── server.js                  # Express app entry point
│   ├── auth.js                    # JWT auth routes (/register, /login, /me)
│   ├── scheduler.js               # Daily WhatsApp cron job
│   ├── store.js                   # Dual-mode event store (PostgreSQL / JSON)
│   ├── db.js                      # PostgreSQL connection pool
│   ├── whatsapp.js                # WhatsApp Business API client
│   ├── seed.js                    # Test data seeder
│   └── __tests__/                 # Backend unit tests
├── assets/images/                 # App icons, splash screen, favicon
├── PRIVACY_POLICY.md
├── TERMS_OF_SERVICE.md
├── APP_STORE_METADATA.md
├── ARCHITECTURE.md
├── TESTING.md
└── CHANGELOG.md
```

---

## Getting Started (Development)

### Prerequisites

- Node.js 18+
- [Expo Go](https://expo.dev/go) on your phone, or iOS Simulator / Android Emulator
- A Railway account (for the backend)
- A WhatsApp Business API account (Meta Developers)

### 1. Clone and install

```bash
git clone https://github.com/konjetis/celebconnect.git
cd CelebConnect
npm install
cd backend && npm install && cd ..
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Fill in your DATABASE_URL, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, AUTH_JWT_SECRET
```

### 3. Seed the database (optional)

```bash
cd backend
node seed.js
```

### 4. Start the backend

```bash
cd backend
npm run dev
```

### 5. Start the mobile app

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `i` for iOS Simulator / `a` for Android Emulator.

---

## Running Tests

```bash
# Frontend tests
npm test

# Frontend tests with coverage
npm run test:coverage

# Backend tests
cd backend && npm test
```

See [TESTING.md](./TESTING.md) for full details.

---

## Deployment

The backend is deployed to Railway and auto-deploys on every push to `main`.

Backend URL: `https://celebconnect-production.up.railway.app`

Health check: `https://celebconnect-production.up.railway.app/api/health`

### Build for App Stores

```bash
# Build both iOS and Android
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

See [APP_STORE_METADATA.md](./APP_STORE_METADATA.md) for store listing content.

---

## Environment Variables

### Backend (`backend/.env`)

See [`backend/.env.example`](./backend/.env.example) for the full annotated list.
The essentials:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Railway auto-sets this) |
| `AUTH_JWT_SECRET` | ✅ | Secret for signing JWT tokens (48+ random bytes) |
| `PORT` | ✅ | Server port (Railway sets this automatically) |
| `SEND_HOUR` | | Hour to send daily reminders (24h, default: 9) |
| `SEND_MINUTE` | | Minute to send daily reminders (default: 0) |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | | Instagram Business Login |
| `RESEND_API_KEY` / `RESEND_FROM` | | Password reset via email |
| `TWILIO_*` | | Password reset via SMS |
| `CLOUDINARY_*` | | Profile photo uploads |
| `SENTRY_DSN` | | Error monitoring |
| `ADOPT_ORPHAN_EVENTS_USER_ID` | | One-off migration: claim pre-1.0 ownerless events |

### Mobile app

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_BACKEND_URL` | Public backend URL (set in Expo dashboard) |

---

## API Endpoints

All `/api/events` routes require a `Authorization: Bearer <jwt>` header and are
scoped to the token holder. A user can only ever read or modify their own events.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Sign in, returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user |
| PATCH | `/api/auth/profile` | ✅ | Update profile |
| POST | `/api/auth/push-token` | ✅ | Register this device for reminders |
| GET | `/api/instagram` | — | Start Instagram OAuth |
| GET | `/api/instagram/exchange` | — | Exchange a one-time login code for a JWT |
| GET | `/api/events` | ✅ | List **your** events |
| POST | `/api/events` | ✅ | Create/update one of **your** events |
| DELETE | `/api/events/:id` | ✅ | Delete one of **your** events |
| POST | `/api/send-now` | ✅ | Trigger **your** reminders for today |

---

## Privacy & Legal

- [Privacy Policy](./PRIVACY_POLICY.md) — https://github.com/konjetis/celebconnect/blob/main/PRIVACY_POLICY.md
- [Terms of Service](./TERMS_OF_SERVICE.md) — https://github.com/konjetis/celebconnect/blob/main/TERMS_OF_SERVICE.md

---

## Contact

**Suneetha Konjeti** — suneethakonjeti@gmail.com
