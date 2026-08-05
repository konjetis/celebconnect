# App Store Metadata — CelebConnect

Use this file when setting up your listings on the Apple App Store and Google Play Store.

---

## App Name

**CelebConnect**

---

## Subtitle (iOS only, max 30 characters)

> Birthday wishes in one tap

*(26 characters)*

---

## Short Description (Google Play, max 80 characters)

> Write the message once. Get nudged on the day. Send it in a single tap.

*(72 characters)*

---

## Full Description (max 4000 characters)

CelebConnect makes sure the people who matter to you always feel remembered.

Add a birthday once. Write what you'd want to say while you have time to think about it. Then forget all about it — until the morning it matters, when CelebConnect taps you on the shoulder. One tap opens WhatsApp with your message already written, their name already filled in. You read it, you hit send. Five seconds.

**What CelebConnect does:**
• Add birthdays, anniversaries, holidays, and custom events to your personal calendar
• Write personalised message templates with {name} placeholders for each person
• Get a reminder at the time you choose on the day — tap it and WhatsApp opens ready to send
• Wish a whole WhatsApp group at once, with each person's name filled in
• Set advance reminders 1–7 days before, so there's still time to buy a gift
• Open Instagram profiles instantly to post a story or send a DM
• Manage recurring events — yearly, monthly, weekly, or one-time
• Yearly events count themselves: "Happy 3rd Anniversary!" writes itself
• Works offline — your events and reminders don't need a connection

**Why CelebConnect:**
People don't forget birthdays because they don't care. They forget because life is busy — or they remember at 11pm and it's too late to feel sincere. Your phone already knows the date. What it doesn't do is help you say something. That's the gap CelebConnect closes.

**How the sending works:**
Messages are sent by you, from your own WhatsApp, from your own number — because that's what your friend actually wants to receive. CelebConnect prepares the message and hands it to you ready to go. The final tap is always yours. We never message anyone on your behalf, and we never message anyone who isn't already in your contacts.

**Privacy first:**
Your contacts and message drafts are yours. We don't share them with advertisers, and we don't sell data. Your events are visible only to you. See our full Privacy Policy at [link].

---

## Keywords (iOS, comma-separated, max 100 characters total)

birthday,reminder,whatsapp,anniversary,celebration,greetings,events,contacts,wishes

*(83 characters — Apple counts the whole string including commas; no spaces after commas to save room)*

**Note:** Do not use the word "auto" or "automatic" in keywords or copy. The app
does not send on the user's behalf, and Apple checks the listing against the
build under Guideline 2.3.1 (Accurate Metadata).

---

## Category

**iOS:** Social Networking (primary), Utilities (secondary)
**Android:** Social

---

## Age Rating

**iOS:** 4+ (no objectionable content)
**Android:** Everyone

---

## Privacy Policy URL

> https://github.com/konjetis/celebconnect/blob/main/PRIVACY_POLICY.md

Terms of Service URL:
> https://github.com/konjetis/celebconnect/blob/main/TERMS_OF_SERVICE.md

---

## Support URL / Contact

> suneethakonjeti@gmail.com

---

## Screenshots Required

### iOS App Store

| Device | Size | Count |
|--------|------|-------|
| iPhone 6.9" (Pro Max) | 1320 × 2868 px | 3–10 |
| iPhone 6.5" (Plus/Max) | 1242 × 2688 px | 3–10 |
| iPad Pro 13" (optional) | 2064 × 2752 px | 3–10 |

**Recommended screenshot order:**
1. Home screen — showing upcoming events (e.g. "Suneetha's Birthday in 3 days 🎂")
2. Calendar view — month view with event dots
3. Add event screen — event form with WhatsApp toggle enabled
4. The reminder notification on the lock screen — "Tap to send Mum a WhatsApp message"
5. WhatsApp open with the message pre-filled, ready to send (the payoff shot)
6. Account screen — profile view

### Google Play Store

| Type | Size |
|------|------|
| Phone screenshots | 1080 × 1920 px minimum, up to 8 |
| Feature graphic (required) | 1024 × 500 px |
| App icon | 512 × 512 px |

---

## What's New (Version 1.0.0)

> Initial release of CelebConnect! Add your important dates once, write what you'd want to say, and we'll nudge you on the day — one tap sends it from your own WhatsApp.

---

## App Store Review Notes

*(Include these in the "Notes" field during submission)*

```
Test account for review:
Email: reviewer@celebconnect.app
Password: ReviewCelebConnect2026!

HOW TO TEST THE CORE FEATURE
The test account has an event dated today. On the Home screen, tap
"Send Now via WhatsApp" on that event card — WhatsApp opens with the
message pre-filled and the recipient selected. Nothing is sent until
the reviewer taps Send in WhatsApp.

CelebConnect never sends messages on the user's behalf. The app prepares
the message and opens WhatsApp; the user always performs the final send
from their own account. There is no automated or bulk messaging.

The app also works fully without a backend connection — events are
stored on-device and reminders fire from local notifications.

WHATSAPP NOT INSTALLED
If WhatsApp is not on the review device, the app falls back to
wa.me in Safari, which shows the same pre-filled message.
```

---

## App Privacy — answers for the App Store Connect questionnaire

Fill these in to match what the app actually does:

| Data type | Collected? | Linked to user? | Used for tracking? | Purpose |
|-----------|-----------|-----------------|--------------------|---------|
| Name | Yes | Yes | No | App functionality (account) |
| Email address | Yes | Yes | No | App functionality (account, password reset) |
| Phone number | Yes | Yes | No | App functionality (account, password reset) |
| Photos | Yes | Yes | No | App functionality (profile picture) |
| Contacts | Yes | Yes | No | App functionality — names/numbers the user adds to events |
| User ID | Yes | Yes | No | App functionality (Instagram account id, if the user signs in with Instagram) |
| Device ID | Yes | Yes | No | App functionality (Expo push token for reminders) |

Nothing is used for advertising or tracking. No third-party analytics SDKs.

---

## Checklist Before Submitting

- [ ] Screenshots captured on real device or Xcode Simulator
- [ ] Feature graphic created (Google Play)
- [ ] Privacy Policy hosted at a public URL
- [ ] Terms of Service hosted at a public URL
- [ ] App tested on iOS 16+ and Android 12+
- [ ] All permissions described accurately in store listing
- [ ] Listing copy contains no "auto-send" claim (Guideline 2.3.1)
- [ ] Reviewer test account seeded with an event dated **today**
- [ ] Instagram login either approved by Meta App Review, or the button hidden for v1.0
- [ ] `eas.json` submit block filled in with real Apple/Google credentials
- [ ] EAS build created: `eas build --platform all --profile production`
- [ ] Bundle ID confirmed: `com.celebconnect.app`
- [ ] Version set to 1.0.0 / build number 1
- [ ] Review notes added for app reviewers
