const mongoose = require('mongoose');
const { getIsConnected } = require('../config/db');

const attendanceLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prayerName: { type: String, enum: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'], required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['done', 'missed', 'no-response'], default: 'no-response' },
  updatedAt: { type: Date, default: Date.now }
});

const MongooseAttendanceLog = mongoose.model('AttendanceLog', attendanceLogSchema);

const memoryAttendanceLogs = [];

class AttendanceLogModel {
  static async findOne(query) {
    if (getIsConnected()) {
      return await MongooseAttendanceLog.findOne(query);
    }
    const found = memoryAttendanceLogs.find(l => 
      l.userId.toString() === query.userId.toString() &&
      l.prayerName === query.prayerName &&
      l.date === query.date
    );
    return found ? found : null;
  }

  static async find(query) {
    if (getIsConnected()) {
      return await MongooseAttendanceLog.find(query);
    }
    return memoryAttendanceLogs.filter(l => {
      let match = true;
      if (query.userId && l.userId.toString() !== query.userId.toString()) match = false;
      if (query.date && query.date.$in && !query.date.$in.includes(l.date)) match = false;
      else if (query.date && typeof query.date === 'string' && l.date !== query.date) match = false;
      return match;
    });
  }

  static async create(data) {
    if (getIsConnected()) {
      return await MongooseAttendanceLog.create(data);
    }
    const newLog = {
      _id: new mongoose.Types.ObjectId(),
      userId: data.userId,
      prayerName: data.prayerName,
      date: data.date,
      status: data.status || 'no-response',
      updatedAt: new Date(),
      save: async function() {
        this.updatedAt = new Date();
        return this;
      }
    };
    memoryAttendanceLogs.push(newLog);
    return newLog;
  }
}

module.exports = AttendanceLogModel;
