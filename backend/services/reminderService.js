const User = require('../models/User');
const AttendanceLog = require('../models/AttendanceLog');
const NotificationTracker = require('../models/NotificationTracker');
const { getPrayerTimesByCity } = require('./aladhanService');
const { createTransporter } = require('../config/nodemailer');
const connectDB = require('../config/db');

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

/**
 * Checks all users, determines whether prayer reminder or follow-up attendance emails are due,
 * and dispatches them statelessly on each invocation.
 */
const checkAndSendReminders = async () => {
  await connectDB();

  const summary = {
    usersProcessed: 0,
    initialRemindersSent: 0,
    followUpsSent: 0,
    errors: []
  };

  const users = await User.find({});
  summary.usersProcessed = users.length;
  const nowUtc = new Date();
  const transporter = createTransporter();
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';

  for (const user of users) {
    if (!user.city || !user.country) continue;

    try {
      const prayerData = await getPrayerTimesByCity(user.city, user.country);
      const timings = prayerData.timings;
      const userTz = prayerData.timezone || 'UTC';

      // Calculate current date & time in user's city timezone
      const userTimeParts = new Intl.DateTimeFormat('en-US', {
        timeZone: userTz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(nowUtc);

      const partMap = {};
      userTimeParts.forEach(p => { partMap[p.type] = p.value; });
      const userTodayStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
      const userCurrentHours = parseInt(partMap.hour === '24' ? '0' : partMap.hour, 10);
      const userCurrentMinutes = parseInt(partMap.minute, 10);
      const userCurrentTotalMins = userCurrentHours * 60 + userCurrentMinutes;

      for (const prayerName of PRAYERS) {
        const timeStr = timings[prayerName];
        if (!timeStr) continue;

        // Parse prayer time string "HH:MM"
        const [pHours, pMinutes] = timeStr.split(':').map(Number);
        const prayerTotalMins = pHours * 60 + pMinutes;

        // Retrieve or create NotificationTracker for this user, prayer, and day
        let tracker = await NotificationTracker.findOne({
          userId: user._id,
          prayerName,
          date: userTodayStr
        });

        if (!tracker) {
          tracker = await NotificationTracker.create({
            userId: user._id,
            prayerName,
            date: userTodayStr
          });
        }

        // 1. Initial Prayer Reminder Email
        if (!tracker.initialSent && userCurrentTotalMins >= prayerTotalMins) {
          const mailOptions = {
            from: `"Salah Reminder" <${process.env.EMAIL_USER || 'no-reply@salahreminder.com'}>`,
            to: user.email,
            subject: `🕌 Time for ${prayerName} Salah`,
            html: `
              <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <div style="background-color: #1b4332; color: #ffffff; padding: 24px; text-align: center;">
                  <h2 style="margin: 0; font-size: 22px;">Assalamu Alaikum, ${user.fullName}</h2>
                  <p style="margin-top: 8px; font-size: 15px; color: #d4af37;">${prayerName} Prayer Time (${timeStr})</p>
                </div>
                <div style="padding: 24px; background-color: #ffffff; text-align: center; color: #333333;">
                  <p style="font-size: 16px; line-height: 1.6;">It's time for <strong>${prayerName}</strong> Salah. Please perform your prayer.</p>
                </div>
                <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #777777;">
                  Salah Reminder Application &bull; May Allah accept your prayers.
                </div>
              </div>
            `
          };

          await transporter.sendMail(mailOptions);
          tracker.initialSent = true;
          tracker.initialSentAt = new Date();
          await tracker.save();
          summary.initialRemindersSent++;

          // Ensure an AttendanceLog record exists with status 'no-response'
          let log = await AttendanceLog.findOne({ userId: user._id, prayerName, date: userTodayStr });
          if (!log) {
            await AttendanceLog.create({
              userId: user._id,
              prayerName,
              date: userTodayStr,
              status: 'no-response'
            });
          }
        }

        // 2. 30-Minute Follow-Up Attendance Prompt Email
        if (tracker.initialSent && !tracker.followUpSent && tracker.initialSentAt) {
          const thirtyMinsInMs = 30 * 60 * 1000;
          if (nowUtc.getTime() - new Date(tracker.initialSentAt).getTime() >= thirtyMinsInMs) {
            const yesLink = `${serverUrl}/api/attendance/mark?user=${user._id}&prayer=${prayerName}&date=${userTodayStr}&status=done`;
            const noLink = `${serverUrl}/api/attendance/mark?user=${user._id}&prayer=${prayerName}&date=${userTodayStr}&status=missed`;

            const mailOptions = {
              from: `"Salah Reminder" <${process.env.EMAIL_USER || 'no-reply@salahreminder.com'}>`,
              to: user.email,
              subject: `📌 Did you complete your ${prayerName} Salah?`,
              html: `
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                  <div style="background-color: #1b4332; color: #ffffff; padding: 24px; text-align: center;">
                    <h2 style="margin: 0; font-size: 20px;">Salah Attendance Check</h2>
                    <p style="margin-top: 6px; font-size: 14px; color: #d4af37;">${prayerName} Prayer</p>
                  </div>
                  <div style="padding: 24px; background-color: #ffffff; text-align: center; color: #333333;">
                    <p style="font-size: 16px; margin-bottom: 24px;">Did you complete your <strong>${prayerName}</strong> Salah?</p>
                    
                    <div style="display: block; margin: 15px 0;">
                      <a href="${yesLink}" style="display: inline-block; background-color: #2d6a4f; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin-right: 10px;">Yes, I prayed ✅</a>
                      <a href="${noLink}" style="display: inline-block; background-color: #c92a2a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">No, I missed it ❌</a>
                    </div>
                    <p style="font-size: 12px; color: #888888; margin-top: 18px;">Clicking either button will update your dashboard status.</p>
                  </div>
                  <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #777777;">
                    Salah Reminder Application
                  </div>
                </div>
              `
            };

            await transporter.sendMail(mailOptions);
            tracker.followUpSent = true;
            tracker.followUpSentAt = new Date();
            await tracker.save();
            summary.followUpsSent++;
          }
        }
      }
    } catch (userErr) {
      summary.errors.push({ userId: user._id, error: userErr.message });
    }
  }

  return summary;
};

module.exports = { checkAndSendReminders };
