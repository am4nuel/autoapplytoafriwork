import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon, Bell, Briefcase, Sliders, X, Archive } from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Sliders, label: 'Configuration', path: '/config' },
    { icon: Briefcase, label: 'Job History', path: '/jobs' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      <div 
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} 
        onClick={toggleSidebar}
      />

      <aside className={`sidebar ${!isOpen ? 'closed' : ''}`}>
        <div className="sidebar-header">
          <Briefcase size={24} />
          <span>AutoApply</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => window.innerWidth < 768 && toggleSidebar()}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">TG</div>
            <div>
              <div style={{ fontWeight: 500 }}>Target User</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Connected</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
