# 🎉 CelebConnect

> Never miss a birthday or anniversary — send automatic WhatsApp messages and Instagram posts.

## Getting Started

### 1. Install dependencies
```bash
cd CelebConnect
npm install
```

### 2. Start the development server
```bash
npx expo start
```
Scan the QR code with the **Expo Go** app on your iOS or Android device.

### 3. Open in Cursor
Open the `CelebConnect` folder in Cursor. Claude (claude-sonnet-4-6) is pre-configured as the AI model. The `.cursor/rules` file gives Claude full context about the project.

---

## Project Structure

```
CelebConnect/
├── App.tsx                    # Root component
├── app.json                   # Expo config
├── src/
│   ├── screens/
│   │   ├── auth/              # Login, Register, ForgotPassword
│   │   ├── home/              # Home dashboard
│   │   ├── calendar/          # Calendar + Add/Edit event
│   │   └── account/           # Profile management
│   ├── components/            # Reusable UI components
│   ├── navigation/            # AppNavigator (Stack + Tabs)
│   ├── context/               # AuthContext, EventContext
│   ├── utils/                 # theme.ts, helpers.ts
│   ├── types/                 # TypeScript types
│   └── services/              # WhatsApp & Instagram API
├── .cursor/
│   ├── rules                  # Claude AI coding rules
│   └── mcp.json               # MCP filesystem server config
└── assets/
```

## Features

| Feature | Status |
|---|---|
| Login (email + phone) | ✅ Built |
| Register | ✅ Built |
| Forgot Password | ✅ Built |
| Home Dashboard | ✅ Built |
| Calendar View | ✅ Built |
| Add/Edit Events | ✅ Built |
| Account / Profile Edit | ✅ Built |
| WhatsApp Auto-message | 🔧 Needs API key |
| Instagram Auto-post | 🔧 Needs API key |
| Push Notifications | 🔧 In progress |

## Next Steps

1. **WhatsApp Integration** — Get [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp) credentials
2. **Instagram Integration** — Get [Instagram Graph API](https://developers.facebook.com/docs/instagram-api) token
3. **Backend** — Connect to a real authentication API (Firebase Auth recommended)
4. **Push Notifications** — Configure via Expo Push Notifications

## Cursor + Claude Setup

Cursor is configured to use Claude as the AI model. To complete setup:
1. Open Cursor → Settings → Models
2. Add Anthropic API Key
3. Select `claude-sonnet-4-6` as the model
