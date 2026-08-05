# CelebConnect — Submission Checklist

**Date:** 4 August 2026
**Status:** Code complete. 196 tests pass, TypeScript clean, ESLint 0 errors.
**Remaining work is all account setup and asset creation — no code left to write.**

---

## What was fixed today

### 🔴 Security (was blocking any public release)

**1. Event API had no authentication and no user scoping.**
`GET /api/events` was open to the world and returned every user's events —
contact names and phone numbers included. `POST` could overwrite any event by
reusing its id; `DELETE` could remove anyone's.

Now: all three routes require a JWT and only ever touch rows owned by the token
holder. A client-supplied `userId` in the request body is stripped and ignored.
`POST /api/send-now` is authenticated and scoped too.

Verified against a running server — all five attacks blocked:

| Attack | Result |
|--------|--------|
| `GET /api/events` with no token | `401 No token provided` |
| Bob reads Alice's events | `200 []` — Alice's phone number absent |
| Bob overwrites Alice's event by id | `403 Event belongs to another user` |
| Bob deletes Alice's event | `404 Event not found` |
| `POST /api/send-now` with no token | `401 No token provided` |

**2. Scheduler broadcast every reminder to every device.**
It collected push tokens from all users, then sent each event's notification to
all of them. A notification payload contains a contact's real phone number, so
with two users signed up, User B's phone would have received User A's mother's
number. Each event now pushes only to its owner's device.

**3. Database migration.** Added `user_id` (indexed) to the events table via
`ADD COLUMN IF NOT EXISTS` on boot. Rows without an owner are hidden from
everyone and from the scheduler — fail-closed rather than fail-open.

**Regression tests:** 11 API-level isolation tests in
`backend/__tests__/events.api.test.js`, plus store- and scheduler-level tests.
Backend went from 55 → 79 tests.

### 🟡 App Store rejection risks

- **Listing copy claimed "auto-send"**, which the app hasn't done since commit
  `c194a1f`. Rewritten across README, CHANGELOG, Terms, Privacy Policy and
  `APP_STORE_METADATA.md`. Guideline 2.3.1 (Accurate Metadata) is one of the
  most common rejection reasons.
- **Unused calendar permissions removed** — `READ_CALENDAR` / `WRITE_CALENDAR`
  and `NSCalendarsUsageDescription`, with no calendar code anywhere in the app.
- **Missing photo permission added** — `NSPhotoLibraryUsageDescription`.
  `AccountScreen` calls `requestMediaLibraryPermissionsAsync()`; without the
  usage string iOS terminates the app at that call.
- **Privacy Policy now discloses Instagram OAuth**, plus Cloudinary, Resend,
  Twilio and Expo push. It previously said "No data is sent to Instagram", which
  stopped being true when OAuth login shipped.
- **App Store Connect privacy questionnaire crib sheet** added to
  `APP_STORE_METADATA.md` so the answers match what the app actually does.

### 🟢 Bugs and tooling

- **Instagram login was broken end to end.** Backend redirects with `?code=`,
  the app read `?token=`. Cold-start Instagram sign-in silently did nothing.
- **TS2554 compile error** in `AppNavigator.tsx` — CI was red.
- **`seed.js` wrote users against a schema that doesn't exist** (`email`,
  `password_hash` columns; the real table is `id, data JSONB`). It had been
  broken against Postgres for some time.
- **`seed.js` now refuses to touch a remote database.** `dotenv` loads
  `backend/.env`, which holds the production Railway URL — so `node seed.js`
  seeded production. It now hard-stops unless `SEED_ALLOW_REMOTE=yes`.
- **Timezone bug in scheduler tests** — they built "today" in UTC while the
  scheduler uses local time. Only failed in the evening in a negative-UTC offset.
- **ESLint config added** — `npm run lint` was defined in `package.json` but no
  config file existed, so it could never have run. Fixed the 14 real errors it
  found rather than silencing them. Added `npm run typecheck` and a CI lint job.
- **`.env.example` now documents all 21 variables** the code reads (was 10).
  A fresh deploy silently lost password reset, photo upload and Instagram login.
- **Untracked `coverage/`** (57 generated files) and `.DS_Store`.

### Production database cleanup

`seed.js` and a local server test both hit the live Railway database because
`dotenv` loaded the production connection string. Test rows were removed the
same session — `alice@test.com`, `bob@test.com`, `test@celebconnect.app`,
`reviewer@celebconnect.app` and 7 events.

Separately, the 40 pre-existing ownerless events were resolved: your 3 real
birthday events for Surya were assigned to your account, and 37 test rows
("First"/"Second"/"Third" × 13, "Updated Title") were deleted.

Production now: **3 events, all owned, 0 orphaned. 3 real users.**

---

## What's left — none of it is code

### Before you can run `eas submit`

**1. Fill in `eas.json`** — still template placeholders:

```json
"appleId":       "YOUR_APPLE_ID_EMAIL"
"ascAppId":      "YOUR_APP_STORE_CONNECT_APP_ID"
"appleTeamId":   "YOUR_APPLE_TEAM_ID"
"serviceAccountKeyPath": "./google-service-account.json"   ← file doesn't exist
```

- `appleId` — your Apple Developer account email
- `ascAppId` — create the app record at appstoreconnect.apple.com first; the
  numeric ID is in the URL
