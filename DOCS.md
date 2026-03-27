# CelebConnect — Technical Documentation

> A React Native / Expo app for tracking birthdays, anniversaries, and celebrations,
> with automated WhatsApp & Instagram messaging support.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [App Features](#4-app-features)
5. [Screens & Navigation](#5-screens--navigation)
6. [Data Model](#6-data-model)
7. [State Management & Context Architecture](#7-state-management--context-architecture)
8. [Key Architectural Decisions](#8-key-architectural-decisions)
9. [Testing](#9-testing)
10. [Running the App](#10-running-the-app)
11. [Known Limitations & Future Work](#11-known-limitations--future-work)

---

## 1. Project Overview

CelebConnect helps you never miss an important date. You can add birthdays, anniversaries, holidays, and custom events to a visual calendar, configure automated WhatsApp messages and Instagram captions for each event, and receive reminders ahead of time.

The app stores all data **locally on device** using `AsyncStorage`. There is no backend server or database — everything lives on the phone.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript (strict mode) |
| Navigation | React Navigation v6 (native stack + bottom tabs) |
| State | React Context API + `useReducer` |
| Persistence | `@react-native-async-storage/async-storage` |
| Auth tokens | `expo-secure-store` |
| Calendar UI | `react-native-calendars` |
| Forms | `react-hook-form` |
| Validation | `zod` |
| Animations | `react-native-reanimated` v4 + `react-native-worklets` |
| Testing | Jest (via `jest-expo` preset) + `@testing-library/react-native` |

---

## 3. Project Structure

```
CelebConnect/
├── App.tsx                        # Root component — wraps providers, handles nav
├── index.js                       # Entry point — registers root component
├── babel.config.js                # Babel config (react-native-worklets/plugin)
├── jest.config.js                 # Jest configuration
├── jest.setup.js                  # Test setup & global mocks
├── tsconfig.json                  # TypeScript config with path aliases
│
└── src/
    ├── types/
    │   └── index.ts               # All shared TypeScript interfaces & types
    │
    ├── context/
    │   ├── AuthContext.tsx         # Authentication state & actions
    │   └── EventContext.tsx        # Calendar event state & CRUD actions
    │
    ├── screens/
    │   ├── home/
    │   │   └── HomeScreen.tsx      # Dashboard — upcoming events & stats
    │   ├── calendar/
    │   │   ├── CalendarScreen.tsx  # Monthly calendar + per-date event list
    │   │   └── AddEditEventScreen.tsx  # Create / edit event form
    │   └── account/
    │       └── AccountScreen.tsx   # User profile settings
    │
    ├── navigation/
    │   └── (navigators)           # Stack & tab navigator definitions
    │
    ├── utils/
    │   ├── helpers.ts             # Pure utility functions
    │   └── theme.ts               # Colors, spacing constants
    │
    └── __tests__/
        ├── utils/
        │   └── helpers.test.ts    # Unit tests for pure functions
        ├── context/
        │   ├── eventReducer.test.ts   # Reducer state-transition tests
        │   ├── EventContext.test.tsx  # Provider integration tests
        │   └── authReducer.test.ts   # Auth reducer tests
        └── screens/
            ├── HomeScreen.test.tsx   # HomeScreen component tests
            └── CalendarScreen.test.tsx  # CalendarScreen component tests
```

---

## 4. App Features

### 4.1 Home Screen Dashboard
- Personalized greeting (Good morning / afternoon / evening, [name])
- **Today section**: highlights any events happening today
- **Next 30 Days section**: scrollable list of upcoming events, sorted by date
- Each event card shows: emoji by category, title, date, "days until" badge, integration badges (WhatsApp / Instagram), and a delete button
- **Stats row**: counts for birthdays, anniversaries, and auto-messages in the next 30 days

### 4.2 Calendar Screen
- Full monthly calendar view (via `react-native-calendars`)
- Dots on dates that have events
- Selected date shown highlighted in the app's primary color
- Events list below the calendar filters to the selected date
- Each event card shows: emoji, title, recurrence type, integration icons, description preview, edit (✏️) and delete (🗑️) buttons
- **"+ Add" button** navigates to AddEvent pre-filled with the selected date

### 4.3 Add / Edit Event Screen
- Fields: Title, Date (via date picker), Category (Birthday / Anniversary / Holiday / Custom), Recurrence (None / Yearly / Monthly / Weekly), Notify X days before, Description
- **WhatsApp section** (toggle): when enabled, shows a message template editor and a "Tag Contacts" section where you can add individual contacts (name + phone) or groups
- **Instagram section** (toggle): when enabled, shows a caption editor and a "Tag Accounts" section where you can add Instagram accounts (name + @handle)
- Keyboard-avoiding layout ensures inputs are never hidden behind the keyboard on iOS

### 4.4 Authentication
- Login via email or phone
- Registration with first name, last name, email/phone, password
- Session is persisted to `expo-secure-store` and restored on app launch
- Currently uses mock auth — no real backend API

---

## 5. Screens & Navigation

### Navigation Structure

```
RootNavigator (Stack)
├── Auth (Stack)                    — shown when not authenticated
│   ├── Login
│   ├── Register
│   ├── ForgotPassword
│   └── ResetPassword
│
└── Main (Bottom Tabs)              — shown when authenticated
    ├── Home (HomeScreen)
    ├── Calendar (Stack)
    │   ├── CalendarMain (CalendarScreen)
    │   ├── AddEvent (AddEditEventScreen)
    │   ├── EditEvent (AddEditEventScreen)
    │   └── EventDetail
    └── Account (AccountScreen)
```

### Screen Props

**CalendarScreen**
- `navigation: NativeStackNavigationProp<CalendarStackParamList, 'CalendarMain'>`

**AddEditEventScreen** (used for both Add and Edit)
- `route.params.date?: string` — pre-selects date when coming from CalendarScreen
- `route.params.eventId?: string` — loads existing event for editing

---

## 6. Data Model

### CalendarEvent

The core data entity. All events are stored as an array in `AsyncStorage` under the key `"celebconnect_events"`.

```typescript
interface CalendarEvent {
  id: string;              // Date.now().toString() — unique per device
  title: string;           // Display name (e.g. "Mom's Birthday")
  date: string;            // "YYYY-MM-DD" — local date, no time component
  category: EventCategory; // 'birthday' | 'anniversary' | 'holiday' | 'custom'
  recurrence: RecurrenceType; // 'none' | 'yearly' | 'monthly' | 'weekly'
  description?: string;
  contacts: EventContact[];   // WhatsApp contacts + Instagram accounts
  whatsappEnabled: boolean;
  instagramEnabled: boolean;
  whatsappMessage?: string;   // Message template, supports {name} placeholder
  instagramCaption?: string;
  notifyDaysBefore: number;   // 0 = day of event
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp, updated on every save
}
```

### EventContact

Unified type for both WhatsApp contacts and Instagram accounts. The distinction is made by which field is populated.

```typescript
interface EventContact {
  id: string;
  name: string;
  phone?: string;             // Set for WhatsApp individual contacts
  instagramHandle?: string;   // Set for Instagram accounts
  isWhatsAppGroup?: boolean;  // true for WhatsApp groups
  groupId?: string;           // WhatsApp group ID
}
```

**In AddEditEventScreen**, these are split into two local state arrays:
- `contacts` — WhatsApp contacts (have `phone` populated)
- `igAccounts` — Instagram accounts (have `instagramHandle` populated)

They are merged on save: `const allContacts = [...contacts, ...igAccounts]`.

### User

```typescript
interface User {
  id: string;
  email?: string;
  phone?: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7. State Management & Context Architecture

The app uses two React contexts, both following the same **`useReducer` + `AsyncStorage`** pattern.

### EventContext

**File:** `src/context/EventContext.tsx`

**State shape:**
```typescript
interface EventState {
  events: CalendarEvent[];
  isLoading: boolean;
}
```

**Key design decision — avoiding stale closures:**

All mutation functions (`addEvent`, `updateEvent`, `deleteEvent`) follow this pattern:
1. **Read the latest data from `AsyncStorage`** (not from `state.events`)
2. Compute the new list
3. **Write the new list back to `AsyncStorage`**
4. Dispatch `SET_EVENTS` with the complete new list

This is critical. If mutations read from `state.events` instead, React's closure semantics mean they'd see a stale snapshot of the state at the time the function was created. This caused a bug where adding a second event would overwrite the first.

```typescript
// ✅ Correct pattern — always reads from AsyncStorage
const addEvent = async (eventData) => {
  const current = await readEvents();         // fresh read
  const updated = [...current, newEvent];
  await AsyncStorage.setItem(key, JSON.stringify(updated));
  dispatch({ type: 'SET_EVENTS', payload: updated });
};

// ❌ Stale closure bug — don't do this
const addEvent = async (eventData) => {
  const updated = [...state.events, newEvent]; // stale!
  await AsyncStorage.setItem(key, JSON.stringify(updated));
  dispatch({ type: 'ADD_EVENT', payload: newEvent });
};
```

**Exposed functions:**

| Function | Description |
|---|---|
| `loadEvents()` | Reads all events from AsyncStorage and sets them in state |
| `addEvent(data)` | Adds a new event; auto-generates `id`, `createdAt`, `updatedAt` |
| `updateEvent(event)` | Replaces the matching event; updates `updatedAt` |
| `deleteEvent(id)` | Removes the event with the given id |
| `getEventsByDate(date)` | Returns events filtered by exact date string |
| `getUpcomingEvents(days)` | Returns events from today through today+days, sorted ascending |

**Date handling in `getUpcomingEvents`:**

JavaScript's `new Date('YYYY-MM-DD')` parses the string as **UTC midnight**, which causes events to appear in the past for users in UTC+ timezones. The fix is to force local timezone parsing:

```typescript
const eventDate = new Date(e.date + 'T00:00:00'); // local midnight, not UTC
```

### AuthContext

**File:** `src/context/AuthContext.tsx`

**State shape:** Mirrors the `AuthState` type (user, token, isLoading, isAuthenticated).

Currently uses **mock authentication** — no real API calls. On login/register, it creates a mock user object and stores the token + user data in `expo-secure-store`. Session is restored on app launch via `useEffect`.

**To connect to a real API:**
- Replace the `// TODO: Replace with real API call` sections in `login()` and `register()` with actual HTTP calls
- Handle API errors and map them to user-facing messages

### Avoiding `useFocusEffect` Race Conditions

An earlier version of the app used `useFocusEffect(() => { loadEvents(); })` in both `HomeScreen` and `CalendarScreen`. This caused a race condition:

1. User deletes event → `deleteEvent()` starts writing to AsyncStorage
2. Screen re-focuses → `loadEvents()` reads AsyncStorage **before** the delete finishes
3. The deleted event reappears

**Fix:** Remove `useFocusEffect` entirely. Since all mutations dispatch `SET_EVENTS` with the complete updated list, all subscribed components update automatically via React's context propagation — no polling needed.

---

## 8. Key Architectural Decisions

### Why local storage (AsyncStorage) instead of a backend?

The app is designed for personal use with no network dependency. All data stays on the device. If a backend is added in the future, the `EventContext` mutation functions would simply swap out the `AsyncStorage.setItem` / `getItem` calls for API calls, while keeping the same dispatch pattern.

### Why two separate contact arrays in AddEditEventScreen?

`EventContact` is a unified type that serves double duty. In the form UI, it's much clearer to maintain `contacts` (WhatsApp) and `igAccounts` (Instagram) as separate arrays with separate UI sections. They're merged into one `contacts[]` array before saving to the event.

### Why no `useFocusEffect` for data loading?

See the race condition explanation in section 7. The `SET_EVENTS` pattern means context subscribers always have fresh data without explicit polling.

### Path aliases

`tsconfig.json` defines aliases like `@context/`, `@utils/`, etc. These are resolved at compile time by `babel-plugin-module-resolver` (configured in `babel.config.js`) and at type-check time by TypeScript's `paths` config.

---

## 9. Testing

### Test Stack

- **`jest-expo`** — Expo-aware Jest preset (transforms RN modules correctly)
- **`@testing-library/react-native`** — render components and query/interact with them
- **`@types/jest`** — TypeScript types for Jest globals

### Running Tests

First, install the testing packages (one-time setup on your Mac):

```bash
npm install --legacy-peer-deps
```

Then run tests:

```bash
npm test                   # run all tests once
npm run test:watch         # re-run on file changes
npm run test:coverage      # generate coverage report
```

### Test Files

| File | What It Tests |
|---|---|
| `src/__tests__/utils/helpers.test.ts` | `formatDate`, `daysUntil`, `getCategoryEmoji`, `generateWhatsAppMessage` — pure functions, no mocks |
| `src/__tests__/context/eventReducer.test.ts` | All reducer transitions: SET_EVENTS, ADD_EVENT, UPDATE_EVENT, DELETE_EVENT, SET_LOADING |
| `src/__tests__/context/EventContext.test.tsx` | Full provider integration: load, add, update, delete, getUpcomingEvents |
| `src/__tests__/context/authReducer.test.ts` | Auth reducer: SET_LOADING, LOGIN_SUCCESS, LOGOUT, UPDATE_USER |
| `src/__tests__/screens/HomeScreen.test.tsx` | Rendering, stats, delete confirm flow |
| `src/__tests__/screens/CalendarScreen.test.tsx` | Rendering, event count, navigation, delete confirm flow |

### Mocks

The following modules are mocked globally in `jest.setup.js`:

- `@react-native-async-storage/async-storage` → official mock from the package
- `expo-secure-store` → in-memory implementation
- `expo-notifications` → no-op stubs
- `react-native-calendars` → simple View stub (avoids native module errors)
- `@react-navigation/native` → `navigate` / `goBack` / `useFocusEffect` stubs

### Writing New Tests

Follow the established patterns:

**Pure function test:**
```typescript
import { formatDate } from '../../utils/helpers';
it('formats January correctly', () => {
  expect(formatDate('2026-01-15')).toMatch(/January/i);
});
```

**Context/reducer test:**
```typescript
// Test the reducer directly (no React needed)
const state = eventReducer(emptyState, { type: 'ADD_EVENT', payload: myEvent });
expect(state.events).toHaveLength(1);
```

**Component test:**
```typescript
// Mock the context, render the component, assert on output
jest.mock('../../context/EventContext', () => ({
  useEvents: () => ({ events: [...], loadEvents: jest.fn() }),
}));
const { getByText } = render(<HomeScreen />);
expect(getByText('Alice\'s Birthday')).toBeTruthy();
```

---

## 10. Running the App

### Prerequisites

- **Node.js** 18+ and npm
- **Expo Go** app installed on your iPhone
- **Watchman** installed (prevents EMFILE errors on macOS): `brew install watchman`
- Mac and iPhone on the **same Wi-Fi network**

### Steps

```bash
# 1. Install dependencies (only needed once after cloning or after package changes)
npm install --legacy-peer-deps

# 2. Start the Metro bundler
npx expo start

# 3. Scan the QR code with your iPhone camera (or Expo Go app)
```

### Troubleshooting

| Problem | Fix |
|---|---|
| `EMFILE: too many open files` | `brew install watchman` |
| `SDK version mismatch` | Make sure `expo` in package.json matches the Expo Go version on your phone (currently SDK 54) |
| `'main' has not been registered'` | Ensure `index.js` exists at the project root with `registerRootComponent(App)` |
| `babel-preset-expo not found` | `rm -rf node_modules package-lock.json && npm install --legacy-peer-deps` |
| Keyboard covers input fields on iOS | Wrap the form in `<KeyboardAvoidingView behavior="padding">` |
| Events not updating after add/delete | Check that mutations use `readEvents()` (AsyncStorage read) not `state.events` (stale closure) |

---

## 11. Known Limitations & Future Work

### Current Limitations

- **No real backend** — auth is mocked; data lives only on one device
- **No push notifications** — `expo-notifications` is imported but not yet wired up to event reminders
- **No actual WhatsApp/Instagram integration** — the app collects contact info but doesn't send messages yet
- **No cloud sync** — events can't be backed up or shared between devices
- **Event IDs use `Date.now()`** — could produce duplicate IDs if two events are created within the same millisecond (extremely rare in practice but not collision-proof)

### Suggested Future Work

1. **Connect real authentication API** — replace mock login/register with actual API calls; use JWT tokens
2. **Implement push notifications** — schedule local notifications via `expo-notifications` based on `notifyDaysBefore`
3. **WhatsApp deep-linking** — use `whatsapp://send?phone=...&text=...` URL scheme to open WhatsApp with pre-filled messages
4. **Instagram integration** — use the Instagram Graph API (requires a Business/Creator account) to post captions
5. **Cloud sync** — add a lightweight backend (e.g. Supabase or Firebase) so events sync across devices
6. **Recurrence expansion** — currently `recurrence` is stored but not acted upon; add logic to auto-generate future occurrences for yearly/monthly/weekly events
7. **Event photos** — use `expo-image-picker` (already installed) to attach photos to events
8. **Search & filter** — add search across all events and filter by category or date range
9. **Export/import** — allow exporting events as JSON or importing from contacts / calendar apps
