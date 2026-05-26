const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity event.
 * This is a fire-and-forget helper — it does not throw on failure
 * so a logging error never breaks the main request.
 *
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} [params.taskId]
 * @param {string} params.userId       - The user who performed the action
 * @param {string} params.action       - One of ACTION_TYPES
 * @param {Object} [params.metadata]
 */
const logActivity = async ({
  workspaceId,
  taskId = null,
  userId,
  action,
  metadata = {},
}) => {
  try {
    await ActivityLog.create({
      workspace: workspaceId,
      task: taskId,
      performedBy: userId,
      action,
      metadata,
    });
  } catch (err) {
    // Log to console but don't propagate — activity logging must never
    // cause the primary operation to fail
    console.error(`[ActivityLog] Failed to write log: ${err.message}`);
  }
};

module.exports = logActivity;
