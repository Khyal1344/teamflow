import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import '../components/layout/Layout.css';
import { getWorkspaces } from '../api/workspace';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkspaces()
      .then((res) => setWorkspaces(res.data.workspaces))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h2 className="page-title">Welcome back, {user?.name} 👋</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📁</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#667eea' }}>
            {loading ? '...' : workspaces.length}
          </div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Workspaces</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>0</div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>Tasks Completed</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>0</div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>In Progress</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Your Workspaces</h3>
          <button className="btn btn-primary" onClick={() => navigate('/workspaces')}>View All</button>
        </div>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : workspaces.length === 0 ? (
          <div className="empty-state">
            <h3>No workspaces yet</h3>
            <p>Go to Workspaces to create your first one</p>
          </div>
        ) : (
          <div className="workspace-grid">
            {workspaces.slice(0, 4).map((ws) => (
              <div key={ws._id} className="workspace-card card"
                onClick={() => navigate(`/workspaces/${ws._id}`)}
                style={{ cursor: 'pointer', border: '1px solid #e5e7eb' }}>
                <div className="workspace-icon">{ws.name.charAt(0).toUpperCase()}</div>
                <div className="workspace-info">
                  <h3>{ws.name}</h3>
                  <span className="member-count">👥 {ws.members?.length || 0} members</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
