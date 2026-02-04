const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");
const dotenv = require("dotenv");
const fs = require("fs");
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, collection } = require('firebase/firestore');
const AfriworkJobApplication = require("./apply");

dotenv.config();

// Firebase Configuration (Same as server.js)
const firebaseConfig = {
  apiKey: "AIzaSyBkORDyMugXwT7Ap9lsogQQhV3X5ZWvjTY",
  authDomain: "auto-apply-f6ac3.firebaseapp.com",
  projectId: "auto-apply-f6ac3",
  storageBucket: "auto-apply-f6ac3.firebasestorage.app",
  messagingSenderId: "274176230170",
  appId: "1:274176230170:web:d1f8dde9e0a8adae8762a3",
  measurementId: "G-9V3WLFMTQF"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);




// Global configuration state
let config = {};
let keywords = [];
let minimumKeywordMatches = 3;
let channelId = "";
let telegramUsername = "";
let telegramInitData = "";
let targetUserId = "";
let geminiApiKey = "";

// Internal API Port for communication between index.js and server.js
const INTERNAL_API_PORT = process.env.PORT || 5000;
const INTERNAL_API_URL = `http://127.0.0.1:${INTERNAL_API_PORT}`;

/**
 * Log activity to Firestore and Console
 */
async function logActivity(type, message, details = {}) {
    const timestamp = new Date().toISOString();
    const date = new Date(timestamp).toLocaleString();
    
    // Console log with style
    const icon = {
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌',
        'bot': '🤖',
        'channel': '📨',
        'apply': '🎯'
    }[type] || '📝';
    
    console.log(`${icon} [${date}] ${message}`);

    try {
        const logRef = doc(collection(db, 'botActivity'));
        await setDoc(logRef, {
            type,
            message,
            details,
            timestamp,
            date
        });
    } catch (err) {
        console.error('⚠️ Failed to log activity to Firestore:', err.message);
    }
}

// Load configuration
async function loadConfig() {
    if (process.env.BOT_CONFIG) {
        console.log('✅ Configuration loaded from environment');
        return JSON.parse(process.env.BOT_CONFIG);
    }
    
    try {
        console.log('📡 Fetching configuration from Firestore...');
        const docRef = doc(db, 'botConfig', 'main');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log('✅ Configuration loaded from Firestore');
            return docSnap.data();
        } else {
            if (fs.existsSync('./config.json')) {
                console.log('⚠️  Configuration loaded from config.json (Legacy Mode)');
                return JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
            } else {
                console.error('❌ No configuration found in Firestore or config.json');
                return null;
            }
        }
    } catch (error) {
        console.error('❌ Error loading configuration from Firestore:', error.message);
        return null; // Don't exit yet, might have partial env vars
    }
}


/**
 * Extract job ID from reply markup URL
 */
function extractJobIdFromMessage(message) {
    try {
        if (message.replyMarkup && message.replyMarkup.rows) {
            for (const row of message.replyMarkup.rows) {
                for (const button of row.buttons) {
                    if (button.url && button.url.includes('startapp=')) {
                        const jobId = button.url.split('startapp=')[1];
                        return jobId;
                    }
                }
            }
        }

        // Fallback for testing with manual text messages
        // If no buttons, but it matched keywords, treat as TEST-ID
        console.log("⚠️ No Job ID found in buttons. Generating TEST-ID for verification.");
        return `TEST-${Date.now()}`;

    } catch (error) {
        console.error('Error extracting job ID:', error.message);
    }
    return null;
}

/**
 * Check if message matches job keywords
 */
function matchesJobKeywords(messageText) {
    if (!messageText) return { matches: false, count: 0, foundKeywords: [] };
    
    const lowerText = messageText.toLowerCase();
    const foundKeywords = [];
    
    for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
            foundKeywords.push(keyword);
        }
    }
    
    const matches = foundKeywords.length >= minimumKeywordMatches;
    return { matches, count: foundKeywords.length, foundKeywords };
}

/**
 * Send notification to target user
 */
async function sendNotificationToUser(client, jobId, jobTitle, companyName, success, applicationId = null, errorMessage = null) {
    try {
        if (!targetUserId) {
            console.log('⚠️  targetUserId not set, skipping user notification');
            return;
        }

        let message = '';
        if (success) {
            message = `✅ **Application Submitted Successfully!**\n\n`;
            message += `📋 **Job ID:** ${jobId}\n`;
            if (jobTitle) message += `💼 **Position:** ${jobTitle}\n`;
            if (companyName) message += `🏢 **Company:** ${companyName}\n`;
            if (applicationId) message += `🆔 **Application ID:** ${applicationId}\n`;
            message += `\n🎉 Your application has been automatically submitted!`;
        } else {
            message = `❌ **Application Failed**\n\n`;
            message += `📋 **Job ID:** ${jobId}\n`;
            if (jobTitle) message += `💼 **Position:** ${jobTitle}\n`;
            if (errorMessage) message += `\n⚠️ **Error:** ${errorMessage}`;
        }

        // If targetUserId is the same as the bot's own ID, Telegram treats it as "Saved Messages"
        await client.sendMessage(String(targetUserId), { message });
        console.log(`📤 Notification sent to user ${targetUserId}`);
    } catch (error) {
        console.error('Error sending notification to user:', error.message);
    }
}

