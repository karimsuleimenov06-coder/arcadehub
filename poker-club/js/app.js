// ---- Navigation ----
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
}

// ---- Settings ----
function saveSettings() {
  const name = document.getElementById('player-name-input').value.trim() || 'Игрок';
  document.querySelectorAll('.player-name').forEach(el => { el.textContent = name; });
  alert('Настройки сохранены');
}
