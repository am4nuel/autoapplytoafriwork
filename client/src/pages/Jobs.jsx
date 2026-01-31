import React from 'react';

const Jobs = () => {
    return (
        <div>
            <h1>Job History</h1>
            <div className="card">
                <p style={{ color: 'var(--text-muted)' }}>Job application history will appear here.</p>
                {/* Future implementation: List 'application_*.json' files or Firestore 'history' */}
            </div>
        </div>
    );
};
export default Jobs;
