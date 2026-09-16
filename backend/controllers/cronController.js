const { checkAndSendReminders } = require('../services/reminderService');

/**
 * Endpoint called by Vercel Cron or manual triggers to evaluate and send prayer reminders.
 * GET /api/cron/check-reminders
 */
const handleCheckReminders = async (req, res) => {
  try {
    // Optional Vercel Cron authorization check (if CRON_SECRET is configured)
    const authHeader = req.headers['authorization'];
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized cron request'
      });
    }

    const summary = await checkAndSendReminders();

    return res.status(200).json({
      success: true,
      message: 'Salah reminder check completed successfully',
      timestamp: new Date().toISOString(),
      summary
    });
  } catch (error) {
    console.error('Error executing check-reminders cron endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process reminders',
      error: error.message
    });
  }
};

module.exports = { handleCheckReminders };
