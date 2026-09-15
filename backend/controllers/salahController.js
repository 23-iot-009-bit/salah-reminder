const User = require('../models/User');
const { getPrayerTimesByCity } = require('../services/aladhanService');

const getSalahTimes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const prayerData = await getPrayerTimesByCity(user.city, user.country);

    return res.status(200).json({
      success: true,
      city: user.city,
      country: user.country,
      gregorianDate: prayerData.gregorianDate,
      hijriDate: prayerData.hijriDate,
      timings: prayerData.timings
    });
  } catch (error) {
    console.error('Error in getSalahTimes:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve Salah times' });
  }
};

module.exports = { getSalahTimes };
