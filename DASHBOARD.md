# Dashboard Setup Guide

## 🎯 Overview

You now have a **React dashboard** to control your bot! The dashboard allows you to:

- ✅ Start/Stop bot listening
- 🔑 Manage keywords
- 💼 Configure your skills and experience
- 🤖 Edit AI prompts
- ⚙️ Update environment variables
- 📊 All changes sync with Firebase in real-time

## 📦 Installation

### 1. Install Backend Dependencies

```bash
npm install
```

### 2. Install Frontend Dependencies

```bash
cd client
npm install
cd ..
```

## 🚀 Running the Dashboard

### Option 1: Run Everything Together (Recommended)

```bash
npm run dev
```

This starts:

- **Backend API** on `http://localhost:5000`
- **React Dashboard** on `http://localhost:3000`

### Option 2: Run Separately

**Terminal 1 - Backend API:**

```bash
npm run server
```

**Terminal 2 - React Dashboard:**

```bash
cd client
npm run dev
```

**Terminal 3 - Bot (if needed):**

```bash
npm start
```

## 🔧 Firebase Setup

The dashboard uses Firebase to store and sync configuration. Your Firebase config is already set up in `client/src/firebase.js`.

### Initialize Firebase Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `auto-apply-f6ac3`
3. Go to **Firestore Database**
4. Click **Create Database**
5. Choose **Start in production mode**
6. Select a location (e.g., us-central)

The dashboard will automatically create the necessary collections:

- `botConfig/main` - Stores keywords, expertise, AI prompt, etc.
- `botStatus/current` - Stores bot running status

## 📱 Using the Dashboard

### 1. Open the Dashboard

Navigate to `http://localhost:3000` in your browser.

### 2. Configure Your Bot

**Keywords Section:**

- Add keywords that jobs should match
- Set minimum keyword matches (default: 3)
- Remove keywords by clicking the × button

**Skills Section:**

- Add your technical skills
- These are used in AI-generated cover letters

**Experience Section:**

- Add your work experience
- AI uses this to personalize cover letters

**Education & Languages:**

- Add your education background
- List programming languages you know

**AI Prompt:**

- Customize how the AI generates cover letters
- Placeholders: `{skills}`, `{experience}`, `{education}`, `{languages}`, `{additionalInfo}`, `{jobDescription}`

**Environment Variables:**

- Telegram Username
- Gemini API Key
- Telegram Init Data

### 3. Save Configuration

Click **💾 Save Configuration** to save all changes to Firebase.

### 4. Control the Bot

**Start Listening:**

- Click **▶️ Start Listening** to begin monitoring for jobs

**Stop Listening:**

- Click **⏸️ Stop Listening** to pause job monitoring

The status indicator at the top shows if the bot is currently listening (green) or stopped (red).

## 🔄 How It Works

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   React     │ ◄─────► │   Firebase   │ ◄─────► │  Bot (Node) │
│  Dashboard  │         │   Firestore  │         │   Process   │
└─────────────┘         └──────────────┘         └─────────────┘
      │                                                  │
      │                                                  │
      └──────────────► Express API ◄───────────────────┘
                      (localhost:5000)
```

1. **Dashboard** updates configuration in Firebase
2. **Firebase** syncs data in real-time
3. **Bot** reads configuration from Firebase
4. **API Server** controls bot start/stop

## 🎨 Dashboard Features

### Real-Time Sync

- Changes in Firebase appear instantly in the dashboard
- Multiple users can manage the bot simultaneously

### Bot Control

- Start/stop bot listening without restarting the process
- See real-time status updates

### Configuration Management

- All bot settings in one place
- No need to manually edit config files
- Changes persist across bot restarts

## 🐛 Troubleshooting

### Dashboard won't load

- Make sure you ran `npm install` in the `client` folder
- Check that port 3000 is not in use

### Can't start/stop bot

- Ensure the API server is running (`npm run server`)
- Check that port 5000 is not in use

### Configuration not saving

- Verify Firebase is properly initialized
- Check browser console for errors
- Ensure Firestore database is created

### Bot not responding to dashboard

- Make sure bot is reading from Firebase
- Check that all environment variables are set
- Restart the bot after major config changes

## 📝 Next Steps

1. Open the dashboard: `http://localhost:3000`
2. Configure your keywords and expertise
3. Add your API keys in the Environment Variables section
4. Click "Save Configuration"
5. Click "Start Listening" to begin auto-applying!

---

**Pro Tip:** Keep the dashboard open to monitor bot status and make real-time adjustments! 🚀
