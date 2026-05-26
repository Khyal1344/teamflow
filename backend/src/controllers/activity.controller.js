const ActivityLog = require('../models/ActivityLog');

// ─── Get Activity Logs for a Workspace ───────────────────────────────────────
// GET /api/workspaces/:workspaceId/activity
const getActivityLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find({ workspace: req.params.workspaceId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'name email')
      .populate('task', 'title');

    const total = await ActivityLog.countDocuments({
      workspace: req.params.workspaceId,
    });

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      logs,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getActivityLogs };
