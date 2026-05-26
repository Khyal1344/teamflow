const express = require('express');
const { body } = require('express-validator');
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  deleteTask,
} = require('../controllers/task.controller');
const {
  protect,
  requireWorkspaceMember,
  requireAdmin,
} = require('../middleware/auth.middleware');

const router = express.Router({ mergeParams: true }); // access :workspaceId from parent

// All task routes require login + workspace membership
router.use(protect, requireWorkspaceMember);

// ─── Validation Rules ─────────────────────────────────────────────────────────

const taskValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'completed']).withMessage('Invalid status'),
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Due date must be a valid date'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET  /api/workspaces/:workspaceId/tasks        — list + search + filter
// POST /api/workspaces/:workspaceId/tasks        — create task (admin only)
router.route('/')
  .get(getTasks)
  .post(requireAdmin, taskValidation, createTask);

// GET    /api/workspaces/:workspaceId/tasks/:taskId  — get single task
// PUT    /api/workspaces/:workspaceId/tasks/:taskId  — update task
// DELETE /api/workspaces/:workspaceId/tasks/:taskId  — delete task (admin only)
router.route('/:taskId')
  .get(getTask)
  .put(taskValidation, updateTask)
  .delete(requireAdmin, deleteTask);

// PATCH /api/workspaces/:workspaceId/tasks/:taskId/status — update status only
// Both admin and member can update status
router.patch('/:taskId/status', updateTaskStatus);

// PATCH /api/workspaces/:workspaceId/tasks/:taskId/assign — assign task (admin only)
router.patch('/:taskId/assign', requireAdmin, assignTask);

module.exports = router;
