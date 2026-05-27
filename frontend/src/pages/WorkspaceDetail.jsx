import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import '../components/layout/Layout.css';
import { getWorkspace, inviteMember, removeMember, deleteWorkspace } from '../api/workspace';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const WorkspaceDetail = () => {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState('member');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [inviting, setInviting] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  const fetchWorkspace = async () => {
    try {
      const res = await getWorkspace(workspaceId);
      const ws = res.data.workspace;
      setWorkspace(ws);
      // Find current user's role
      const me = ws.members.find((m) => m.user._id === user._id);
      if (me) setMyRole(me.role);
    } catch {
      toast.error('Failed to load workspace');
      navigate('/workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email) return toast.error('Email is required');
    setInviting(true);
    try {
      await inviteMember(workspaceId, inviteForm);
      toast.success('Member invited!');
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'member' });
      fetchWorkspace();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from this workspace?`)) return;
    try {
      await removeMember(workspaceId, userId);
      toast.success('Member removed');
      fetchWorkspace();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!window.confirm('Delete this workspace? This cannot be undone.')) return;
    try {
      await deleteWorkspace(workspaceId);
      toast.success('Workspace deleted');
      navigate('/workspaces');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete workspace');
    }
  };

  if (loading) return <Layout><div className="loading">Loading workspace...</div></Layout>;
  if (!workspace) return null;

  return (
    <Layout>
      {/* Header */}
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate('/workspaces')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667eea', marginBottom: '8px', fontSize: '14px' }}
          >
            ← Back to Workspaces
          </button>
          <h2 className="page-title">{workspace.name}</h2>
          {workspace.description && (
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>{workspace.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {myRole === 'admin' && (
            <>
              <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
                + Invite Member
              </button>
              <button className="btn btn-danger" onClick={handleDeleteWorkspace}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => { setActiveTab('tasks'); navigate(`/workspaces/${workspaceId}/tasks`); }}
        >
          📋 Tasks
        </button>
        <button
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          👥 Members ({workspace.members.length})
        </button>
      </div>

      {/* Members Tab */}
      <div className="card" style={{ marginTop: '20px' }}>
        <table className="members-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              {myRole === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {workspace.members.map((member) => (
              <tr key={member.user._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                      {member.user.name?.charAt(0).toUpperCase()}
                    </div>
                    {member.user.name}
                    {member.user._id === user._id && (
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>(you)</span>
                    )}
                  </div>
                </td>
                <td style={{ color: '#6b7280', fontSize: '14px' }}>{member.user.email}</td>
                <td>
                  <span className={`badge badge-${member.role}`}>{member.role}</span>
                </td>
                <td style={{ color: '#9ca3af', fontSize: '13px' }}>
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                {myRole === 'admin' && (
                  <td>
                    {member.user._id !== user._id && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                        onClick={() => handleRemoveMember(member.user._id, member.user.name)}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Invite Member</h3>
              <button className="modal-close" onClick={() => setShowInviteModal(false)}>✕</button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="member@example.com"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={inviting}>
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default WorkspaceDetail;
