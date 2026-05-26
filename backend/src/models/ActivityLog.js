const mongoose = require('mongoose');

// All supported action types — extend here as features grow
const ACTION_TYPES = {
  // Task actions
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_DELETED: 'task_deleted',
  TASK_STATUS_CHANGED: 'task_status_changed',
  TASK_ASSIGNED: 'task_assigned',
  // Workspace / member actions
  MEMBER_INVITED: 'member_invited',
  MEMBER_REMOVED: 'member_removed',
  WORKSPACE_CREATED: 'workspace_created',
};

const activityLogSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    // Optional — not all events are task-related (e.g. member_invited)
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    // The user who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(ACTION_TYPES),
      required: true,
    },
    // Flexible field to store action-specific context
    // e.g. { from: 'todo', to: 'completed' } for status change
    // e.g. { invitedEmail: 'john@example.com', role: 'member' }
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // createdAt serves as the event timestamp
    // Activity logs are append-only — never updated
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Primary query: activity feed for a workspace, newest first
activityLogSchema.index({ workspace: 1, createdAt: -1 });

// Filter by task (activity history for a specific task)
activityLogSchema.index({ task: 1, createdAt: -1 });

// Filter by user (what has this user done in this workspace)
activityLogSchema.index({ workspace: 1, performedBy: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
module.exports.ACTION_TYPES = ACTION_TYPES;
