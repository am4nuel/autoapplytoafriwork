import React, { useState, useEffect } from 'react';
import { Menu, Wifi, WifiOff } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = ({ children, isListening }) => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-container">
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
      />
      
      <main className="main-content" style={{ marginLeft: sidebarOpen ? '260px' : '0' }}>
        <header className="top-header">
          <button 
            className="menu-toggle" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={24} />
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isListening && (
                 <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span>
                    Monitoring: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{window.channelName || 'Target Channel'}</span>
                 </div>
            )}
            <div className={`status-badge ${isListening ? 'online' : 'offline'}`}>
              {isListening ? <Wifi size={16} /> : <WifiOff size={16} />}
              <span>{isListening ? 'System Online' : 'System Offline'}</span>
            </div>
          </div>
        </header>

        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
