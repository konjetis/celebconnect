# CelebConnect — Publishing Guide

This guide walks you through deploying the backend to Railway and publishing the mobile app to the Apple App Store and Google Play Store.

---

## Overview

There are three separate publishing steps:

1. **Deploy the backend to Railway** — the cloud server that sends WhatsApp messages automatically
2. **Publish to Apple App Store** — so iPhone users can download CelebConnect
3. **Publish to Google Play Store** — so Android users can download CelebConnect

---

## Step 1 — Deploy the Backend to Railway

### What you need
- A free [Railway](https://railway.app) account
- A GitHub account (to push the code)
- Your WhatsApp Business API credentials (see `backend/README.md`)

### 1a — Push the project to GitHub

1. Go to [github.com](https://github.com) and create a new repository called `celebconnect`
2. In your terminal (inside the CelebConnect folder):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/celebconnect.git
   git push -u origin main
   ```

### 1b — Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Click **Deploy from GitHub repo** → select `celebconnect`
3. In the service settings, set **Root Directory** to `backend`
4. Click **Deploy**

### 1c — Add PostgreSQL

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway automatically links `DATABASE_URL` to your backend — nothing else needed

### 1d — Add environment variables

Go to your Railway backend service → **Variables** tab → add:

```
WHATSAPP_PHONE_NUMBER_ID   = (from Meta developer console)
WHATSAPP_ACCESS_TOKEN      = (your permanent system user token)
SEND_HOUR                  = 9
SEND_MINUTE                = 0
```

### 1e — Enable public URL

1. Go to **Settings** → **Networking** → **Generate Domain**
2. Your backend is now live at `https://celebconnect-xxxx.up.railway.app`
3. Test it: open `https://celebconnect-xxxx.up.railway.app/api/health` in your browser

### 1f — Connect the app to the backend

In the CelebConnect root folder, update your `.env` file:

```
EXPO_PUBLIC_BACKEND_URL=https://celebconnect-xxxx.up.railway.app
```

---

## Step 2 — Publish to the Apple App Store

### What you need
- **Apple Developer Program** membership — $99/year at [developer.apple.com](https://developer.apple.com/programs/)
- A Mac computer (required for final submission)
- An [Expo](https://expo.dev) account (free)

### 2a — Set up Expo EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to your Expo account
eas login

# Link this project to your Expo account
eas init
```

This will:
- Create an EAS project and give you a **Project ID**
- Update `app.json` automatically with your project ID

### 2b — Configure your app identity

In `app.json`, verify these fields match what you want in the App Store:

```json
{
  "expo": {
    "name": "CelebConnect",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.celebconnect.app",
      "buildNumber": "1"
    }
  }
}
```

> The `bundleIdentifier` must be unique in the App Store. If `com.celebconnect.app` is taken, use something like `com.yourname.celebconnect`.

### 2c — Build for iOS (App Store)

```bash
eas build --platform ios --profile production
```

EAS will:
1. Ask you to log in to your Apple Developer account
2. Automatically create provisioning profiles and certificates
3. Build your app in the cloud (takes ~10-20 minutes)
4. Give you a download link for the `.ipa` file

### 2d — Submit to App Store Connect

```bash
eas submit --platform ios --profile production
```

Or manually:
1. Download the `.ipa` from the EAS build
2. Open **Xcode** → **Window** → **Organizer**
3. Drag in the `.ipa` and click **Distribute App**

### 2e — Complete your App Store listing

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Create a new app → fill in:
   - **Name**: CelebConnect
   - **Description**: Never miss a birthday, anniversary, or special occasion. CelebConnect automatically sends WhatsApp messages to your loved ones on their special days.
   - **Category**: Lifestyle
   - **Screenshots**: Take screenshots on your iPhone (Settings → Developer → Screenshot, or use the Simulator)
   - **Privacy Policy URL**: required — create a simple one at [privacypolicygenerator.info](https://privacypolicygenerator.info)
3. Submit for review — Apple reviews take 1–3 business days

---

## Step 3 — Publish to Google Play Store

### What you need
- **Google Play Developer** account — $25 one-time fee at [play.google.com/console](https://play.google.com/console)
- An [Expo](https://expo.dev) account (same as above)

### 3a — Build for Android

```bash
eas build --platform android --profile production
```

This builds an `.aab` (Android App Bundle) file — the format Google Play requires.

### 3b — Set up Google Play API access (for automated submission)

1. In [Google Play Console](https://play.google.com/console) → **Setup** → **API access**
2. Link to a Google Cloud project
3. Create a **Service Account** with Editor permissions
4. Download the JSON key file → save as `google-service-account.json` in the project root

### 3c — Submit to Google Play

```bash
eas submit --platform android --profile production
```

Or manually:
1. Download the `.aab` from the EAS build
2. Go to Google Play Console → **Create app**
3. Fill in the app details:
   - **App name**: CelebConnect
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free
4. Under **Release** → **Production** → upload the `.aab`
5. Fill in the store listing (description, screenshots, content rating)
6. Submit for review — Google reviews take 1–7 business days

---

## Step 4 — Update the app after publishing

When you make changes to the app code:

**For JavaScript-only changes** (no native code changes):
```bash
# Push an over-the-air update instantly — no app store review needed
eas update --branch production --message "Fix: improved event notifications"
```

**For native code changes** (e.g., adding new Expo plugins):
```bash
# Build a new version and submit to the stores
eas build --platform all --profile production
eas submit --platform all --profile production
```

---

## Cost summary

| Service | Cost |
|---------|------|
| Railway (backend hosting) | Free (Hobby tier, ~$5/mo if you exceed limits) |
| Apple Developer Program | $99/year |
| Google Play Developer | $25 one-time |
| WhatsApp Business API | Free for first 1,000 conversations/month |
| Expo EAS Build | Free (limited builds/month), $19/mo for Production plan |

---

## Checklist before submitting

- [ ] App icon added (`assets/images/icon.png` — 1024×1024 px)
- [ ] Splash screen added (`assets/images/splash.png` — 1242×2688 px)
- [ ] Backend deployed to Railway and URL working
- [ ] `EXPO_PUBLIC_BACKEND_URL` set in the app's `.env`
- [ ] WhatsApp Business API credentials configured in Railway
- [ ] App tested end-to-end on a real iPhone and Android device
- [ ] Privacy policy URL ready
- [ ] App Store screenshots ready (at least 3, in required sizes)
- [ ] Google Play screenshots ready (phone + 7-inch tablet)
- [ ] `app.json` `version` and `buildNumber`/`versionCode` updated
- [ ] `eas.json` `appleId` and `ascAppId` filled in

---

## Getting help

- Expo EAS Build docs: [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction/)
- App Store review guidelines: [developer.apple.com/app-store/review/guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Google Play policies: [support.google.com/googleplay/android-developer](https://support.google.com/googleplay/android-developer)
- Railway docs: [docs.railway.app](https://docs.railway.app)
