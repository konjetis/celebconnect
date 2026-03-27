# CelebConnect Backend

Automatically sends WhatsApp messages on event dates using the **WhatsApp Business Cloud API**.

---

## How it works

```
Your iPhone (CelebConnect app)
  │  creates/edits event
  ▼
Backend (hosted on Railway — runs 24/7 in the cloud)
  │  stores the event in PostgreSQL
  │  runs a cron job every day at 9:00 AM
  ▼
WhatsApp Business Cloud API (Meta)
  │  sends the message on your behalf
  ▼
Recipient's WhatsApp
```

---

## Part 1 — Get WhatsApp Business API credentials (free)

### Step 1 — Create a Meta developer app

1. Go to [developers.facebook.com](https://developers.facebook.com) and log in with your Facebook account
2. Click **My Apps → Create App → Business**
3. Add the **WhatsApp** product to your app
4. Go to **WhatsApp → API Setup**
5. Copy the **Phone Number ID** and the **temporary access token** (you'll replace the token next)
6. Under **To**, add your personal phone number as a test recipient (free tier allows up to 5 numbers)

> **Free tier note**: You can send to up to 5 registered test numbers for free. To send to any phone number, you need to verify your business with Meta and upgrade to a paid plan.

### Step 2 — Create a permanent access token

The temporary token expires in 24 hours. For a token that never expires:

1. Go to **Business Settings → Users → System Users**
2. Create a System User with **Admin** role
3. Click **Generate New Token** → select your app → check `whatsapp_business_messaging`
4. Copy the token — save it somewhere safe

---

## Part 2 — Deploy the backend to Railway (free cloud hosting)

### Step 1 — Create a Railway account

1. Go to [railway.app](https://railway.app) and sign up (GitHub login recommended)
2. Railway has a free Hobby tier — no credit card required to start

### Step 2 — Deploy from GitHub

The easiest way is to push your backend code to GitHub, then connect Railway to it.

**Option A — Deploy via GitHub (recommended):**

1. Push your entire `CelebConnect` project to a GitHub repository
2. In Railway, click **New Project → Deploy from GitHub repo**
3. Select your `CelebConnect` repository
4. Railway will detect this is a Node.js project automatically
5. Set the **Root Directory** to `backend` in Railway's settings

**Option B — Deploy via Railway CLI:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# From the backend folder
cd backend
railway init
railway up
```

### Step 3 — Add a PostgreSQL database

1. In your Railway project, click **New → Database → Add PostgreSQL**
2. Railway automatically adds a `DATABASE_URL` environment variable to your service — no configuration needed

### Step 4 — Add your environment variables

In Railway → your backend service → **Variables** tab, add:

| Variable | Value |
|----------|-------|
| `WHATSAPP_PHONE_NUMBER_ID` | Your Phone Number ID from Meta |
| `WHATSAPP_ACCESS_TOKEN` | Your permanent access token |
| `SEND_HOUR` | `9` (hour to send messages, 24h format) |
| `SEND_MINUTE` | `0` |

> `DATABASE_URL` and `PORT` are set automatically by Railway — do not add them manually.

### Step 5 — Get your backend URL

1. In Railway → your service → **Settings** → enable **Public Networking**
2. Railway gives you a URL like `https://celebconnect-production.up.railway.app`
3. Copy this URL — you'll paste it into the mobile app next

### Step 6 — Connect the mobile app to the cloud backend

Create a `.env` file in the root of the CelebConnect project:

```
EXPO_PUBLIC_BACKEND_URL=https://celebconnect-production.up.railway.app
```

Then rebuild the app (or restart Expo for development).

---

## Testing your deployed backend

### Check it's running
Open in your browser:
```
https://your-railway-url.up.railway.app/api/health
```
You should see: `{"status":"ok","events":0}`

### Trigger a test send right now
```bash
curl -X POST https://your-railway-url.up.railway.app/api/send-now
```

### Check stored events
```bash
curl https://your-railway-url.up.railway.app/api/events
```

---

## Local development (without Railway)

For local testing, the backend uses a JSON file instead of PostgreSQL (no `DATABASE_URL` needed):

```bash
cd backend
cp .env.example .env
# Edit .env — fill in WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN
npm install
npm start
```

You should see:
```
CelebConnect backend running on http://localhost:3001
Storage mode: local JSON file
[Scheduler] Will send messages daily at 9:00 local time.
```

---

## Message format

In the app, set your WhatsApp message template. Use `{name}` as a placeholder:

- `"Happy Birthday, {name}! 🎂 Hope you have an amazing day!"`
- `"Happy Anniversary, {name}! 💍 Wishing you many more wonderful years!"`

The backend replaces `{name}` with each contact's name before sending.

---

## Architecture

| File | Purpose |
|------|---------|
| `server.js` | Express API server |
| `scheduler.js` | Daily cron job (node-cron) |
| `whatsapp.js` | Meta WhatsApp Business Cloud API v19.0 |
| `store.js` | Dual-mode data store (PostgreSQL or JSON file) |
| `db.js` | PostgreSQL connection pool and table init |
| `.env.example` | Template for environment variables |
