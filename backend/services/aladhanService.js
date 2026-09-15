const axios = require('axios');

const cache = new Map();

const getPrayerTimesByCity = async (city, country) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const cacheKey = `${city.toLowerCase()}_${country.toLowerCase()}_${todayStr}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const response = await axios.get('https://api.aladhan.com/v1/timingsByCity', {
      params: {
        city: city,
        country: country,
        method: 2 // ISNA calculation method by default
      },
      timeout: 8000
    });

    if (response.data && response.data.code === 200) {
      const timings = response.data.data.timings;
      const hijri = response.data.data.date.hijri;
      const gregorian = response.data.data.date.gregorian;

      const meta = response.data.data.meta || {};

      const result = {
        timings: {
          Fajr: timings.Fajr,
          Dhuhr: timings.Dhuhr,
          Asr: timings.Asr,
          Maghrib: timings.Maghrib,
          Isha: timings.Isha
        },
        timezone: meta.timezone || 'UTC',
        hijriDate: `${hijri.day} ${hijri.month.en} ${hijri.year} AH`,
        gregorianDate: `${gregorian.day} ${gregorian.month.en} ${gregorian.year}`
      };

      cache.set(cacheKey, result);
      return result;
    }
    throw new Error('Invalid response from Aladhan API');
  } catch (error) {
    console.error(`Error fetching Aladhan prayer times for ${city}, ${country}:`, error.message);
    // Fallback timings if external API is unreachable or fails
    return {
      timings: {
        Fajr: '05:00',
        Dhuhr: '12:30',
        Asr: '15:45',
        Maghrib: '18:15',
        Isha: '19:45'
      },
      timezone: 'UTC',
      hijriDate: '15 Ramadan 1447 AH',
      gregorianDate: new Date().toDateString()
    };
  }
};

module.exports = { getPrayerTimesByCity };