/**
 * Process job application
 */
async function processJobApplication(message, client) {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('🎯 NEW JOB OPPORTUNITY DETECTED!');
        console.log('='.repeat(70));
        
        const jobId = extractJobIdFromMessage(message);
        if (!jobId) {
            console.log('⚠️  Could not extract job ID from message, skipping...');
            return;
        }
        
        console.log(`📋 Job ID: ${jobId}`);
        console.log(`📅 Posted: ${new Date(message.date * 1000).toLocaleString()}`);
        
        const messageText = message.message || '';
        const keywordCheck = matchesJobKeywords(messageText);
        
        await logActivity('info', `Analyzed keywords for Job ${jobId}`, {
            found: keywordCheck.foundKeywords,
            count: keywordCheck.count,
            required: minimumKeywordMatches,
            matches: keywordCheck.matches
        });
        
        if (!keywordCheck.matches) {
            await logActivity('warning', `Skipping Job ${jobId}: Not enough keyword matches.`);
            return;
        }
        
        await logActivity('apply', `Keyword threshold met! Processing Job: ${jobId}`);
        
        // Extract job description from message
        const jobDescription = messageText.substring(0, 1000); // Limit to 1000 chars
        
        // Extract job title from message (first line usually)
        const jobTitle = messageText.split('\n')[0].replace('Job Title:', '').trim();
        
        // Validate required environment variables
        if (!telegramInitData) {
            console.error('❌ TELEGRAM_INIT_DATA not set!');
            await sendNotificationToUser(client, jobId, jobTitle, null, false, null, 'TELEGRAM_INIT_DATA not configured');
            return;
        }
        
        if (!geminiApiKey) {
            console.error('❌ GEMINI_API_KEY not set!');
            await sendNotificationToUser(client, jobId, jobTitle, null, false, null, 'GEMINI_API_KEY not configured');
            return;
        }

        // Check Auto-Apply Setting
        // If config.autoApply is false OR if it's a TEST-ID (no real ID found), force manual approval.
        const isTestId = jobId.startsWith('TEST-');
        
        if (config.autoApply === false || isTestId) { 
            if (isTestId) {
                await logActivity('info', `Job ID missing (TEST-ID). Forcing Manual Approval for: ${jobId}`);
            } else {
                await logActivity('info', `Auto-apply is OFF. Queuing for manual approval: ${jobTitle}`);
            }
            
            const bot = new AfriworkJobApplication(telegramInitData, config);
            let generatedCoverLetter = "Generating...";
            let fullJobDescription = jobDescription;
            let fetchedCompanyName = null;

            try {
                // If it is a TEST-ID, skip getJobDetails and cover letter generation
                if (jobId.startsWith('TEST-')) {
                     generatedCoverLetter = "Manual Application - No Job ID found. Please write cover letter manually.";
                     fetchedCompanyName = "Manual Test Job";
                     console.log("ℹ️  Skipping cover letter generation for TEST-ID.");
                } else {
                     // Get full details including company name
                     const jobDataRes = await bot.getJobDetails(jobId);
                     if (jobDataRes.data?.view_job_details?.[0]) {
                         const jobData = jobDataRes.data.view_job_details[0];
                         fullJobDescription = jobData.description || jobDescription;
                         fetchedCompanyName = jobData.entity?.name;
                         generatedCoverLetter = await bot.generateCoverLetter(fullJobDescription);
                     } else {
                         // Fallback if details fetch fails
                         generatedCoverLetter = await bot.generateCoverLetter(jobDescription);
                     }
                }
            } catch (genErr) {
                console.error("Error generating initial cover letter:", genErr);
                generatedCoverLetter = "Error generating cover letter. Please edit manually.";
            }

            // Send to server pending queue
            try {
                const axios = require('axios'); // Ensure axios is available
                await axios.post(`${INTERNAL_API_URL}/api/bot/pending`, {
                    jobId,
                    jobDescription: fullJobDescription,
                    coverLetter: generatedCoverLetter, // Save generated letter
                    jobTitle,
                    companyName: fetchedCompanyName, 
                    matchedKeywords: keywordCheck.foundKeywords
                });
                
                await sendNotificationToUser(
                    client,
                    jobId,
                    jobTitle,
                    fetchedCompanyName,
                    false, // success = false (technically pending)
                    null,
                    'Requires Manual Approval (Check Dashboard)'
                );
                await logActivity('success', `Job added to pending queue: ${jobTitle}`);
            } catch (err) {
                await logActivity('error', 'Failed to queue pending application', { error: err.message });
            }
            return;
        }
        
        // Create application instance and apply
        await logActivity('apply', `Auto-applying to job: ${jobTitle}...`);
        const bot = new AfriworkJobApplication(telegramInitData, config);
        const result = await bot.autoApply(jobId, jobDescription, telegramUsername);
        
        // Log to Server API for Dashboard
        try {
            const axios = require('axios');
            await axios.post(`${INTERNAL_API_URL}/api/bot/log-application`, {
                jobId,
                jobTitle: result.jobTitle || jobTitle,
                companyName: result.companyName,
                success: result.success,
                error: result.error || null,
                timestamp: new Date().toISOString()
            });
        } catch (logErr) {
            console.error('⚠️ Failed to log application to dashboard:', logErr.message);
        }

        if (result && result.success) {
            await logActivity('success', `Application successful! ID: ${result.applicationId || 'N/A'}`);
            await sendNotificationToUser(
                client, 
                jobId, 
                result.jobTitle || jobTitle, 
                result.companyName, 
                true, 
                result.applicationId
            );
        } else {
            await logActivity('warning', `Application failed: ${result?.error || 'Unknown error'}`);
            await sendNotificationToUser(
                client, 
                jobId, 
                jobTitle, 
                null, 
                false, 
                null, 
                result?.error || 'Unknown error occurred'
            );
        }
        
        console.log('='.repeat(70) + '\n');
        
    } catch (error) {
        console.error('❌ Error processing job application:', error.message);
        console.error(error.stack);
        
        try {
            await sendNotificationToUser(
                client, 
                'unknown', 
                null, 
                null, 
                false, 
                null, 
                error.message
            );
        } catch (notifyError) {
            console.error('Failed to send error notification:', notifyError.message);
        }
    }
}

