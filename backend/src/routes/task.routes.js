const express = require('express');
const router = express.Router({ mergeParams: true }); // access workspaceId from parent

// Stubs — implemented on Day 4
router.get('/', (req, res) => res.json({ message: 'task list stub' }));
router.post('/', (req, res) => res.json({ message: 'create task stub' }));

module.exports = router;
