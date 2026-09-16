const express = require('express');
const router = express.Router();
const { handleCheckReminders } = require('../controllers/cronController');

// GET /api/cron/check-reminders
router.get('/check-reminders', handleCheckReminders);

module.exports = router;
