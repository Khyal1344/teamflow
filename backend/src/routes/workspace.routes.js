const express = require('express');
const router = express.Router();

// Stubs — implemented on Day 3
router.get('/', (req, res) => res.json({ message: 'workspace list stub' }));
router.post('/', (req, res) => res.json({ message: 'create workspace stub' }));

module.exports = router;
