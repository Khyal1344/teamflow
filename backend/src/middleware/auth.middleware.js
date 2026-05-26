const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { AppError } = require('./error.middleware');

/**
 * protect
 * Verifies the JWT in the Authorization header and attaches req.user.
 * Use on every protected route.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided. Please log in.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User no longer exists.', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * requireWorkspaceMember
 * Checks that req.user is a member of the workspace identified by req.params.workspaceId.
 * Must be used AFTER protect.
 * Attaches req.workspace and req.memberRole for downstream use.
 */
const requireWorkspaceMember = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      throw new AppError('Workspace not found.', 404);
    }

    const role = workspace.getMemberRole(req.user._id);
    if (!role) {
      throw new AppError('You are not a member of this workspace.', 403);
    }

    req.workspace = workspace;
    req.memberRole = role;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * requireAdmin
 * Ensures the current user has the admin role in the workspace.
 * Must be used AFTER requireWorkspaceMember.
 */
const requireAdmin = (req, res, next) => {
  if (req.memberRole !== 'admin') {
    return next(new AppError('Admin access required.', 403));
  }
  next();
};

module.exports = { protect, requireWorkspaceMember, requireAdmin };
