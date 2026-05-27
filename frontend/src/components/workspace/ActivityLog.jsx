import { useState, useEffect } from 'react';
import { getActivityLogs } from '../../api/workspace';
import './ActivityLog.css';

const ACTION_LABELS = {
  task_created: '📋 created task',
  task_updated: '✏️ updated task',
  task_deleted: '🗑️ deleted task',
  task_status_changed: '🔄 changed status of',
  task_assigned: '👤 assigned task',
  member_invited: '➕ invited member',
  member_removed: '➖ removed member',
  workspace_created: '🏢 created workspace',
};

const ActivityLog = ({ workspaceId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [workspaceId, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getActivityLogs(workspaceId, { page, limit: 10 });
      setLogs(res.data.logs);
      setTotalPages(res.data.totalPages);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  const getLogText = (log) => {
    const action = ACTION_LABELS[log.action] || log.action;
    const taskTitle = log.task?.title || log.metadata?.taskTitle || '';
    const extra = log.metadata?.newStatus ? `→ "${log.metadata.newStatus}"` :
                  log.metadata?.invitedEmail ? log.metadata.invitedEmail : '';
    return `${action} ${taskTitle} ${extra}`.trim();
  };

  if (loading) return <div className="activity-loading">Loading activity...</div>;

  return (
    <div className="activity-log">
      <h3 className="activity-title">Activity Log</h3>
      {logs.length === 0 ? (
        <div className="activity-empty">No activity yet</div>
      ) : (
        <>
          <div className="activity-list">
            {logs.map((log) => (
              <div key={log._id} className="activity-item">
                <div className="activity-avatar">
                  {log.performedBy?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="activity-content">
                  <p className="activity-text">
                    <strong>{log.performedBy?.name}</strong> {getLogText(log)}
                  </p>
                  <span className="activity-time">{formatTime(log.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="activity-pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>←</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivityLog;
