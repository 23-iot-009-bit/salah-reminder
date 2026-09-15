const express = require('express');
const router = express.Router();
const { getSalahTimes } = require('../controllers/salahController');
const { protect } = require('../middleware/authMiddleware');

router.get('/salah-times', protect, getSalahTimes);

module.exports = router;
