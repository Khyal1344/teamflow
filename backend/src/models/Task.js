const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'completed'],
      default: 'todo',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
//
// Design decisions (documented for README):
//
// 1. Text index on title + description
//    Enables $text search across both fields. MongoDB maintains an inverted index
//    for fast full-text lookup without scanning every document.
//
// 2. Compound index: workspace + status
//    The most common query pattern: "all tasks in workspace X with status Y".
//    Order matters — workspace first (high cardinality filter) then status.
//
// 3. Compound index: workspace + priority
//    Same pattern for priority-filtered task lists.
//
// 4. Compound index: workspace + assignedTo
//    "All tasks in this workspace assigned to user X."
//
// 5. Compound index: workspace + dueDate
//    Enables efficient overdue/upcoming task queries sorted by due date.
//
// 6. Compound index: workspace + createdAt (descending)
//    Default sort for task list (newest first), scoped to a workspace.

taskSchema.index(
  { title: 'text', description: 'text' },
  { weights: { title: 3, description: 1 }, name: 'task_text_search' }
);

taskSchema.index({ workspace: 1, status: 1 });
taskSchema.index({ workspace: 1, priority: 1 });
taskSchema.index({ workspace: 1, assignedTo: 1 });
taskSchema.index({ workspace: 1, dueDate: 1 });
taskSchema.index({ workspace: 1, createdAt: -1 });

// ─── Virtual: isOverdue ───────────────────────────────────────────────────────
//
// Decision: overdue is determined at read-time via this virtual.
// The frontend uses dueDate directly for visual highlighting.
// No cron job needed — avoids extra writes and timezone complexity.
taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > new Date(this.dueDate);
});

taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Task', taskSchema);
