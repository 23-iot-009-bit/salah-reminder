document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('salah_token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('salah_token');
      localStorage.removeItem('salah_user');
      window.location.href = '/login.html';
    });
  }

  const userNameEl = document.getElementById('userName');
  const userLocationEl = document.getElementById('userLocation');
  const gregorianDateEl = document.getElementById('gregorianDate');
  const hijriDateEl = document.getElementById('hijriDate');
  const prayerGridEl = document.getElementById('prayerGrid');
  const weeklyGridEl = document.getElementById('weeklyGrid');

  const prayerIcons = {
    Fajr: 'fa-mountain-sun',
    Dhuhr: 'fa-sun',
    Asr: 'fa-sun-plant-wilt',
    Maghrib: 'fa-cloud-sun',
    Isha: 'fa-moon'
  };

  const getBadgeClass = (status) => {
    if (status.includes('Done')) return 'badge-done';
    if (status.includes('Missed')) return 'badge-missed';
    if (status.includes('No Response')) return 'badge-no-response';
    if (status.includes('Reminder Sent')) return 'badge-sent';
    return 'badge-pending';
  };

  try {
    const response = await fetch('/api/attendance/today', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      localStorage.removeItem('salah_token');
      window.location.href = '/login.html';
      return;
    }

    const data = await response.json();

    if (data.success) {
      // 1. Set Header User Info & Dates
      if (userNameEl) userNameEl.textContent = data.user.fullName;
      if (userLocationEl) userLocationEl.textContent = `${data.user.city}, ${data.user.country}`;
      if (gregorianDateEl) gregorianDateEl.textContent = data.gregorianDate;
      if (hijriDateEl) hijriDateEl.textContent = data.hijriDate;

      // 2. Render 5 Prayer Cards
      if (prayerGridEl) {
        prayerGridEl.innerHTML = data.prayers.map(prayer => {
          const icon = prayerIcons[prayer.name] || 'fa-mosque';
          const badgeClass = getBadgeClass(prayer.status);

          return `
            <div class="prayer-card">
              <div class="prayer-card-icon">
                <i class="fas ${icon}"></i>
              </div>
              <div class="prayer-name">${prayer.name}</div>
              <div class="prayer-time">${prayer.time}</div>
              <span class="badge ${badgeClass}">${prayer.status}</span>
            </div>
          `;
        }).join('');
      }

      // 3. Render Weekly Summary Progress Widget
      if (weeklyGridEl && data.weeklySummary) {
        weeklyGridEl.innerHTML = data.weeklySummary.map(day => {
          const heightPercent = Math.round((day.doneCount / day.total) * 100);
          return `
            <div class="day-bar-col">
              <div class="day-count">${day.doneCount}/5</div>
              <div class="bar-track">
                <div class="bar-fill" style="height: ${heightPercent}%;"></div>
              </div>
              <div class="day-label">${day.dayName}</div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Error fetching dashboard attendance data:', err);
  }
});
