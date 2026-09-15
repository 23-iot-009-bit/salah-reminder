const AttendanceLog = require('../models/AttendanceLog');
const NotificationTracker = require('../models/NotificationTracker');
const User = require('../models/User');
const { getPrayerTimesByCity } = require('../services/aladhanService');

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// GET /api/attendance/mark?user=USERID&prayer=PRAYERNAME&status=done|missed&date=YYYY-MM-DD
const markAttendance = async (req, res) => {
  try {
    const { user: userId, prayer: prayerName, status, date } = req.query;

    if (!userId || !prayerName || !status) {
      return res.status(400).send('Missing required parameters (user, prayer, status)');
    }

    const todayStr = date || new Date().toISOString().split('T')[0];

    let log = await AttendanceLog.findOne({
      userId,
      prayerName,
      date: todayStr
    });

    // Single-use link validation: check if already recorded as 'done' or 'missed'
    if (log && (log.status === 'done' || log.status === 'missed')) {
      return res.redirect(`/confirmation.html?prayer=${encodeURIComponent(prayerName)}&status=${encodeURIComponent(log.status)}&already=true`);
    }

    if (!log) {
      log = await AttendanceLog.create({
        userId,
        prayerName,
        date: todayStr,
        status
      });
    } else {
      log.status = status;
      log.updatedAt = new Date();
      await log.save();
    }

    return res.redirect(`/confirmation.html?prayer=${encodeURIComponent(prayerName)}&status=${encodeURIComponent(status)}`);
  } catch (error) {
    console.error('Error in markAttendance:', error);
    return res.status(500).send('Server Error marking attendance: ' + error.message);
  }
};

// GET /api/attendance/today
const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const prayerData = await getPrayerTimesByCity(user.city, user.country);
    const timings = prayerData.timings;

    const logs = await AttendanceLog.find({ userId, date: todayStr });
    const trackers = await NotificationTracker.find({ userId, date: todayStr });

    const logsMap = new Map(logs.map(l => [l.prayerName, l.status]));
    const trackerMap = new Map(trackers.map(t => [t.prayerName, t]));

    const now = new Date();

    const prayerList = PRAYERS.map(prayerName => {
      const loggedStatus = logsMap.get(prayerName); // 'done', 'missed', 'no-response', or undefined
      const tracker = trackerMap.get(prayerName);
      let calculatedStatus = 'Pending'; // Default

      if (loggedStatus === 'done') {
        calculatedStatus = 'Done ✅';
      } else if (loggedStatus === 'missed') {
        calculatedStatus = 'Missed ❌';
      } else if (loggedStatus === 'no-response') {
        calculatedStatus = 'No Response ⏳';
      } else if (tracker && tracker.initialSent) {
        const thirtyMinsInMs = 30 * 60 * 1000;
        if (tracker.initialSentAt && (now.getTime() - new Date(tracker.initialSentAt).getTime() >= thirtyMinsInMs)) {
          calculatedStatus = 'No Response ⏳';
        } else {
          calculatedStatus = 'Reminder Sent';
        }
      }

      return {
        name: prayerName,
        time: timings[prayerName] || '00:00',
        status: calculatedStatus
      };
    });

    // Calculate weekly 7-day progress for summary widget
    const past7Dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      past7Dates.push(d.toISOString().split('T')[0]);
    }

    const weeklyLogs = await AttendanceLog.find({
      userId,
      date: { $in: past7Dates }
    });

    const weeklySummary = past7Dates.map(dateStr => {
      const dayLogs = weeklyLogs.filter(l => l.date === dateStr);
      const doneCount = dayLogs.filter(l => l.status === 'done').length;
      const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
      return {
        date: dateStr,
        dayName,
        doneCount, // max 5
        total: 5
      };
    });

    return res.status(200).json({
      success: true,
      user: {
        fullName: user.fullName,
        city: user.city,
        country: user.country
      },
      gregorianDate: prayerData.gregorianDate,
      hijriDate: prayerData.hijriDate,
      prayers: prayerList,
      weeklySummary
    });
  } catch (error) {
    console.error('Error in getTodayAttendance:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch today attendance' });
  }
};

// GET /api/attendance/history
const getAttendanceHistory = async (req, res) => {
  try {
    const logs = await AttendanceLog.find({ userId: req.user.id });
    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('Error in getAttendanceHistory:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance history' });
  }
};

module.exports = { markAttendance, getTodayAttendance, getAttendanceHistory };
