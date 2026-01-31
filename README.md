# Afriwork Auto-Apply Bot

Complete automated job application system with React dashboard for configuration and control.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
cd client && npm install && cd ..
```

### 2. Run the Dashboard

```bash
npm run dev
```

This starts:

- Backend API: `http://localhost:5000`
- Dashboard: `http://localhost:3000`

### 3. Configure via Dashboard

1. Open `http://localhost:3000`
2. Add your keywords, skills, and experience
3. Set your API keys in Environment Variables
4. Click "Save Configuration"
5. Click "Start Listening"

## 📁 Project Structure

```
tgworkbot/
├── client/                 # React dashboard
│   ├── src/
│   │   ├── App.jsx        # Main dashboard component
│   │   ├── firebase.js    # Firebase configuration
│   │   └── ...
│   └── package.json
├── index.js               # Telegram bot listener
├── apply.js               # Job application logic
├── server.js              # Express API server
├── config.json            # Bot configuration
├── .env                   # Environment variables
└── package.json
```

## 🎮 Dashboard Features

- **Bot Control**: Start/stop listening with one click
- **Keywords Management**: Add/remove job keywords
- **Expertise Configuration**: Skills, experience, education
- **AI Prompt Editor**: Customize cover letter generation
- **Environment Variables**: Manage API keys and credentials
- **Real-Time Sync**: Changes sync via Firebase

## 📖 Documentation

- [Dashboard Setup](./DASHBOARD.md) - Complete dashboard guide
- [Bot Setup](./SETUP.md) - Bot configuration guide
- [Notifications](./NOTIFICATIONS.md) - Telegram notifications

## 🔧 Manual Bot Control

If you prefer to run the bot without the dashboard:

```bash
npm start
```

## 📝 License

ISC
