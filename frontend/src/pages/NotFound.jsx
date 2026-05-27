import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '48px',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>404</div>
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#1a1a2e' }}>
          Page Not Found
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          The page you are looking for does not exist.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '12px 24px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white', border: 'none', borderRadius: '8px',
            fontSize: '15px', fontWeight: '600', cursor: 'pointer'
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
