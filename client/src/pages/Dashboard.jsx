import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { 
  Briefcase, 
  CheckCircle, 
  XCircle, 
  Clock 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="stat-card">
    <div className="stat-header">
      <div>
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value}</div>
      </div>
      <div className="icon-box" style={{ color: color, backgroundColor: `${color}20` }}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalApplications: 0,
    successful: 0,
    failed: 0,
    pending: 0
  });

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // 1. Subscribe to aggregated stats
    const unsubStats = onSnapshot(doc(db, 'botStats', 'main'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setStats(prev => ({
            ...prev,
            totalApplications: (data.totalApplications || 0),
            successful: (data.successful || 0),
            failed: (data.failed || 0)
        }));
      }
    });

    // 2. Subscribe to pending count (collection size)
    const qPending = query(collection(db, 'pendingApplications'));
    const unsubPending = onSnapshot(qPending, (snapshot) => {
        setStats(prev => ({ ...prev, pending: snapshot.size }));
    });

    // 3. Fetch Job History for Chart (Activity over last 7 days)
    const fetchHistory = async () => {
        // This is a basic implementation. For production, you'd want aggregation on the server.
        // Or fetch last 50 apps and map them.
        try {
            const hRef = collection(db, 'jobHistory');
            const qHistory = query(hRef, orderBy('timestamp', 'desc'), limit(50));
            const snapshot = await getDocs(qHistory);
            
            // Allow basic grouping by day
            const dayMap = {};
            // Initialize last 7 days with 0
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
                dayMap[dayStr] = 0;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.timestamp) {
                    const date = new Date(data.timestamp);
                    const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
                    // Only count if it's in our map (last 7 days)
                    if (dayMap[dayStr] !== undefined) {
                        dayMap[dayStr]++;
                    }
                }
            });

            const formattedChartData = Object.keys(dayMap).map(day => ({
                name: day,
                applications: dayMap[day]
            }));

            // Re-sort because Object.keys extraction order isn't guaranteed (though mostly is)
            // But we initialized them in order, however looping map creates specific key order.
            // Better to just push to array daily. But this is fine for MVP.
            
            setChartData(formattedChartData);

        } catch (e) {
            console.error("Error fetching history for chart:", e);
        }
    };

    fetchHistory();

    return () => {
        unsubStats();
        unsubPending();
    };
  }, []);

  return (
    <div>
      <h1 className="mb-8">Dashboard Overview</h1>
      
      <div className="stats-grid">
        <StatCard 
          title="Total Applications" 
          value={stats.totalApplications}
          icon={Briefcase} 
          color="var(--primary)" 
        />
        <StatCard 
          title="Successful" 
          value={stats.successful}
          icon={CheckCircle} 
          color="var(--success)" 
        />
        <StatCard 
          title="Rejected/Failed" 
          value={stats.failed} 
          icon={XCircle} 
          color="var(--danger)" 
        />
        <StatCard 
          title="Pending Approval" 
          value={stats.pending} 
          icon={Clock} 
          color="#f59e0b" 
        />
      </div>

      <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
        <h2>Application Activity (Last 7 Days)</h2>
        <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Area 
              type="monotone" 
              dataKey="applications" 
              stroke="var(--primary)" 
              fill="var(--primary)" 
              fillOpacity={0.1} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;
