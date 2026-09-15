const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const { initEmailCron } = require('./services/emailCronService');

const authRoutes = require('./routes/authRoutes');
const salahRoutes = require('./routes/salahRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect Database
connectDB();

// API Routes
app.use('/api', authRoutes);
app.use('/api', salahRoutes);
app.use('/api/attendance', attendanceRoutes);

// Status route
app.get('/api/status', (req, res) => {
  res.json({ success: true, message: 'Salah Reminder Backend is running smoothly' });
});

// Serve Static Frontend Files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Fallback to index.html for root path or SPA navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Initialize Nodemailer & node-cron background workers
initEmailCron();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Frontend accessible at: http://localhost:${PORT}`);
});
