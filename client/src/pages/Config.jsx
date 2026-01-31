import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Save, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 5;

const Config = () => {
  const [config, setConfig] = useState({
    keywords: [],
    minimumKeywordMatches: 3,
    expertise: {
      skills: [],
      experience: [],
      education: '',
      languages: [],
      additionalInfo: ''
    },
    aiPrompt: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Local state for inputs
  const [newKeyword, setNewKeyword] = useState('');
  const [newSkill, setNewSkill] = useState('');

  // Pagination State
  const [pages, setPages] = useState({
      keywords: 1,
      skills: 1
  });

  // Load config
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'botConfig', 'main'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setConfig(prev => ({ ...prev, ...data }));
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'botConfig', 'main'), config, { merge: true });
      alert('Configuration saved!');
    } catch (error) {
      console.error(error);
      alert('Error saving');
    } finally {
      setSaving(false);
    }
  };

  // Helper to add item to array
  const addItem = (field, subField, value, setter) => {
    if (!value.trim()) return;
    
    // Reset to page 1 to see new item
    setPages(prev => ({ ...prev, [subField || field]: 1 }));

    if (subField) {
      setConfig(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [subField]: [...(prev[field][subField] || []), value.trim()]
        }
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), value.trim()]
      }));
    }
    setter('');
  };

  // Helper to remove item
  const removeItem = (field, subField, index) => {
    // We need to map the visual index back to the real index if using pagination
    // But wait, the remove button is on the rendered item.
    // So the 'index' passed here must be the TRUE index in the source array.
    
    if (subField) {
      setConfig(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [subField]: prev[field][subField].filter((_, i) => i !== index)
        }
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }));
    }
  };

  // Generic Paginated Table Component
  const PaginatedTable = ({ data, title, type, onDelete, pageName }) => {
      const page = pages[pageName];
      const totalPages = Math.ceil((data?.length || 0) / ITEMS_PER_PAGE);
      const startIdx = (page - 1) * ITEMS_PER_PAGE;
      const currentData = data?.slice(startIdx, startIdx + ITEMS_PER_PAGE) || [];

      const changePage = (delta) => {
          setPages(prev => ({
              ...prev,
              [pageName]: Math.max(1, Math.min(prev[pageName] + delta, totalPages))
          }));
      };

      return (
        <div style={{ overflow: 'hidden', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#1e293b' }}>
                    <tr>
                        <th style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>{title}</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '80px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {currentData.length === 0 ? (
                        <tr>
                            <td colSpan="2" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                No items found.
                            </td>
                        </tr>
                    ) : (
                        currentData.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #1e293b', background: idx % 2 === 0 ? 'transparent' : '#1e293b50' }}>
                                <td style={{ padding: '0.75rem 1rem', color: '#e2e8f0' }}>{item}</td>
                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                    <button 
                                        onClick={() => onDelete(startIdx + idx)} // Pass absolute index
                                        className="btn-icon-danger"
                                        title={`Delete ${type}`}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', borderRadius: '4px' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            
            {/* Pagination Controls */}
            {data?.length > ITEMS_PER_PAGE && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0.75rem 1rem', gap: '1rem', borderTop: '1px solid var(--border)', background: '#1e293b' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Page {page} of {totalPages}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                            onClick={() => changePage(-1)} 
                            disabled={page === 1}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, color: 'white' }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            onClick={() => changePage(1)} 
                            disabled={page === totalPages}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, color: 'white' }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
      );
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ width: '100%', paddingBottom: '4rem' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1>Configuration</h1>
           <p style={{ color: '#94a3b8' }}>Manage what jobs the bot looks for and how it applies.</p>
        </div>
        <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="card mb-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h2>🔑 Keywords & Filters</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Add New Keyword</label>
              <input 
                className="input-field" 
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="e.g. 'React Developer' or 'Remote'"
                onKeyPress={(e) => e.key === 'Enter' && addItem('keywords', null, newKeyword, setNewKeyword)}
                style={{ marginBottom: 0 }}
              />
          </div>
          <button className="btn btn-primary" onClick={() => addItem('keywords', null, newKeyword, setNewKeyword)}>
              <Plus size={18} /> Add
          </button>
          
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Min Matches</label>
              <input 
                  type="number" 
                  className="input-field"
                  style={{ width: '80px', marginBottom: 0, textAlign: 'center' }}
                  value={config.minimumKeywordMatches}
                  onChange={(e) => setConfig({...config, minimumKeywordMatches: parseInt(e.target.value)})} 
              />
          </div>
        </div>

        <PaginatedTable 
            data={config.keywords} 
            title="Active Keywords" 
            type="Keyword" 
            pageName="keywords"
            onDelete={(idx) => removeItem('keywords', null, idx)} 
        />
      </div>

      <div className="card mb-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h2>💼 Expertise (Skills)</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>Add New Skill</label>
              <input 
                className="input-field" 
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="e.g. 'JavaScript' or 'Project Management'"
                onKeyPress={(e) => e.key === 'Enter' && addItem('expertise', 'skills', newSkill, setNewSkill)}
                style={{ marginBottom: 0 }}
              />
          </div>
          <button className="btn btn-primary" onClick={() => addItem('expertise', 'skills', newSkill, setNewSkill)}>
              <Plus size={18} /> Add
          </button>
        </div>

        <PaginatedTable 
            data={config.expertise?.skills} 
            title="Relevant Skills" 
            type="Skill" 
            pageName="skills"
            onDelete={(idx) => removeItem('expertise', 'skills', idx)} 
        />
      </div>

      <div className="card mb-8">
        <h2>🤖 AI Prompt</h2>
        <p className="card-desc">Customize instructions for the AI cover letter generator.</p>
        <textarea 
          className="input-field" 
          rows={10}
          value={config.aiPrompt}
          onChange={(e) => setConfig({...config, aiPrompt: e.target.value})}
          style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
        />
      </div>
    </div>
  );
};

export default Config;
