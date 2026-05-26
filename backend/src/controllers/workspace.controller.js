const { validationResult } = require('express-validator');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { AppError } = require('../middleware/error.middleware');
const logActivity = require('../utils/activityLogger');
const { ACTION_TYPES } = require('../models/ActivityLog');

// ─── Create Workspace ─────────────────────────────────────────────────────────
// POST /api/workspaces
const createWorkspace = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { name, description } = req.body;

    const workspace = await Workspace.create({
      name,
      description,
      owner: req.user._id,
      // Creator is automatically added as admin
      members: [{ user: req.user._id, role: 'admin' }],
    });

    await logActivity({
      workspaceId: workspace._id,
      userId: req.user._id,
      action: ACTION_TYPES.WORKSPACE_CREATED,
      metadata: { workspaceName: name },
    });

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      workspace,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Workspaces for Current User ──────────────────────────────────────
// GET /api/workspaces
const getMyWorkspaces = async (req, res, next) => {
  try {
    // Find all workspaces where the user is a member
    const workspaces = await Workspace.find({
      'members.user': req.user._id,
    }).populate('owner', 'name email');

    res.status(200).json({
      success: true,
      count: workspaces.length,
      workspaces,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Workspace ─────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId
const getWorkspace = async (req, res, next) => {
  try {
    // req.workspace is already attached by requireWorkspaceMember middleware
    await req.workspace.populate('members.user', 'name email');
    await req.workspace.populate('owner', 'name email');

    res.status(200).json({
      success: true,
      workspace: req.workspace,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Update Workspace ─────────────────────────────────────────────────────────
// PUT /api/workspaces/:workspaceId  (admin only)
const updateWorkspace = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { name, description } = req.body;

    const workspace = await Workspace.findByIdAndUpdate(
      req.params.workspaceId,
      { name, description },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Workspace updated successfully',
      workspace,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Workspace ─────────────────────────────────────────────────────────
// DELETE /api/workspaces/:workspaceId  (admin only)
const deleteWorkspace = async (req, res, next) => {
  try {
    await Workspace.findByIdAndDelete(req.params.workspaceId);

    res.status(200).json({
      success: true,
      message: 'Workspace deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ─── Invite Member ────────────────────────────────────────────────────────────
// POST /api/workspaces/:workspaceId/members  (admin only)
const inviteMember = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => e.msg),
      });
    }

    const { email, role = 'member' } = req.body;

    // Find user by email
    const userToInvite = await User.findOne({ email });
    if (!userToInvite) {
      return next(new AppError('No user found with that email address', 404));
    }

    // Check if already a member
    if (req.workspace.hasMember(userToInvite._id)) {
      return next(new AppError('User is already a member of this workspace', 400));
    }

    // Add member
    req.workspace.members.push({ user: userToInvite._id, role });
    await req.workspace.save();

    await logActivity({
      workspaceId: req.workspace._id,
      userId: req.user._id,
      action: ACTION_TYPES.MEMBER_INVITED,
      metadata: { invitedEmail: email, role },
    });

    res.status(200).json({
      success: true,
      message: `${userToInvite.name} has been added to the workspace`,
      member: { user: userToInvite, role },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Remove Member ────────────────────────────────────────────────────────────
// DELETE /api/workspaces/:workspaceId/members/:userId  (admin only)
const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Cannot remove the owner
    if (req.workspace.owner.toString() === userId) {
      return next(new AppError('Cannot remove the workspace owner', 400));
    }

    // Cannot remove yourself if you are the only admin
    const admins = req.workspace.members.filter((m) => m.role === 'admin');
    if (admins.length === 1 && admins[0].user.toString() === userId) {
      return next(new AppError('Cannot remove the only admin', 400));
    }

    req.workspace.members = req.workspace.members.filter(
      (m) => m.user.toString() !== userId
    );
    await req.workspace.save();

    await logActivity({
      workspaceId: req.workspace._id,
      userId: req.user._id,
      action: ACTION_TYPES.MEMBER_REMOVED,
      metadata: { removedUserId: userId },
    });

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Members ──────────────────────────────────────────────────────────
// GET /api/workspaces/:workspaceId/members
const getMembers = async (req, res, next) => {
  try {
    await req.workspace.populate('members.user', 'name email createdAt');

    res.status(200).json({
      success: true,
      count: req.workspace.members.length,
      members: req.workspace.members,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createWorkspace,
  getMyWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  removeMember,
  getMembers,
};
