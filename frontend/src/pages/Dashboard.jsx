import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', color: '#667eea' }}>TeamFlow</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#6b7280' }}>Welcome, <strong>{user?.name}</strong></span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px', background: '#ef4444', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{
        background: 'white', borderRadius: '16px', padding: '40px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>🎉 Auth is working!</h2>
        <p style={{ color: '#6b7280' }}>Workspace and Task UI coming on Day 6 & 7</p>
        <div style={{
          marginTop: '24px', padding: '16px', background: '#f0f2f5',
          borderRadius: '8px', textAlign: 'left'
        }}>
          <p><strong>User ID:</strong> {user?._id}</p>
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
