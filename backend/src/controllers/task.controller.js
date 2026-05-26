const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const { AppError } = require('../middleware/error.middleware');
const logActivity = require('../utils/activityLogger');
const { ACTION_TYPES } = require('../models/ActivityLog');

// ─── Create Task ──────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/tasks
const createTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { title, description, priority, status, dueDate, assignedTo } = req.body;

    const task = await Task.create({
      title,
      description,
      priority,
      status,
      dueDate: dueDate || null,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      workspace: req.params.workspaceId,
    });

    await logActivity({
      workspaceId: req.params.workspaceId,
      taskId: task._id,
      userId: req.user._id,
      action: ACTION_TYPES.TASK_CREATED,
      metadata: { taskTitle: title },
    });

    // Populate for response
    await task.populate('createdBy', 'name email');
    await task.populate('assignedTo', 'name email');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Tasks (with search, filter, pagination) ─────────────────────────
// GET /api/workspaces/:workspaceId/tasks
//
// Query params:
//   search    — text search on title + description
//   status    — todo | in-progress | completed
//   priority  — low | medium | high
//   assignedTo — userId
//   page      — page number (default 1)
//   limit     — results per page (default 20, max 50)
//   sortBy    — field to sort by (default createdAt)
//   sortOrder — asc | desc (default desc)
const getTasks = async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      assignedTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Always scope to workspace first
    const filter = { workspace: req.params.workspaceId };

    // ── Text search ──────────────────────────────────────────────────────────
    // Uses the MongoDB text index on title + description
    // Much faster than regex for large datasets
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    // ── Filters ──────────────────────────────────────────────────────────────
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    // ── Pagination ───────────────────────────────────────────────────────────
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // max 50 per page
    const skip = (pageNum - 1) * limitNum;

    // ── Sort ─────────────────────────────────────────────────────────────────
    const allowedSortFields = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'title'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDir };

    // If text search, also sort by relevance score
    if (search && search.trim()) {
      sort.score = { $meta: 'textScore' };
    }

    // ── Execute query ────────────────────────────────────────────────────────
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'name email')
        .populate('assignedTo', 'name email'),
      Task.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      tasks,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Task ──────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/tasks/:taskId
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      workspace: req.params.workspaceId,
    })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    res.status(200).json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

// ─── Update Task ──────────────────────────────────────────────────────────────
// PUT /api/workspaces/:workspaceId/tasks/:taskId
const updateTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { title, description, priority, dueDate, assignedTo } = req.body;

    // Members can only update tasks assigned to them
    // Admins can update any task
    const taskFilter = { _id: req.params.taskId, workspace: req.params.workspaceId };
    if (req.memberRole === 'member') {
      taskFilter.assignedTo = req.user._id;
    }

    const task = await Task.findOneAndUpdate(
      taskFilter,
      { $set: { title, description, priority, dueDate, assignedTo } },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!task) {
      return next(new AppError('Task not found or you do not have permission to update it', 404));
    }

    await logActivity({
      workspaceId: req.params.workspaceId,
      taskId: task._id,
      userId: req.user._id,
      action: ACTION_TYPES.TASK_UPDATED,
      metadata: { taskTitle: task.title },
    });

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Update Task Status ───────────────────────────────────────────────────────
// PATCH /api/workspaces/:workspaceId/tasks/:taskId/status
//
// Req 2 — Race Condition Prevention:
// Uses findOneAndUpdate (single atomic DB operation).
// Two simultaneous requests cannot both read-then-write —
// MongoDB processes them sequentially at the document level.
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['todo', 'in-progress', 'completed'].includes(status)) {
      return next(new AppError('Invalid status value', 400));
    }

    // Atomic update — scoped to workspace to prevent cross-workspace updates
    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.taskId,
        workspace: req.params.workspaceId,
      },
      { $set: { status } },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    await logActivity({
      workspaceId: req.params.workspaceId,
      taskId: task._id,
      userId: req.user._id,
      action: ACTION_TYPES.TASK_STATUS_CHANGED,
      metadata: { newStatus: status, taskTitle: task.title },
    });

    res.status(200).json({
      success: true,
      message: 'Task status updated',
      task,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Assign Task ──────────────────────────────────────────────────────────────
// PATCH /api/workspaces/:workspaceId/tasks/:taskId/assign  (admin only)
const assignTask = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, workspace: req.params.workspaceId },
      { $set: { assignedTo: assignedTo || null } },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    await logActivity({
      workspaceId: req.params.workspaceId,
      taskId: task._id,
      userId: req.user._id,
      action: ACTION_TYPES.TASK_ASSIGNED,
      metadata: { assignedTo, taskTitle: task.title },
    });

    res.status(200).json({
      success: true,
      message: 'Task assigned successfully',
      task,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Task ──────────────────────────────────────────────────────────────
// DELETE /api/workspaces/:workspaceId/tasks/:taskId  (admin only)
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.taskId,
      workspace: req.params.workspaceId,
    });

    if (!task) {
      return next(new AppError('Task not found', 404));
    }

    await logActivity({
      workspaceId: req.params.workspaceId,
      taskId: req.params.taskId,
      userId: req.user._id,
      action: ACTION_TYPES.TASK_DELETED,
      metadata: { taskTitle: task.title },
    });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  deleteTask,
};
