import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Check, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

const API_URL = 'https://autoapplytoafriwork-production.up.railway.app/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedCoverLetters, setEditedCoverLetters] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'pendingApplications'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(apps);
      setLoading(false);
    });
    return () => unsubscribe;
  }, []);

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

  const handleDecline = async (app, e) => {
    e.stopPropagation(); // Prevent toggling accordion
    if (window.confirm("Are you sure you want to remove this application? It will be moved to the Disposal Bin.")) {
        try {
            // Move to disposal
            await setDoc(doc(db, 'disposal', app.id), {
                ...app,
                reason: 'Manual Removal',
                disposedAt: new Date().toISOString()
            });
            // Remove from pending
            await deleteDoc(doc(db, 'pendingApplications', app.id));
            console.log("Moved to disposal and deleted from pending");
        } catch (e) {
            console.error("Error disposing:", e);
            alert("Error removing application: " + e.message);
        }
    }
  };

  const handleCoverLetterChange = (id, value) => {
    setEditedCoverLetters(prev => ({
        ...prev,
        [id]: value
    }));
  };

  if (loading) return <div>Loading notifications...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Notifications</h1>

      {notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>No pending approvals.</p>
          <p>Great job! You're all caught up.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {notifications.map(app => {
            const isExpanded = expandedId === app.id;
            return (
              <div 
                key={app.id} 
                className="card" 
                style={{ cursor: 'pointer', transition: 'all 0.2s', padding: '1rem' }}
                onClick={() => toggleExpand(app.id)}
              >
                {/* Header Row (Always Visible) */}
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
                      <span className="status-badge offline" style={{ 
                          color: '#f59e0b', borderColor: '#f59e0b20', background: '#f59e0b10', 
                          padding: '0.25rem 0.75rem', fontSize: '0.8rem' 
                      }}>
                          Pending
                      </span>
                      {/* Quick Actions in Header (Visible when collapsed too, or just when expanded? User asked for accordion) 
                          Let's keep them in expanded view to keep header clean, or maybe just a quick delete? 
                          I'll put them in the expanded body for clarity. 
                      */}
                      {!isExpanded && (
                          <button 
                            className="btn btn-small" 
                            style={{ padding: '0.4rem', color: 'var(--danger)', background: 'transparent' }}
                            onClick={(e) => handleDecline(app, e)}
                            title="Remove"
                          >
                              <Trash2 size={18} />
                          </button>
                      )}
                  </div>
                </div>
                
                {/* Expanded Content */}
                {isExpanded && (
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            {/* Left Column: Job Details */}
                            <div>
                                <h4 style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Job Description</h4>
                                <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '0.5rem', maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#cbd5e1', border: '1px solid var(--border)' }}>
                                    {app.jobDescription || 'No description available.'}
                                </div>
                                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    <strong>Matched Keywords:</strong> {app.matchedKeywords?.join(', ') || 'None'}
                                </p>
                            </div>

                            {/* Right Column: AI Cover Letter */}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <h4 style={{ color: '#94a3b8', margin: 0 }}>AI Cover Letter</h4>
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
                            <button className="btn btn-danger" onClick={(e) => handleDecline(app, e)}>
                                <Trash2 size={18} /> Remove
                            </button>
                            <button className="btn btn-primary" onClick={() => handleApprove(app)}>
                                <Check size={18} /> Approve & Apply
                            </button>
                        </div>
                    </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
