import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Trash2, Archive } from 'lucide-react';

const Disposal = () => {
  const [disposedApps, setDisposedApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Assuming 'disposal' collection exists
    const q = query(collection(db, 'disposal'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDisposedApps(apps);
      setLoading(false);
    });
    return () => unsubscribe;
  }, []);

  const handlePermanentDelete = async (id) => {
    if (window.confirm("Permanently delete this record?")) {
        await deleteDoc(doc(db, 'disposal', id));
    }
  };

  const handleClearAll = async () => {
      if (window.confirm("Are you sure you want to clear ALL disposed items?")) {
          const batch = [];
           // We'd use a batch commit here but for simplicity in this snippet we'll just loop (careful with large lists)
          for (const app of disposedApps) {
              await deleteDoc(doc(db, 'disposal', app.id));
          }
      }
  };

  if (loading) return <div>Loading disposal bin...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
         <h1><Archive size={24} style={{ display: 'inline', marginRight: '10px' }}/> Disposal Bin</h1>
         {disposedApps.length > 0 && (
            <button className="btn btn-danger" onClick={handleClearAll}>
                <Trash2 size={18} /> Clear All
            </button>
         )}
      </div>

      {disposedApps.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
          <p>The disposal bin is empty.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {disposedApps.map(app => (
            <div key={app.id} className="card" style={{borderColor: 'var(--border)'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#94a3b8' }}>{app.jobTitle || 'Unknown Job'}</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(app.timestamp).toLocaleString()}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Reason: {app.reason || 'Manual Removal'}</p>
              
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                 <button className="btn btn-small" style={{ color: 'var(--danger)', background: 'transparent', border: '1px solid var(--danger)' }} onClick={() => handlePermanentDelete(app.id)}>
                    <Trash2 size={14} /> Delete Forever
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Disposal;
