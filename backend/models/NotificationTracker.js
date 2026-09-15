const mongoose = require('mongoose');
const { getIsConnected } = require('../config/db');

const notificationTrackerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prayerName: { type: String, enum: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'], required: true },
  date: { type: String, required: true },
  initialSent: { type: Boolean, default: false },
  initialSentAt: { type: Date },
  followUpSent: { type: Boolean, default: false },
  followUpSentAt: { type: Date }
});

const MongooseNotificationTracker = mongoose.model('NotificationTracker', notificationTrackerSchema);

const memoryTrackers = [];

class NotificationTrackerModel {
  static async findOne(query) {
    if (getIsConnected()) {
      return await MongooseNotificationTracker.findOne(query);
    }
    const found = memoryTrackers.find(t =>
      t.userId.toString() === query.userId.toString() &&
      t.prayerName === query.prayerName &&
      t.date === query.date
    );
    return found ? found : null;
  }

  static async find(query) {
    if (getIsConnected()) {
      return await MongooseNotificationTracker.find(query);
    }
    return memoryTrackers.filter(t => {
      let match = true;
      if (query.userId && t.userId.toString() !== query.userId.toString()) match = false;
      if (query.date && t.date !== query.date) match = false;
      return match;
    });
  }

  static async create(data) {
    if (getIsConnected()) {
      return await MongooseNotificationTracker.create(data);
    }
    const newTracker = {
      _id: 'track_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      userId: data.userId,
      prayerName: data.prayerName,
      date: data.date,
      initialSent: data.initialSent || false,
      initialSentAt: data.initialSentAt || null,
      followUpSent: data.followUpSent || false,
      followUpSentAt: data.followUpSentAt || null,
      save: async function() {
        return this;
      }
    };
    memoryTrackers.push(newTracker);
    return newTracker;
  }

  async save() {
    return this;
  }
}

module.exports = NotificationTrackerModel;
