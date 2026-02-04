import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, setDoc, orderBy } from 'firebase/firestore';
import { Check, X, Trash2, ChevronDown, ChevronUp, MessageSquare, Clock, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../apiConfig';

const Notifications = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'logs'
  const [notifications, setNotifications] = useState([]);
  const [channelLogs, setChannelLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedCoverLetters, setEditedCoverLetters] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  // Listen for Pending Applications (Manual Approval)
  useEffect(() => {
    const q = query(collection(db, 'pendingApplications'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(apps);
      if (activeTab === 'pending') setLoading(false);
    }, (error) => {
        console.error("Error fetching pending apps:", error);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [activeTab]);

  // Listen for Channel Job Logs
  useEffect(() => {
    const q = query(collection(db, 'channelJobLogs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChannelLogs(logs);
      if (activeTab === 'logs') setLoading(false);
    }, (error) => {
        console.error("Error fetching channel logs:", error);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [activeTab]);

  const toggleExpand = (id) => {
      setExpandedId(expandedId === id ? null : id);
  };

  const handleApprove = async (app) => {
    const finalCoverLetter = editedCoverLetters[app.id] || app.coverLetter;

    try {
       await axios.post(`${API_URL}/bot/manual-apply`, {
           jobId: app.jobId,
           jobDescription: app.jobDescription,
           jobTitle: app.jobTitle,
           companyName: app.companyName,
           manualCoverLetter: finalCoverLetter
       });
       
       await deleteDoc(doc(db, 'pendingApplications', app.id));
       alert('Application Approved & Processing!');
    } catch (error) {
        alert('Error approving application: ' + error.message);
    }
  };

  const handleDelete = async (collectionName, id, e) => {
    e.stopPropagation();
    const confirmMsg = collectionName === 'pendingApplications' 
        ? "Move this application to the Disposal Bin?" 
        : "Delete this channel log permanently?";
        
    if (window.confirm(confirmMsg)) {
        try {
            if (collectionName === 'pendingApplications') {
                const app = notifications.find(n => n.id === id);
                await setDoc(doc(db, 'disposal', id), {
                    ...app,
                    reason: 'Manual Removal',
                    disposedAt: new Date().toISOString()
                });
            }
            await deleteDoc(doc(db, collectionName, id));
        } catch (e) {
            console.error("Error deleting:", e);
            alert("Error: " + e.message);
        }
    }
  };

  const handleCoverLetterChange = (id, value) => {
    setEditedCoverLetters(prev => ({
        ...prev,
        [id]: value
    }));
  };

  const renderApplicationItem = (app) => {
    const isExpanded = expandedId === app.id;
    return (
      <div 
        key={app.id} 
        className="card" 
        style={{ cursor: 'pointer', transition: 'all 0.2s', padding: '1rem', border: isExpanded ? '1px solid var(--primary)' : '1px solid var(--border)' }}
        onClick={() => toggleExpand(app.id)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
             <div style={{ 
                width: '32px', height: '32px', borderRadius: '8px', 
                background: isExpanded ? 'var(--primary)' : '#1e293b', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isExpanded ? 'white' : '#64748b'
             }}>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
             </div>
             <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{app.jobTitle || 'Job Application'}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>{app.companyName || 'Unknown Company'}</p>
             </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="status-badge" style={{ 
                  color: '#f59e0b', borderColor: '#f59e0b20', background: '#f59e0b10', 
                  padding: '0.25rem 0.75rem', fontSize: '0.8rem' 
              }}>
                  Pending Approval
              </span>
              {!isExpanded && (
                  <button 
                    className="btn btn-small" 
                    style={{ padding: '0.4rem', color: 'var(--danger)', background: 'transparent' }}
                    onClick={(e) => handleDelete('pendingApplications', app.id, e)}
                  >
                      <Trash2 size={18} />
                  </button>
              )}
          </div>
        </div>
        
        {isExpanded && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                        <h4 style={{ color: '#94a3b8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MessageSquare size={16} /> Job Description
                        </h4>
                        <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#cbd5e1', border: '1px solid var(--border)' }}>
                            {app.jobDescription || 'No description available.'}
                        </div>
                        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            <strong>Matched Keywords:</strong> {app.matchedKeywords?.join(', ') || 'None'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h4 style={{ color: '#94a3b8', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShieldCheck size={16} /> AI Cover Letter
                            </h4>
                            <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Editable</span>
                        </div>
                        <textarea 
                            className="input-field"
                            value={editedCoverLetters[app.id] !== undefined ? editedCoverLetters[app.id] : (app.coverLetter || "Generating cover letter...")}
                            onChange={(e) => handleCoverLetterChange(app.id, e.target.value)}
                            style={{ flex: 1, minHeight: '300px', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-danger" onClick={(e) => handleDelete('pendingApplications', app.id, e)}>
                        <Trash2 size={18} /> Discard
                    </button>
                    <button className="btn btn-primary" onClick={() => handleApprove(app)}>
                        <Check size={18} /> Approve & Apply
                    </button>
                </div>
            </div>
        )}
      </div>
    );
  };

  const renderLogItem = (log) => {
    const isExpanded = expandedId === log.id;
    return (
      <div 
        key={log.id} 
        className="card" 
        style={{ cursor: 'pointer', transition: 'all 0.2s', padding: '1rem', border: isExpanded ? '1px solid var(--primary)' : '1px solid var(--border)' }}
        onClick={() => toggleExpand(log.id)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
             <div style={{ 
                width: '32px', height: '32px', borderRadius: '8px', 
                background: isExpanded ? 'var(--primary)' : '#1e293b', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isExpanded ? 'white' : '#64748b'
             }}>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
             </div>
             <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{log.jobTitle || 'Channel Message'}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={12} /> {new Date(log.timestamp).toLocaleString()}
                </p>
             </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                className="btn btn-small" 
                style={{ padding: '0.4rem', color: 'var(--danger)', background: 'transparent' }}
                onClick={(e) => handleDelete('channelJobLogs', log.id, e)}
              >
                  <Trash2 size={18} />
              </button>
          </div>
        </div>
        
        {isExpanded && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                <h4 style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Message Content</h4>
                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#cbd5e1', border: '1px solid var(--border)' }}>
                    {log.text || 'No content.'}
                </div>
                {log.jobId && (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)' }}>
                        <strong>Afriwork Job ID:</strong> {log.jobId}
                    </p>
                )}
            </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Notifications</h1>
        <div style={{ display: 'flex', background: '#1e293b', padding: '0.25rem', borderRadius: '0.75rem' }}>
            <button 
                onClick={() => setActiveTab('pending')}
                style={{ 
                    padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                    background: activeTab === 'pending' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'pending' ? 'white' : '#94a3b8',
                    transition: 'all 0.2s', fontWeight: '500'
                }}
            >
                Manual Approvals ({notifications.length})
            </button>
            <button 
                onClick={() => setActiveTab('logs')}
                style={{ 
                    padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                    background: activeTab === 'logs' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'logs' ? 'white' : '#94a3b8',
                    transition: 'all 0.2s', fontWeight: '500'
                }}
            >
                Channel Jobs ({channelLogs.length})
            </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading notifications...</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {activeTab === 'pending' ? (
                notifications.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>No pending approvals.</p>
                    <p>Great job! You're all caught up.</p>
                    </div>
                ) : (
                    notifications.map(app => renderApplicationItem(app))
                )
            ) : (
                channelLogs.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>No channel logs found.</p>
                    <p>The bot will log messages as they arrive.</p>
                    </div>
                ) : (
                    channelLogs.map(log => renderLogItem(log))
                )
            )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
