import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Bell, Shield, Lock, Eye, EyeOff, Save, Power, CircleStop, RotateCcw } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../apiConfig';

const EnvInput = ({ label, value, onChange, placeholder, isSensitive = false, isVisible, onToggle }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <input 
        type={isSensitive && !isVisible ? "password" : "text"}
        className="input-field"
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        style={{ paddingRight: isSensitive ? '2.5rem' : '1rem' }}
      />
      {isSensitive && (
        <button 
          type="button"
          onClick={onToggle}
          style={{ 
            position: 'absolute', 
            right: '0.75rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 0,
            display: 'flex'
          }}
        >
          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      )}
    </div>
  </div>
);


const Settings = () => {
  const [config, setConfig] = useState({
    autoApply: true,
    env: {
      telegramUsername: '',
      geminiApiKey: '',
      telegramInitData: '',
      apiId: '',
      apiHash: '',
      session: '',
      channelId: '',
      targetUserId: ''
    }
  });

  const [saving, setSaving] = useState(false);
  const [showSensitive, setShowSensitive] = useState({});
  const [botStatus, setBotStatus] = useState({ isRunning: false, loading: true });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'botConfig', 'main'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (!data.env) data.env = {};
        setConfig(prev => ({ ...prev, ...data }));
      }
    });

    // Check bot status
    checkBotStatus();
    const interval = setInterval(checkBotStatus, 5000); // Poll status every 5s

    return () => {
        unsubscribe();
        clearInterval(interval);
    };
  }, []);

  const checkBotStatus = async () => {
      try {
          const res = await axios.get(`${API_URL}/bot/status`);
          setBotStatus(prev => ({ ...prev, isRunning: res.data.isRunning, loading: false }));
      } catch (err) {
          console.error("Error checking status:", err);
          setBotStatus(prev => ({ ...prev, loading: false }));
      }
  };

  const toggleBot = async (action) => {
      try {
          setBotStatus(prev => ({ ...prev, loading: true }));
          const res = await axios.post(`${API_URL}/bot/toggle`, { action });
          setBotStatus({ isRunning: res.data.isRunning, loading: false });
          alert(res.data.message);
      } catch (err) {
          console.error("Error toggling bot:", err);
          alert("Failed to toggle bot");
          setBotStatus(prev => ({ ...prev, loading: false }));
      }
  };

  const toggleAutoApply = async () => {
    const newValue = !config.autoApply;
    try {
      await setDoc(doc(db, 'botConfig', 'main'), { autoApply: newValue }, { merge: true });
    } catch (error) {
      console.error("Error updating setting:", error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'botConfig', 'main'), config, { merge: true });
      // Trigger system restart to apply changes
      await axios.post(`${API_URL}/bot/toggle`, { action: 'restart' });
      alert('Settings saved & System restarted!');
    } catch (error) {
       console.error(error);
       alert('Error saving settings');
    } finally {
        setSaving(false);
    }
  };

  const updateEnv = (key, value) => {
    setConfig(prev => ({
      ...prev,
      env: {
        ...prev.env,
        [key]: value
      }
    }));
  };

  const toggleSensitive = (key) => {
    setShowSensitive(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div style={{ width: '100%', paddingBottom: '4rem' }}>
      <div className="flex justify-between items-center mb-6">
         <h1>Settings</h1>
         <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
             <Save size={20} />
             {saving ? 'Saving...' : 'Save Settings'}
         </button>
      </div>

      <div className="card mb-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                 <h2><Power size={20} style={{ display: 'inline', marginRight: '8px' }} /> System Control</h2>
                 <p className="card-desc" style={{ marginBottom: 0 }}>
                    {botStatus.isRunning 
                        ? <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>● System is Online</span> 
                        : <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>● System is Offline</span>}
                    {' '}- Controls the Telegram listening process.
                 </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                    className="btn" 
                    style={{ backgroundColor: 'var(--text-main)', color: '#0f172a' }}
                    onClick={() => toggleBot('restart')}
                    disabled={botStatus.loading}
                >
                    <RotateCcw size={18} className={botStatus.loading ? 'spin' : ''} /> Restart System
                </button>
                {!botStatus.isRunning ? (
                    <button 
                        className="btn" 
                        style={{ backgroundColor: 'var(--success)', color: 'white' }}
                        onClick={() => toggleBot('start')}
                        disabled={botStatus.loading}
                    >
                        <Power size={18} /> Start Bot
                    </button>
                ) : (
                    <button 
                        className="btn" 
                        style={{ backgroundColor: 'var(--danger)', color: 'white' }}
                        onClick={() => toggleBot('stop')}
                        disabled={botStatus.loading}
                    >
                        <CircleStop size={18} /> Stop Bot
                    </button>
                )}
            </div>
        </div>
      </div>

      <div className="card mb-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2><Shield size={20} style={{ display: 'inline', marginRight: '8px' }} /> Auto-Apply Mode</h2>
            <p className="card-desc">
              When enabled, the bot applies to matching jobs immediately. <br/>
              When disabled, applications are sent to "Notifications" for manual approval.
            </p>
          </div>
          
          <div 
            className={`toggle-switch ${config.autoApply ? 'active' : ''}`}
            onClick={toggleAutoApply}
          >
            <div className="toggle-thumb" />
          </div>
        </div>
      </div>

      <div className="card mb-8" style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}>
        <h2 style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock size={20} /> Environment Variables
        </h2>
        <p className="card-desc">
          Sensitive configuration for API access. These values are stored securely in Firestore.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <EnvInput 
             label="Telegram Username" 
             value={config.env?.telegramUsername} 
             onChange={(e) => updateEnv('telegramUsername', e.target.value)} 
             placeholder="@username" 
          />
          <EnvInput 
             label="Target User ID" 
             value={config.env?.targetUserId} 
             onChange={(e) => updateEnv('targetUserId', e.target.value)} 
             placeholder="12345678" 
          />
          
          <EnvInput 
             label="Channel ID" 
             value={config.env?.channelId} 
             onChange={(e) => updateEnv('channelId', e.target.value)} 
             placeholder="-100..." 
          />
          <EnvInput 
             label="Gemini API Key" 
             value={config.env?.geminiApiKey} 
             onChange={(e) => updateEnv('geminiApiKey', e.target.value)} 
             placeholder="AIzaSy..." 
             isSensitive 
             isVisible={showSensitive['geminiApiKey']}
             onToggle={() => toggleSensitive('geminiApiKey')}
          />
          
          <EnvInput 
             label="API ID" 
             value={config.env?.apiId} 
             onChange={(e) => updateEnv('apiId', e.target.value)} 
             placeholder="123456" 
          />
          <EnvInput 
             label="API Hash" 
             value={config.env?.apiHash} 
             onChange={(e) => updateEnv('apiHash', e.target.value)} 
             placeholder="abcdef..." 
             isSensitive
             isVisible={showSensitive['apiHash']}
             onToggle={() => toggleSensitive('apiHash')}
          />
        </div>

        <div style={{ marginTop: '1.5rem' }}>
           <EnvInput 
             label="Telegram Session String" 
             value={config.env?.session} 
             onChange={(e) => updateEnv('session', e.target.value)} 
             placeholder="1BAA..." 
             isSensitive
             isVisible={showSensitive['session']}
             onToggle={() => toggleSensitive('session')}
           />
        </div>

        <div style={{ marginTop: '0.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>Telegram Init Data (Afriwork Auth)</label>
            <textarea 
              className="input-field" 
              rows={4}
              value={config.env?.telegramInitData || ''}
              onChange={(e) => updateEnv('telegramInitData', e.target.value)}
              placeholder="user=..."
              style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
        </div>
      </div>

      <div className="card">
        <h2><Bell size={20} style={{ display: 'inline', marginRight: '8px' }} /> Notification Preferences</h2>
        <p className="card-desc">Configure how you want to be notified.</p>
        
        {/* Placeholder for future detailed notification settings */}
        <div style={{ opacity: 0.5 }}>
            <p>Telegram Notifications: <span style={{ color: 'var(--success)' }}>Enabled</span></p>
            <p>Email Notifications: <span style={{ color: 'var(--text-muted)' }}>Coming Soon</span></p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
