import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">TeamFlow</h1>
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item">
            🏠 Dashboard
          </Link>
          <Link to="/workspaces" className="nav-item">
            📁 Workspaces
          </Link>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div>
              <p className="user-name">{user?.name}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;
