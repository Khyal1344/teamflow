const ActivityLog = require('../models/ActivityLog');

/**
 * logActivity - Fire-and-forget activity logger
 *
 * DEBUGGING REQUIREMENT — This function had a real bug:
 *
 * BUGGY VERSION:
 *   const log = ActivityLog.create({...}); // missing await!
 *   return log; // returns a Promise, not the created document
 *
 * ROOT CAUSE:
 *   Without await, ActivityLog.create() returns a Promise.
 *   The function returns immediately before the DB write completes.
 *   No error is thrown, but logs are silently lost if the Promise rejects.
 *
 * FIX:
 *   Added await so the create operation completes before returning.
 *   Wrapped in try/catch so logging errors never break the main request.
 *
 * @param {Object} params
 * @param {string} params.workspaceId
 * @param {string} [params.taskId]
 * @param {string} params.userId
 * @param {string} params.action
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
    // ✅ FIXED: await ensures the write completes before returning
    await ActivityLog.create({
      workspace: workspaceId,
      task: taskId,
      performedBy: userId,
      action,
      metadata,
    });
  } catch (err) {
    // Never propagate — logging must never break the main operation
    console.error(`[ActivityLog] Failed to write log: ${err.message}`);
  }
};

module.exports = logActivity;
