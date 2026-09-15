const express = require('express');
const router = express.Router();
const { markAttendance, getTodayAttendance, getAttendanceHistory } = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

// Public route hit by email links
router.get('/mark', markAttendance);

// Protected routes for dashboard UI
router.get('/today', protect, getTodayAttendance);
router.get('/history', protect, getAttendanceHistory);

module.exports = router;
