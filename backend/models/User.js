const mongoose = require('mongoose');
const { getIsConnected } = require('../config/db');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  city: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const MongooseUser = mongoose.model('User', userSchema);

// In-Memory Fallback Storage
const memoryUsers = [];

class UserModel {
  static async findOne(query) {
    if (getIsConnected()) {
      return await MongooseUser.findOne(query);
    }
    if (query.email) {
      const emailLower = query.email.toLowerCase();
      const found = memoryUsers.find(u => u.email.toLowerCase() === emailLower);
      return found ? { ...found } : null;
    }
    if (query._id) {
      const found = memoryUsers.find(u => u._id.toString() === query._id.toString());
      return found ? { ...found } : null;
    }
    return null;
  }

  static async findById(id) {
    if (getIsConnected()) {
      return await MongooseUser.findById(id);
    }
    const found = memoryUsers.find(u => u._id.toString() === id.toString());
    return found ? { ...found } : null;
  }

  static async create(data) {
    if (getIsConnected()) {
      return await MongooseUser.create(data);
    }
    const newUser = {
      _id: new mongoose.Types.ObjectId(),
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      password: data.password,
      city: data.city,
      country: data.country,
      createdAt: new Date()
    };
    memoryUsers.push(newUser);
    return { ...newUser };
  }

  static async find(query = {}) {
    if (getIsConnected()) {
      return await MongooseUser.find(query);
    }
    return [...memoryUsers];
  }
}

module.exports = UserModel;
