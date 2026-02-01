const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const fs = require("fs");
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');
require('dotenv').config();

// Firebase Init (to fetch/save config)
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

(async () => {
    console.log('🔐 Telegram Session Generator');
    console.log('============================\n');

    let apiId, apiHash;

    // Try to load from Firestore first
    try {
        const docRef = doc(db, 'botConfig', 'main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            apiId = data.env?.apiId;
            apiHash = data.env?.apiHash;
        }
    } catch (e) {
        console.error("Warning: Could not fetch config from Firestore.", e.message);
    }

    // Fallback to Env or Manual Input
    apiId = apiId || process.env.API_ID;
    apiHash = apiHash || process.env.API_HASH;

    if (!apiId || !apiHash) {
        console.log('⚠️  API_ID and API_HASH not found in Config.');
        apiId = await input.text("Enter API ID: ");
        apiHash = await input.text("Enter API HASH: ");
    }

    const client = new TelegramClient(new StringSession(""), Number(apiId), apiHash, {
        connectionRetries: 5,
    });

    console.log(`\nConnecting to Telegram (App ID: ${apiId})...`);
    
    await client.start({
        phoneNumber: async () => await input.text("Please enter your number (e.g. +251...): "),
        password: async () => await input.text("Please enter your password (if 2FA enabled): "),
        phoneCode: async () => await input.text("Please enter the code you received: "),
        onError: (err) => console.log(err),
    });

    const sessionString = client.session.save();
    console.log('\n✅ Login Successful!');
    console.log('==================================================');
    console.log('Here is your SESSION string (keep it safe!):');
    console.log('\n' + sessionString + '\n');
    console.log('==================================================');

    const saveChoice = await input.text("Do you want to save this directly to the database? (y/n): ");
    if (saveChoice.toLowerCase() === 'y') {
        try {
            await setDoc(doc(db, 'botConfig', 'main'), { 
                env: { 
                    session: sessionString,
                    apiId: String(apiId),
                    apiHash: apiHash 
                } 
            }, { merge: true });
            console.log('✅ Session saved to Firestore database!');
        } catch (e) {
            console.error('❌ Error saving to database:', e.message);
        }
    }

    console.log('\nYou can now run "npm run dev" to start the bot with this new session.');
    process.exit(0);
})();
