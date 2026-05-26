const express = require('express');
const { getActivityLogs } = require('../controllers/activity.controller');
const { protect, requireWorkspaceMember } = require('../middleware/auth.middleware');

const router = express.Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/activity
router.get('/', protect, requireWorkspaceMember, getActivityLogs);

module.exports = router;
