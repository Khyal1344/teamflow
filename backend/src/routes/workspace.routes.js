const express = require('express');
const { body } = require('express-validator');
const {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
  getMembers,
} = require('../controllers/workspace.controller');
const { protect, requireWorkspaceMember, requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// All workspace routes require login
router.use(protect);

// ─── Validation Rules ─────────────────────────────────────────────────────────

const workspaceValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Workspace name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
];

const inviteValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['admin', 'member']).withMessage('Role must be admin or member'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET  /api/workspaces        — get all workspaces for current user
// POST /api/workspaces        — create a new workspace
router.route('/')
  .get(getMyWorkspaces)
  .post(workspaceValidation, createWorkspace);

// GET    /api/workspaces/:workspaceId  — get single workspace
// PUT    /api/workspaces/:workspaceId  — update workspace (admin only)
// DELETE /api/workspaces/:workspaceId  — delete workspace (admin only)
router.route('/:workspaceId')
  .get(requireWorkspaceMember, getWorkspace)
  .put(requireWorkspaceMember, requireAdmin, workspaceValidation, updateWorkspace)
  .delete(requireWorkspaceMember, requireAdmin, deleteWorkspace);

// GET    /api/workspaces/:workspaceId/members  — get all members
// POST   /api/workspaces/:workspaceId/members  — invite a member (admin only)
router.route('/:workspaceId/members')
  .get(requireWorkspaceMember, getMembers)
  .post(requireWorkspaceMember, requireAdmin, inviteValidation, inviteMember);

// DELETE /api/workspaces/:workspaceId/members/:userId — remove a member (admin only)
router.delete(
  '/:workspaceId/members/:userId',
  requireWorkspaceMember,
  requireAdmin,
  removeMember
);

module.exports = router;
