document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const prayer = params.get('prayer') || 'Salah';
  const status = params.get('status') || 'recorded';
  const already = params.get('already') === 'true';

  const iconEl = document.getElementById('confirmationIcon');
  const titleEl = document.getElementById('confirmationTitle');
  const messageEl = document.getElementById('confirmationMessage');

  if (already) {
    if (iconEl) iconEl.className = 'fas fa-info-circle confirmation-icon warning';
    if (titleEl) titleEl.textContent = 'Already Recorded';
    if (messageEl) {
      messageEl.innerHTML = `Your <strong>${prayer}</strong> attendance was already marked as <strong>${status}</strong> for today.`;
    }
  } else {
    if (iconEl) iconEl.className = 'fas fa-check-circle confirmation-icon success';
    if (titleEl) titleEl.textContent = 'Attendance Recorded!';
    if (messageEl) {
      messageEl.innerHTML = `Thank you! Your <strong>${prayer}</strong> attendance has been marked as <strong>${status}</strong>.`;
    }
  }
});
