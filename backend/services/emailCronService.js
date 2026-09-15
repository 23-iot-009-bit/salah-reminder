const cron = require('node-cron');
const User = require('../models/User');
const AttendanceLog = require('../models/AttendanceLog');
const NotificationTracker = require('../models/NotificationTracker');
const { getPrayerTimesByCity } = require('./aladhanService');
const { createTransporter } = require('../config/nodemailer');

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const initEmailCron = () => {
  console.log('Initializing Salah Reminder Cron Schedulers...');

  // 1. Minutely cron job: Check prayer times & dispatch initial and 30-min follow-up emails
  cron.schedule('* * * * *', async () => {
    try {
      const users = await User.find({});
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const transporter = createTransporter();
      const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';

      for (const user of users) {
        if (!user.city || !user.country) continue;

        const prayerData = await getPrayerTimesByCity(user.city, user.country);
        const timings = prayerData.timings;
        const userTz = prayerData.timezone || 'UTC';

        // Calculate current date & time in user's city timezone
        const nowUtc = new Date();
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

          // Parse prayer time string "HH:MM" for today
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

          // A) Initial Prayer Reminder Email
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

          // B) 30-Minute Follow-Up Attendance Prompt Email
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
            }
          }
        }
      }
    } catch (err) {
      console.error('Error running minutely prayer cron:', err.message);
    }
  });

  // 2. Weekly summary cron job: Every Sunday night at 9:00 PM (0 21 * * 0)
  cron.schedule('0 21 * * 0', async () => {
    console.log('Running Sunday Night Weekly Salah Summary Email Cron...');
    try {
      const users = await User.find({});
      const transporter = createTransporter();

      // Calculate past 7 days date strings
      const today = new Date();
      const pastDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        pastDates.push(d.toISOString().split('T')[0]);
      }

      for (const user of users) {
        const logs = await AttendanceLog.find({
          userId: user._id,
          date: { $in: pastDates }
        });

        let doneCount = 0;
        let missedCount = 0;
        let noResponseCount = 0;

        logs.forEach(log => {
          if (log.status === 'done') doneCount++;
          else if (log.status === 'missed') missedCount++;
          else if (log.status === 'no-response') noResponseCount++;
        });

        const totalTracked = 35; // 5 prayers * 7 days
        const percentage = Math.round((doneCount / totalTracked) * 100);

        const mailOptions = {
          from: `"Salah Reminder" <${process.env.EMAIL_USER || 'no-reply@salahreminder.com'}>`,
          to: user.email,
          subject: `🌙 Your Weekly Salah Summary (${percentage}% Completed)`,
          html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #1b4332; color: #ffffff; padding: 24px; text-align: center;">
                <h2 style="margin: 0; font-size: 22px;">Weekly Salah Performance</h2>
                <p style="margin-top: 8px; font-size: 14px; color: #d4af37;">Assalamu Alaikum, ${user.fullName}</p>
              </div>
              <div style="padding: 24px; background-color: #ffffff; color: #333333;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="font-size: 42px; font-weight: bold; color: #1b4332;">${percentage}%</div>
                  <p style="margin: 5px 0 0 0; font-size: 16px; color: #555555;">You completed <strong>${doneCount}</strong> out of ${totalTracked} prayers this week</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px 0; color: #15803d;"><strong>Done ✅</strong></td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold;">${doneCount}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px 0; color: #b91c1c;"><strong>Missed ❌</strong></td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold;">${missedCount}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px 0; color: #b45309;"><strong>No Response ⏳</strong></td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold;">${noResponseCount}</td>
                  </tr>
                </table>

                <p style="margin-top: 25px; line-height: 1.6; text-align: center; color: #444444;">
                  "Indeed, prayer prohibits immorality and wrongdoing, and the remembrance of Allah is greater." (Quran 29:45)
                </p>
              </div>
              <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #777777;">
                Salah Reminder Application
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
      }
    } catch (err) {
      console.error('Error sending Sunday weekly summary email:', err.message);
    }
  });
};

module.exports = { initEmailCron };
