import { api } from './api.js';
import { renderCreatedTab, renderPlayingTab, renderUsersTab, setCurrentUser } from './views.js';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

let activeTab = 'created';
const content = document.getElementById('content');
const userNameDisplay = document.getElementById('user-name-display');

// Bootstrap
async function init() {
  try {
    const user = await api.getProfile();
    setCurrentUser(user);

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    userNameDisplay.textContent = fullName || user.username || 'Пользователь';

    switchTab('created');
  } catch (e) {
    userNameDisplay.textContent = 'Ошибка авторизации';
    content.innerHTML = '<div class="error-hint">Не удалось загрузить профиль. Откройте через Telegram.</div>';
  }
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

export function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  switch (tab) {
    case 'created': renderCreatedTab(content); break;
    case 'playing': renderPlayingTab(content); break;
    case 'users': renderUsersTab(content); break;
  }
}

export function refreshCurrentTab() {
  switchTab(activeTab);
}

init();
