import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import '../components/layout/Layout.css';
import '../components/workspace/Workspace.css';
import './Tasks.css';
import { getTasks, createTask, updateTask, updateTaskStatus, deleteTask } from '../api/tasks';
import { getWorkspace } from '../api/workspace';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STATUSES = ['todo', 'in-progress', 'completed'];
const PRIORITIES = ['low', 'medium', 'high'];

const emptyForm = {
  title: '', description: '', priority: 'medium',
  status: 'todo', dueDate: '', assignedTo: ''
};

const Tasks = () => {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [myRole, setMyRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ── Debounce search input (300ms) ────────────────────────────────────────────
  // This is the fix for the intentional bug requirement (Day 8):
  // Without debounce, every keystroke fires an API call.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Fetch workspace info ──────────────────────────────────────────────────────
  useEffect(() => {
    getWorkspace(workspaceId)
      .then((res) => {
        setWorkspace(res.data.workspace);
        const me = res.data.workspace.members.find((m) => m.user._id === user._id);
        if (me) setMyRole(me.role);
      })
      .catch(() => navigate('/workspaces'));
  }, [workspaceId]);

  // ── Fetch tasks whenever search/filters/page change ───────────────────────────
  useEffect(() => {
    fetchTasks();
  }, [search, filters, page, workspaceId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;

      const res = await getTasks(workspaceId, params);
      setTasks(res.data.tasks);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // ── Overdue check ─────────────────────────────────────────────────────────────
  const isOverdue = (task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date() > new Date(task.dueDate);
  };

  // ── Open create modal ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingTask(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowModal(true);
  };

  // ── Open edit modal ───────────────────────────────────────────────────────────
  const openEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      assignedTo: task.assignedTo?._id || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  // ── Validate form ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    return errs;
  };

  // ── Save task (create or update) ──────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) return setFormErrors(errs);

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate || undefined,
        assignedTo: form.assignedTo || undefined,
      };

      if (editingTask) {
        await updateTask(workspaceId, editingTask._id, payload);
        toast.success('Task updated!');
      } else {
        await createTask(workspaceId, payload);
        toast.success('Task created!');
      }

      setShowModal(false);
      setPage(1);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  // ── Update status inline ──────────────────────────────────────────────────────
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(workspaceId, taskId, newStatus);
      setTasks(tasks.map((t) =>
        t._id === taskId ? { ...t, status: newStatus } : t
      ));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  // ── Delete task ───────────────────────────────────────────────────────────────
  const handleDelete = async (taskId, taskTitle) => {
    if (!window.confirm(`Delete "${taskTitle}"?`)) return;
    try {
      await deleteTask(workspaceId, taskId);
      toast.success('Task deleted');
      fetchTasks();
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  return (
    <Layout>
      {/* Header */}
      <div className="page-header">
        <div>
          <button
            onClick={() => navigate(`/workspaces/${workspaceId}`)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667eea', marginBottom: '8px', fontSize: '14px' }}
          >
            ← Back to Workspace
          </button>
          <h2 className="page-title">
            {workspace?.name} — Tasks
            <span style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280', marginLeft: '12px' }}>
              {total} total
            </span>
          </h2>
        </div>
        {myRole === 'admin' && (
          <button className="btn btn-primary" onClick={openCreate}>+ New Task</button>
        )}
      </div>

      {/* Search + Filters */}
      <div className="task-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search tasks..."
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
        />
        <select
          className="filter-select"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="todo">Todo</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          className="filter-select"
          value={filters.priority}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {(filters.status || filters.priority || search) && (
          <button
            className="btn btn-secondary"
            onClick={() => { setFilters({ status: '', priority: '' }); setSearchInput(''); setPage(1); }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="loading">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No tasks found</h3>
            <p>{search || filters.status || filters.priority ? 'Try different filters' : 'Create your first task!'}</p>
          </div>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <div
              key={task._id}
              className={`task-card card ${isOverdue(task) ? 'overdue' : ''}`}
            >
              {/* Overdue banner */}
              {isOverdue(task) && (
                <div className="overdue-banner">⚠️ Overdue</div>
              )}

              <div className="task-card-header">
                <div className="task-title-row">
                  <h3 className="task-title">{task.title}</h3>
                  <div className="task-badges">
                    <span className={`badge priority-${task.priority}`}>{task.priority}</span>
                  </div>
                </div>

                <div className="task-actions">
                  {/* Inline status dropdown */}
                  <select
                    className={`status-select status-${task.status}`}
                    value={task.status}
                    onChange={(e) => handleStatusChange(task._id, e.target.value)}
                  >
                    <option value="todo">Todo</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>

                  {myRole === 'admin' && (
                    <>
                      <button className="icon-btn" onClick={() => openEdit(task)} title="Edit">✏️</button>
                      <button className="icon-btn danger" onClick={() => handleDelete(task._id, task.title)} title="Delete">🗑️</button>
                    </>
                  )}
                </div>
              </div>

              {task.description && (
                <p className="task-description">{task.description}</p>
              )}

              <div className="task-meta">
                {task.assignedTo && (
                  <span className="meta-item">👤 {task.assignedTo.name}</span>
                )}
                {task.dueDate && (
                  <span className={`meta-item ${isOverdue(task) ? 'overdue-text' : ''}`}>
                    📅 {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
                <span className="meta-item">🕐 {new Date(task.createdAt).toLocaleDateString()}</span>
                {task.createdBy && (
                  <span className="meta-item">Created by {task.createdBy.name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            ← Prev
          </button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button
            className="btn btn-secondary"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTask ? 'Edit Task' : 'Create Task'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => { setForm({ ...form, title: e.target.value }); setFormErrors({}); }}
                  placeholder="Task title"
                  className={formErrors.title ? 'error' : ''}
                />
                {formErrors.title && <p className="error-text">{formErrors.title}</p>}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Task description..."
                  rows={3}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="todo">Todo</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Tasks;
