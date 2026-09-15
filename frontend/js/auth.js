document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const alertBox = document.getElementById('alertBox');

  const showAlert = (message, type = 'error') => {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
  };

  const hideAlert = () => {
    if (!alertBox) return;
    alertBox.style.display = 'none';
  };

  // 1. Handle Registration
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const city = document.getElementById('city').value.trim();
      const country = document.getElementById('country').value.trim();
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      if (!fullName || !email || !password || !city || !country) {
        showAlert('Please fill in all required fields.');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, email, password, city, country })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          localStorage.setItem('salah_token', data.token);
          localStorage.setItem('salah_user', JSON.stringify(data.user));
          showAlert('Account created successfully! Redirecting to dashboard...', 'success');
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 1000);
        } else {
          showAlert(data.message || 'Registration failed. Please try again.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Create Account';
        }
      } catch (err) {
        showAlert('Server connection error. Please ensure backend is running.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account';
      }
    });
  }

  // 2. Handle Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      if (!email || !password) {
        showAlert('Please enter both email and password.');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          localStorage.setItem('salah_token', data.token);
          localStorage.setItem('salah_user', JSON.stringify(data.user));
          showAlert('Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 800);
        } else {
          showAlert(data.message || 'Invalid email or password.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Sign In';
        }
      } catch (err) {
        showAlert('Server connection error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In';
      }
    });
  }
});
