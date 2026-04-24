# 🎉 CelebConnect

> Never miss a birthday or anniversary — CelebConnect automatically sends WhatsApp messages to the people who matter, every year, on the day.

[![CI](https://github.com/konjetis/celebconnect/actions/workflows/ci.yml/badge.svg)](https://github.com/konjetis/celebconnect/actions/workflows/ci.yml)

---

## What It Does

- Add birthdays, anniversaries, and custom events once
- Auto-send personalised WhatsApp greetings every morning at your chosen time
- Set reminders 1–7 days before events so you're never caught off-guard
- Open Instagram profiles instantly to post a story or DM
- Works offline — events and notifications work without internet

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile app | React Native (Expo SDK 54) |
| Backend | Node.js + Express |
| Database | PostgreSQL (Railway) |
| Messaging | WhatsApp Business Cloud API |
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

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Railway auto-sets this) |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Business Cloud API permanent token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID |
| `AUTH_JWT_SECRET` | Secret for signing JWT tokens (48+ random bytes) |
| `SEND_HOUR` | Hour to send daily messages (24h, default: 9) |
| `SEND_MINUTE` | Minute to send daily messages (default: 0) |
| `PORT` | Server port (Railway sets this automatically) |

### Mobile app

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_BACKEND_URL` | Public backend URL (set in Expo dashboard) |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in, returns JWT |
| GET | `/api/auth/me` | Get current user (auth required) |
| PATCH | `/api/auth/profile` | Update profile (auth required) |
| GET | `/api/events` | List all events |
| POST | `/api/events` | Create/update event |
| DELETE | `/api/events/:id` | Delete event |
| POST | `/api/send-now` | Manually trigger today's WhatsApp sends |

---

## Privacy & Legal

- [Privacy Policy](./PRIVACY_POLICY.md) — https://github.com/konjetis/celebconnect/blob/main/PRIVACY_POLICY.md
- [Terms of Service](./TERMS_OF_SERVICE.md) — https://github.com/konjetis/celebconnect/blob/main/TERMS_OF_SERVICE.md

---

## Contact

**Suneetha Konjeti** — suneethakonjeti@gmail.com
