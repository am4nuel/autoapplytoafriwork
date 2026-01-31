import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import axios from 'axios';
import './App.css';

// Layout
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Config from './pages/Config';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Disposal from './pages/Disposal';
import Jobs from './pages/Jobs';

const API_URL =
   'https://autoapplytoafriwork-production.up.railway.app/api';

function App() {
  const [botStatus, setBotStatus] = useState({
    isRunning: false,
    isListening: false,
    lastUpdate: null
  });

  // Listen for bot status updates
  useEffect(() => {
    const checkStatus = async () => {
        try {
            const res = await axios.get(`${API_URL}/bot/status`);
            setBotStatus({
                isRunning: res.data.isRunning,
                isListening: res.data.isListening,
                lastUpdate: new Date()
            });
        } catch (e) {
            console.warn("Backend API not reachable");
            // Optionally set granular error state here
        }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Sync every 5s

    // Also fetch channel name for header
    const unsubConfig = onSnapshot(doc(db, 'botConfig', 'main'), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            // Try to find a friendly name if we saved one, else use ID
            window.channelName = data.channelName || data.env?.channelId || 'Target Channel';
        }
    });

    return () => {
        clearInterval(interval);
        unsubConfig();
    };
  }, []);

  return (
    <Router>
      <Layout isListening={botStatus.isListening}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/config" element={<Config />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/disposal" element={<Disposal />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
