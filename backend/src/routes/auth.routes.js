const express = require('express');
const router = express.Router();

// Stubs — implemented on Day 2
router.post('/register', (req, res) => res.json({ message: 'register stub' }));
router.post('/login', (req, res) => res.json({ message: 'login stub' }));
router.get('/me', (req, res) => res.json({ message: 'me stub' }));

module.exports = router;
