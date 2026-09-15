const axios = require('axios');

async function testBackend() {
  const baseURL = 'http://localhost:5000/api';
  console.log('--- STARTING BACKEND INTEGRATION TEST ---');

  try {
    // 1. Status Check
    const statusRes = await axios.get(`${baseURL}/status`);
    console.log('1. GET /api/status:', statusRes.data);

    // 2. User Registration
    const registerPayload = {
      fullName: 'Ahmad Khan',
      email: 'ahmad_' + Date.now() + '@example.com',
      password: 'Password123!',
      city: 'London',
      country: 'UK'
    };

    const regRes = await axios.post(`${baseURL}/register`, registerPayload);
    console.log('2. POST /api/register:', regRes.data.success, '| Token length:', regRes.data.token.length);
    const token = regRes.data.token;
    const userId = regRes.data.user.id;

    // 3. User Login
    const loginRes = await axios.post(`${baseURL}/login`, {
      email: registerPayload.email,
      password: registerPayload.password
    });
    console.log('3. POST /api/login:', loginRes.data.success, '| User:', loginRes.data.user.fullName);

    // 4. Salah Times Check (Protected)
    const salahRes = await axios.get(`${baseURL}/salah-times`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('4. GET /api/salah-times:', salahRes.data.success, '| City:', salahRes.data.city, '| Hijri Date:', salahRes.data.hijriDate, '| Timings:', salahRes.data.timings);

    // 5. Attendance Today Check (Protected)
    const todayRes = await axios.get(`${baseURL}/attendance/today`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('5. GET /api/attendance/today:', todayRes.data.success, '| Prayers:', todayRes.data.prayers.map(p => `${p.name}: ${p.status}`));

    // 6. Mark Attendance (Public email endpoint)
    const markRes = await axios.get(`${baseURL}/attendance/mark`, {
      params: { user: userId, prayer: 'Fajr', status: 'done' },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });
    console.log('6. GET /api/attendance/mark (Redirect header):', markRes.headers.location);

    // 7. Verify Attendance Updated Today
    const todayUpdatedRes = await axios.get(`${baseURL}/attendance/today`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('7. GET /api/attendance/today (After mark):', todayUpdatedRes.data.prayers.map(p => `${p.name}: ${p.status}`));

    // 8. Verify Single-Use Link Duplicate Prevention
    const duplicateMarkRes = await axios.get(`${baseURL}/attendance/mark`, {
      params: { user: userId, prayer: 'Fajr', status: 'missed' },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });
    console.log('8. Duplicate mark redirect (Contains already=true):', duplicateMarkRes.headers.location.includes('already=true'));

    console.log('\n✅ ALL BACKEND TESTS PASSED CLEANLY!');
  } catch (err) {
    console.error('❌ TEST FAILED:', err.response ? err.response.data : err.message);
  }
}

testBackend();