(async () => {
    // 1. Initial Load from Firestore
    const loadedConfig = await loadConfig();
    if (!loadedConfig) {
        console.error("❌ Critical Error: Could not load configuration from any source.");
        process.exit(1);
    }

    // 2. Map global configuration from loadedConfig or process.env fallbacks
    config = loadedConfig;
    keywords = (config.keywords || []).map(k => k.toLowerCase());
    minimumKeywordMatches = config.minimumKeywordMatches || 3;
    
    const channelIdRaw = config.env?.channelId || process.env.CHANNEL_ID || "";
    channelId = channelIdRaw;
    if (channelIdRaw.match(/^\d+$/) && channelIdRaw.length >= 10) {
        channelId = `-100${channelIdRaw}`;
    }

    telegramUsername = config.env?.telegramUsername || process.env.TELEGRAM_USERNAME || "";
    telegramInitData = config.env?.telegramInitData || process.env.TELEGRAM_INIT_DATA || "";
    targetUserId = config.env?.targetUserId || process.env.TARGET_USER_ID || "";
    geminiApiKey = config.env?.geminiApiKey || process.env.GEMINI_API_KEY || "";

    // 3. Telegram Connection Credentials
    const apiId = parseInt(config.env?.apiId || process.env.API_ID || "0");
    const apiHash = config.env?.apiHash || process.env.API_HASH || "";
    const sessionStr = config.env?.session || process.env.SESSION || "";
    const stringSession = new StringSession(sessionStr);

    console.log('\n' + '='.repeat(70));
    console.log('🤖 AFRIWORK AUTO-APPLY BOT');
    console.log('='.repeat(70));
    console.log(`📡 Monitoring Channel: ${channelId}`);
    console.log(`👤 Telegram Username: ${telegramUsername || 'Not set'}`);
    console.log(`🔑 Keywords: ${keywords.length} loaded`);
    console.log(`📊 Minimum Matches Required: ${minimumKeywordMatches}`);
    console.log('='.repeat(70) + '\n');
    
    if (apiId === 0 || !apiHash) {
        console.error('❌ API_ID or API_HASH is missing! Please configure them in Dashboard Settings.');
        process.exit(1);
    }

    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 10,
        requestRetries: 5,
        autoReconnect: true,
        useOldUpdateSystem: true, // Known to be more stable for long-running bots
    });

    let running = true;
    while (running) {
        try {
            // Small delay to prevent AUTH_KEY_DUPLICATED
            await new Promise(resolve => setTimeout(resolve, 2000));

            await logActivity('bot', 'Connecting to Telegram...');
            const isTTY = process.stdout.isTTY;
            
            await client.start({
                phoneNumber: async () => {
                    if (isTTY) {
                         return await input.text("Please enter your number: ");
                    }
                    throw new Error("❌ Session Missing & Non-Interactive Mode. \n   >>> Please run 'npm run login' to generate a session string first!");
                },
                password: async () => isTTY ? await input.text("Please enter your password: ") : "",
                phoneCode: async () => isTTY ? await input.text("Please enter the code you received: ") : "",
                onError: (err) => logActivity('error', 'Client Start Error', { error: err.message }),
            });

            await logActivity('success', 'Bot successfully connected to Telegram!');
            const me = await client.getMe();
            console.log(`🤖 Authenticated as: ${me.username} (ID: ${me.id})`);
            console.log(`🎯 Target User ID: ${targetUserId}`);
            
            if (String(me.id) === String(targetUserId)) {
                console.log('⚠️  NOTE: Bot ID matches Target ID. Messages will appear in "Saved Messages".');
            }

            // Save session string to Firestore for persistence
            try {
                const sessionString = client.session.save();
                await setDoc(doc(db, 'botConfig', 'main'), { 
                    env: { 
                        session: sessionString
                    } 
                }, { merge: true });
                await logActivity('success', 'Session string saved to Firestore.');
            } catch (sessionSaveError) {
                await logActivity('error', 'Failed to save session to Firestore', { error: sessionSaveError.message });
            }

            await logActivity('info', 'Bot is listening for new channel messages...');

            // Add event handler for new messages
            client.addEventHandler(async (event) => {
                try {
                    const message = event.message;
                    
                    // Check if message is from the target channel
                    const peerId = message.peerId;
                    const channelIdFromMessage = peerId?.channelId?.toString();
                    
                    // Log all incoming messages for debugging
                    console.log(`📨 New message in channel ${channelIdFromMessage}`);
                    
                    if (channelIdFromMessage === channelIdRaw || 
                        channelIdFromMessage === channelId.replace('-100', '')) {
                        
                        await logActivity('channel', 'Message from target channel detected.');
                        
                        // Log all messages to Firestore
                        try {
                            const logId = message.id ? String(message.id) : `log-${Date.now()}`;
                            await setDoc(doc(db, 'channelJobLogs', logId), {
                                messageId: message.id,
                                text: message.message || '',
                                date: message.date,
                                timestamp: new Date().toISOString(),
                                channelId: channelIdFromMessage,
                                jobId: extractJobIdFromMessage(message),
                                // Basic extraction for title/company if possible
                                jobTitle: (message.message || '').split('\n')[0].replace('Job Title:', '').trim().substring(0, 100),
                            }, { merge: true });
                        } catch (logErr) {
                            console.error('⚠️ Failed to log message to channelJobLogs:', logErr.message);
                        }

                        // Process the job application (pass client for notifications)
                        await processJobApplication(message, client);
                    } else {
                        // Optional: Log ignored messages too? User said "target chanel activty".
                        // Let's not spam DB with other channels, but console is fine.
                        console.log(`⏭️  Message from different channel (${channelIdFromMessage}), ignoring...`);
                    }
                } catch (error) {
                    console.error('Error handling message:', error.message);
                }
            }, new NewMessage({}));

            // Fetch and save channel info for Dashboard Header
            try {
               const entity = await client.getEntity(channelId);
               if (entity) {
                   const channelName = entity.title || entity.className || 'Unknown Channel';
                   console.log(`ℹ️  Channel Name: ${channelName}`);
                   
                   // Save to DB via Server API
                   const axios = require('axios');
                   await axios.post(`${INTERNAL_API_URL}/api/bot/update-channel-name`, { channelName });
               }
            } catch (e) {
                console.error("⚠️  Could not fetch channel info:", e.message);
            }

            console.log('🚀 Bot is now running and monitoring for new jobs!');
            console.log('Press Ctrl+C to stop.\n');

            // Keep the script running
            await new Promise(() => {});

        } catch (error) {
            await logActivity('error', 'Bot process encountered an error', { 
                error: error.message,
                stack: error.stack?.substring(0, 500)
            });
            console.error("❌ Error occurred:", error);
            
            if (error.message.includes('TIMEOUT')) {
                await logActivity('bot', 'Network timeout detected. Attempting to reconnect in 10 seconds...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                // For other errors, still try to reconnect after a delay unless it's fatal
                console.log('⏳ Attempting automatic recovery in 15 seconds...');
                await new Promise(resolve => setTimeout(resolve, 15000));
            }

            try {
                await client.disconnect();
            } catch (disconnectError) {
                console.error("Failed to disconnect:", disconnectError.message);
            }
        }
    }
})();
