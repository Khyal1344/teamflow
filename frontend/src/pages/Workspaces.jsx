import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import '../components/layout/Layout.css';
import { getWorkspaces, createWorkspace } from '../api/workspace';
import toast from 'react-hot-toast';

const Workspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await getWorkspaces();
      setWorkspaces(res.data.workspaces);
    } catch {
      toast.error('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Workspace name is required';
    return errs;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) return setErrors(errs);

    setCreating(true);
    try {
      const res = await createWorkspace(form);
      setWorkspaces([...workspaces, res.data.workspace]);
      setShowModal(false);
      setForm({ name: '', description: '' });
      toast.success('Workspace created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2 className="page-title">Workspaces</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Workspace
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading workspaces...</div>
      ) : workspaces.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No workspaces yet</h3>
            <p>Create your first workspace to get started</p>
          </div>
        </div>
      ) : (
        <div className="workspace-grid">
          {workspaces.map((ws) => (
            <div
              key={ws._id}
              className="workspace-card card"
              onClick={() => navigate(`/workspaces/${ws._id}`)}
            >
              <div className="workspace-icon">
                {ws.name.charAt(0).toUpperCase()}
              </div>
              <div className="workspace-info">
                <h3>{ws.name}</h3>
                <p>{ws.description || 'No description'}</p>
                <span className="member-count">
                  👥 {ws.members?.length || 0} member{ws.members?.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workspace Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Workspace</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Workspace Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({}); }}
                  placeholder="e.g. Marketing Team"
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <p className="error-text">{errors.name}</p>}
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this workspace for?"
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Workspaces;