- `appleTeamId` — developer.apple.com → Membership
- Google: Play Console → Setup → API access → create a service account, download
  the JSON to the repo root. It's already in `.gitignore`.

**2. Decide on Instagram login.** `instagram_business_basic` only works for
Meta test users until your app passes Meta App Review, which takes days to
weeks. If a reviewer taps "Continue with Instagram" and it fails, that's an
automatic rejection.

- **Recommended for this week:** hide the button for v1.0, ship, submit Meta
  review in parallel, enable it in 1.1. Email/phone registration works fine.
- Or: start Meta App Review now and wait.

**3. Screenshots.** Apple needs 6.9" (1320×2868) and 6.5" (1242×2688), 3–10
each. Google needs a 1024×500 feature graphic and at least two phone shots.
Suggested order is in `APP_STORE_METADATA.md` — the money shot is #5, WhatsApp
open with the message pre-filled.

**4. Seed the reviewer account.** `seed.js` now creates
`reviewer@celebconnect.app` with an event dated **today** (`evt-seed-006`), so
the reviewer can tap "Send Now" immediately. Run it against production
deliberately when you're ready:

```bash
cd backend && SEED_ALLOW_REMOTE=yes node seed.js
```

**5. Host the legal docs at real URLs.** GitHub blob links work but look
unprofessional in a store listing. GitHub Pages takes ten minutes.

### Deploy order

1. Push to `main` → Railway auto-deploys the backend
2. Confirm `https://celebconnect-production.up.railway.app/api/health` returns
   `{"status":"ok","events":3}`
3. Sign in on your phone and confirm your 3 Surya events are visible — this
   verifies the ownership migration end to end
4. `eas build --platform all --profile production`
5. `eas submit`

⚠️ **Deploy the backend before the app build reaches users.** The app now sends
`Authorization` headers the old backend ignores (harmless), but the new backend
rejects unauthenticated event writes. Backend first is the safe order.

### Worth doing, not blocking

- **Sentry.** `App.tsx` has commented setup instructions and the backend reads
  `SENTRY_DSN`, but `@sentry/react-native` isn't installed. You'll ship to
  strangers with no crash visibility. ~30 minutes.
- **Instagram login codes live in an in-memory `Map`** (`instagram.js` line 12).
  Railway restarts on every deploy and can run multiple replicas, so a login can
  fail with "Invalid or expired login code". Move to a Postgres table, or accept
  the deploy-window failures if you're on a single replica.
- **Instagram user creation is a no-op without `DATABASE_URL`** (`instagram.js`
  lines 128–135) — the JWT points at a user row that was never written.
- **39 ESLint warnings** remain, all `no-explicit-any`. Cosmetic.

---

## Strategy — unchanged from this morning

The competitive picture and the "is it worth it" analysis haven't changed:

- Every true auto-sender is **Android-only**, because Apple forbids it for
  everyone. Your push → one-tap flow is the only iOS-legal design, so it's a UX
  advantage rather than a moat.
- **WhatsApp is building native birthday reminders** (limited Android beta as of
  July 2026) — roughly 80% of the core loop, free and pre-installed.
- **Your only real differentiator is group sends.** "Wish the whole family group
  at once, each person's name filled in" is something no competitor does and
  WhatsApp's native feature won't touch.
- **Don't** build widgets, Watch, iCloud sync, Siri, or contact-birthday
  auto-import. That's racing Apple on Apple's turf.

Ship it, then look at your numbers after a month and only invest further if
group sends are what people actually use.

---

## Sources

- [WhatsApp is developing a feature for birthday reminders — WABetaInfo](https://wabetainfo.com/whatsapp-is-developing-a-feature-for-birthday-reminders/)
- [WhatsApp Is Testing Birthday Notifications — Republic World](https://www.republicworld.com/tech/whatsapp-is-testing-birthday-notifications-making-it-harder-to-forget-important-dates-2026-07-09-131838)
- [Meta testing birthday reminder feature in WhatsApp — Deccan Herald](https://www.deccanherald.com/technology/meta-testing-birthday-reminder-feature-in-whatsapp-4072346)
- [WhatsApp Business Messaging Policy](https://business.whatsapp.com/policy)
- [Get opt-in for WhatsApp — Meta for Developers](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in)
- [WhatsApp Account Blocked? Causes, Appeal Steps in 2026 — ChakraHQ](https://chakrahq.com/article/whatsapp-api-account-restricted-or-blocked-find-out-why-and-how-to-resolve/)
- [Best Birthday Reminder Apps in 2026: Honest Comparison — Greetigo](https://greetigo.com/blog/best-birthday-reminder-apps-2026/)
- [Best Birthday Reminder Apps for iPhone in 2026 — Gratulant](https://www.gratulantapp.com/en/blog/best-birthday-apps)
- [Best birthday reminder apps (2026) — Endearist](https://endearist.com/en/best/birthday-reminder-apps/)
- [Auto Text — Schedule Messages (Google Play)](https://play.google.com/store/apps/details?id=com.hnib.smslater&hl=en_US)
- [AutoSend: Scheduler for WA (Google Play)](https://play.google.com/store/apps/details?id=com.vdx.autosend&hl=en_US)
