const express = require('express');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, deleteDoc } = require('firebase/firestore');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkORDyMugXwT7Ap9lsogQQhV3X5ZWvjTY",
  authDomain: "auto-apply-f6ac3.firebaseapp.com",
  projectId: "auto-apply-f6ac3",
  storageBucket: "auto-apply-f6ac3.firebasestorage.app",
  messagingSenderId: "274176230170",
  appId: "1:274176230170:web:d1f8dde9e0a8adae8762a3",
  measurementId: "G-9V3WLFMTQF"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const PORT = process.env.PORT || 8080;

console.log("🚀 Starting Server...");

// Middleware
const allowedOrigins = ['https://forfitonly.netlify.app', 'http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Dynamically allow all origins for now to prevent connectivity issues
    return callback(null, true); 
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Root route for health checks
app.get('/', (req, res) => {
  res.json({ status: 'API Server is running', system: 'Afriwork Auto-Apply' });
});

let botProcess = null;
let isListening = false;

// API Routes

// Get bot status
app.get('/api/bot/status', (req, res) => {
  res.json({
    isRunning: botProcess !== null,
    isListening: isListening
  });
});

// Helper to get config from Firestore
async function getConfig() {
  try {
    const docRef = doc(db, 'botConfig', 'main');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching config form Firestore:', error);
    throw error;
  }
}

// Toggle bot (start/stop listening)
app.post('/api/bot/toggle', async (req, res) => {
  const { action } = req.body;

  try {
    if (action === 'start') {
      if (!botProcess) {
        // Fetch config to pass as env vars
        const config = await getConfig();
        if (!config) {
            throw new Error('Configuration not found in Database');
        }

        // Map Firestore camelCase config to UPPERCASE env vars for index.js
        const mappedEnv = {
            API_ID: config.env?.apiId || process.env.API_ID,
            API_HASH: config.env?.apiHash || process.env.API_HASH,
            SESSION: config.env?.session || process.env.SESSION,
            CHANNEL_ID: config.env?.channelId || process.env.CHANNEL_ID,
            TELEGRAM_USERNAME: config.env?.telegramUsername || process.env.TELEGRAM_USERNAME,
            TELEGRAM_INIT_DATA: config.env?.telegramInitData || process.env.TELEGRAM_INIT_DATA,
            GEMINI_API_KEY: config.env?.geminiApiKey || process.env.GEMINI_API_KEY,
            TARGET_USER_ID: config.env?.targetUserId || process.env.TARGET_USER_ID,
        };

        const env = { 
            ...process.env,
            ...mappedEnv, 
            BOT_CONFIG: JSON.stringify(config) 
        };

        // Start the bot process
        botProcess = spawn('node', ['index.js'], {
          cwd: path.join(__dirname),
          stdio: 'inherit',
          env: env
        });

        botProcess.on('exit', (code) => {
          console.log(`Bot process exited with code ${code}`);
          botProcess = null;
          isListening = false;
        });

        isListening = true;
      } else {
        isListening = true;
      }

      res.json({
        success: true,
        isRunning: true,
        isListening: true,
        message: 'Bot started listening'
      });
    } else if (action === 'stop') {
      if (botProcess) {
          botProcess.kill(); 
          botProcess = null;
      }
      isListening = false;

      res.json({
        success: true,
        isRunning: false,
        isListening: false,
        message: 'Bot stopped listening'
      });
    } else if (action === 'restart') {
        if (botProcess) {
            botProcess.kill();
            botProcess = null;
        }
        isListening = false;
        
        // Wait briefly then start
        setTimeout(async () => {
             const config = await getConfig();
             const mappedEnv = {
                TELEGRAM_SESSION: config.env?.session || process.env.TELEGRAM_SESSION,
                TELEGRAM_INIT_DATA: config.env?.telegramInitData || process.env.TELEGRAM_INIT_DATA,
                // Fix: Map to API_ID/API_HASH as expected by index.js
                API_ID: config.env?.apiId || process.env.API_ID || process.env.TELEGRAM_API_ID,
                API_HASH: config.env?.apiHash || process.env.API_HASH || process.env.TELEGRAM_API_HASH,
                SESSION: config.env?.session || process.env.SESSION || process.env.TELEGRAM_SESSION,
                
                TELEGRAM_USERNAME: config.env?.telegramUsername || process.env.TELEGRAM_USERNAME,
                CHANNEL_ID: config.env?.channelId || process.env.CHANNEL_ID,
                GEMINI_API_KEY: config.env?.geminiApiKey || process.env.GEMINI_API_KEY,
                TARGET_USER_ID: config.env?.targetUserId || process.env.TARGET_USER_ID,
            };
            const env = { 
                ...process.env,
                ...mappedEnv, 
                BOT_CONFIG: JSON.stringify(config) 
            };
            
            botProcess = spawn('node', ['index.js'], {
                cwd: path.join(__dirname),
                stdio: 'inherit',
                env: env
            });
            isListening = true;
            botProcess.on('exit', (code) => {
                console.log(`Bot process exited with code ${code}`);
                botProcess = null;
                isListening = false;
            });
        }, 1000);

        res.json({
            success: true,
            isRunning: true,
            message: 'Bot restarting...'
        });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid action. Use "start", "stop", or "restart"'
      });
    }
  } catch (error) {
    console.error('Error toggling bot:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Global Error Handlers to prevent crash
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

let AfriworkJobApplication;
try {
    AfriworkJobApplication = require('./apply');
    console.log("✅ Application module loaded.");
} catch (e) {
    console.error("⚠️ Failed to load apply.js:", e.message);
    // Define dummy class to prevent crash on manual apply
    AfriworkJobApplication = class {
        async autoApply() { return { success: false, error: "System module missing" }; }
    };
}

// ... (existing code)

// Save pending application
app.post('/api/bot/pending', async (req, res) => {
  const { jobId, jobDescription, jobTitle, companyName, matchedKeywords, coverLetter } = req.body;
  try {
      await setDoc(doc(db, 'pendingApplications', jobId), {
          jobId,
          jobDescription,
          jobTitle,
          companyName,
          matchedKeywords,
          coverLetter, // Save generated letter
          status: 'pending',
          timestamp: new Date().toISOString()
      });
      console.log(`📝 Job ${jobId} saved to pending applications.`);
      res.json({ success: true });
  } catch (err) {
      console.error('Error saving pending:', err);
      res.status(500).json({ success: false, error: err.message });
  }
});

// Manual apply trigger
app.post('/api/bot/manual-apply', async (req, res) => {
    const { jobId, jobDescription, jobTitle, companyName, manualCoverLetter } = req.body; 
    
    try {
        console.log(`🚀 Starting manual application for ${jobId}`);
        const config = await getConfig();
        if (!config) throw new Error('Config not found');

        // We need telegramInitData. If not in DB config, check process.env or .env file
        const telegramInitData = config.env?.telegramInitData || process.env.TELEGRAM_INIT_DATA;
        const telegramUsername = config.env?.telegramUsername || process.env.TELEGRAM_USERNAME;

        if (!telegramInitData) {
            throw new Error('Telegram Init Data missing. Please configure it in the dashboard.');
        }

        const bot = new AfriworkJobApplication(telegramInitData, config);
        // Pass manualCoverLetter to autoApply
        const result = await bot.autoApply(jobId, jobDescription, telegramUsername, manualCoverLetter);
        
        // Remove from pending list if successful (or failed, we acted on it)
        try {
            await deleteDoc(doc(db, 'pendingApplications', jobId));
        } catch (e) { console.error('Error removing from pending:', e); }

        // Log the result
        await setDoc(doc(db, 'jobHistory', jobId), {
            jobId,
            jobTitle: result.jobTitle || jobTitle,
            companyName: result.companyName || companyName,
            status: result.success ? 'success' : 'failed',
            error: result.error || null,
            timestamp: new Date().toISOString(),
            method: 'manual'
        });

        // Placeholder for updateStats - assuming it's defined elsewhere or will be added
        // await updateStats(result.success); 
        
        if (result.success) {
             res.json({ success: true, result });
        } else {
             res.status(400).json({ success: false, error: result.error });
        }

    } catch (error) {
        console.error('Manual apply error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update channel name for header
app.post('/api/bot/update-channel-name', async (req, res) => {
    const { channelName } = req.body;
    try {
        await setDoc(doc(db, 'botConfig', 'main'), { channelName }, { merge: true });
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating channel name:', error);
        res.status(500).json({ success: false });
    }
});

// Update configuration from Firebase (Dashboard writes to Firebase directly)
app.post('/api/config/update', async (req, res) => {
  res.json({
      success: true,
      message: 'Configuration updated'
  });
});

// Get current configuration
app.get('/api/config', async (req, res) => {
  try {
    const config = await getConfig();
    if (config) {
        res.json({
            success: true,
            config
        });
    } else {
        res.status(404).json({ success: false, message: 'Config not found' });
    }
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Server running on port ${PORT}`);
});
