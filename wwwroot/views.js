import { api } from './api.js';
import { pushOverlay, toast, countdownDelete } from './overlay.js';
import { openInventory } from './inventory.js';

let currentUser = null;

export function setCurrentUser(user) {
  currentUser = user;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function inlineEdit(container, currentValue, placeholder, onSave) {
  const span = el('span', 'editable-value', currentValue || placeholder);
  const btn = document.createElement('button');
  btn.className = 'icon-btn edit-pencil';
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

  btn.onclick = () => {
    const inp = document.createElement('input');
    inp.className = 'inline-input';
    inp.value = currentValue;
    span.replaceWith(inp);
    btn.remove();
    inp.focus();

    const save = async () => {
      const newVal = inp.value.trim();
      if (!newVal || newVal === currentValue) {
        inp.replaceWith(span);
        container.appendChild(btn);
        return;
      }
      try {
        await onSave(newVal);
        span.textContent = newVal;
        currentValue = newVal;
      } catch {
        toast('Ошибка сохранения', 'error');
      }
      inp.replaceWith(span);
      container.appendChild(btn);
    };

    inp.onblur = save;
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') inp.blur();
      if (e.key === 'Escape') {
        inp.value = currentValue;
        inp.blur();
      }
    };
  };

  container.appendChild(span);
  container.appendChild(btn);
}

function userDisplayName(user) {
  if (!user) return '—';
  return [user.first_name, user.last_name].filter(Boolean).join(' ');
}

function loadingSpinner() {
  const s = el('div', 'spinner-wrap');
  s.innerHTML = `<div class="spinner"></div>`;
  return s;
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

export async function renderCreatedTab(container) {
  container.innerHTML = '';
  const spinner = loadingSpinner();
  container.appendChild(spinner);

  try {
    const ids = await api.getMyGames();
    spinner.remove();

    if (!ids.length) {
      container.appendChild(el('div', 'empty-hint', 'Нет созданных игр'));
    } else {
      const list = el('div', 'game-list');
      for (const id of ids) {
        try {
          const game = await api.getGame(id);
          list.appendChild(gameCard(game, true));
        } catch {}
      }
      container.appendChild(list);
    }

    const createBtn = document.createElement('button');
    createBtn.className = 'btn-primary create-game-btn';
    createBtn.textContent = 'Создать игру';
    createBtn.onclick = () => openCreateGameDialog(() => renderCreatedTab(container));
    container.appendChild(createBtn);
  } catch {
    spinner.remove();
    container.appendChild(el('div', 'error-hint', 'Ошибка загрузки'));
  }
}

function gameCard(game, isAdmin) {
  const card = el('div', 'game-card');

  const name = el('div', 'game-card-name', game.Name);
  const desc = el('div', 'game-card-desc', game.Description || 'Нет описания');
  const players = el('div', 'game-card-players', `${game.Players?.length || 0} игр.`);

  card.appendChild(name);
  card.appendChild(desc);
  card.appendChild(players);

  card.onclick = () => {
    if (isAdmin) openAdminGamePanel(game);
    else openPlayerGamePanel(game);
  };

  return card;
}

function openCreateGameDialog(onDone) {
  pushOverlay((wrap, close) => {
    const panel = el('div', 'panel dialog-panel');
    const header = el('div', 'panel-header');
    const back = document.createElement('button');
    back.className = 'icon-btn';
    back.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>`;
    back.onclick = close;
    header.appendChild(back);
    header.appendChild(el('div', 'panel-title', 'Новая игра'));
    panel.appendChild(header);

    const form = el('div', 'dialog-form');
    const nameInp = createField(form, 'Название (3–20)', 'text', '');
    const descInp = createField(form, 'Описание (до 160)', 'text', '');
    const errEl = el('div', 'field-error');
    form.appendChild(errEl);

    const submit = document.createElement('button');
    submit.className = 'btn-primary';
    submit.textContent = 'Создать';
    submit.onclick = async () => {
      const name = nameInp.value.trim();
      const desc = descInp.value.trim();
      if (name.length < 3) { errEl.textContent = 'Мин. 3 символа'; return; }
      if (name.length > 20) { errEl.textContent = 'Макс. 20 символов'; return; }
      submit.disabled = true;
      try {
        await api.createGame(name, desc);
        toast('Игра создана', 'success');
        onDone();
        close();
      } catch {
        toast('Ошибка создания', 'error');
        submit.disabled = false;
      }
    };
    form.appendChild(submit);
    form.appendChild(submit);
    panel.appendChild(form);
    wrap.appendChild(panel);
  });
}

// ─── ADMIN GAME PANEL ─────────────────────────────────────────────────────────

function openAdminGamePanel(gameData) {
  pushOverlay(async (wrap, close) => {
    let game = gameData;
    const panel = el('div', 'panel full-panel');

    const header = el('div', 'panel-header');
    const back = document.createElement('button');
    back.className = 'icon-btn';
    back.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>`;
    back.onclick = close;

    const adminLabel = el('div', 'panel-label', 'Панель администратора');
    header.appendChild(back);
    header.appendChild(adminLabel);

    const dotBtn = document.createElement('button');
    dotBtn.className = 'icon-btn';
    dotBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`;
    dotBtn.onclick = (e) => {
      e.stopPropagation();
      showGameMenu(e.currentTarget, game, close);
    };
    header.appendChild(dotBtn);
    panel.appendChild(header);

    const body = el('div', 'panel-body');

    const nameRow = el('div', 'editable-row');
    const nameLabel = el('div', 'field-label', 'Название');
    nameRow.appendChild(nameLabel);
    inlineEdit(nameRow, game.Name, 'Название', async (val) => {
      const updated = await api.updateGame(game.Id, { Name: val });
      game = updated;
    });
    body.appendChild(nameRow);

    const descRow = el('div', 'editable-row');
    const descLabel = el('div', 'field-label', 'Описание');
    descRow.appendChild(descLabel);
    inlineEdit(descRow, game.Description, 'Описание', async (val) => {
      const updated = await api.updateGame(game.Id, { Description: val });
      game = updated;
    });
    body.appendChild(descRow);

    const playersHeader = el('div', 'section-header');
    const playersTitle = el('div', 'section-title', 'Игроки');
    const addPlayerBtn = document.createElement('button');
    addPlayerBtn.className = 'btn-ghost btn-sm';
    addPlayerBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Добавить`;
    addPlayerBtn.onclick = () => openAddPlayerDialog(game, () => refreshPlayers());

    playersHeader.appendChild(playersTitle);
    playersHeader.appendChild(addPlayerBtn);
    body.appendChild(playersHeader);

    const playerList = el('div', 'player-list');
    body.appendChild(playerList);

    panel.appendChild(body);
    wrap.appendChild(panel);

    let allUsers = [];
    try {
      allUsers = await api.getAllUsers();
    } catch {}

    async function refreshPlayers() {
      try {
        const refreshed = await api.getGame(game.Id);
        game = refreshed;
        renderPlayerList(game.Players || [], allUsers, playerList, game, true, () => refreshPlayers());
      } catch {}
    }

    renderPlayerList(game.Players || [], allUsers, playerList, game, true, () => refreshPlayers());
  });
}

function showGameMenu(anchor, game, closePanel) {
  const existing = document.querySelector('.ctx-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'ctx-item ctx-item-danger';
  deleteBtn.textContent = 'Удалить игру';
  deleteBtn.onclick = () => {
    menu.remove();
    openDeleteGameConfirm(game, closePanel);
  };
  menu.appendChild(deleteBtn);
  document.body.appendChild(menu);

  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  const close = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', close);
    }
  };
  setTimeout(() => document.addEventListener('click', close), 0);
}

function openDeleteGameConfirm(game, onDeleted) {
  pushOverlay((wrap, close) => {
    const panel = el('div', 'panel dialog-panel dialog-center');

    const icon = el('div', 'danger-icon');
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg>`;

    const text = el('div', 'confirm-text', `Удалить «${game.Name}»?`);
    const sub = el('div', 'confirm-sub', 'Это действие необратимо');

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger';
    deleteBtn.textContent = `Удалить (10)`;
    deleteBtn.disabled = true;
    countdownDelete(deleteBtn, 10, 'Удалить', async () => {
      deleteBtn.disabled = true;
      try {
        await api.deleteGame(game.Id);
        toast('Игра удалена', 'success');
        close();
        onDeleted();
        import('./main.js').then(m => m.refreshCurrentTab());
      } catch {
        toast('Ошибка удаления', 'error');
        deleteBtn.disabled = false;
      }
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-ghost';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.onclick = close;

    panel.appendChild(icon);
    panel.appendChild(text);
    panel.appendChild(sub);
    panel.appendChild(deleteBtn);
    panel.appendChild(cancelBtn);
    wrap.appendChild(panel);
  });
}

function renderPlayerList(playerIds, allUsers, container, game, isAdmin, onPlayerDeleted) {
  container.innerHTML = '';
  if (!playerIds.length) {
    container.appendChild(el('div', 'empty-hint', 'Нет игроков'));
    return;
  }

  playerIds.forEach(pid => {
    const user = allUsers.find(u => String(u.id) === String(pid));
    const row = el('div', 'player-row');

    const avatar = el('div', 'player-avatar');
    const initials = user ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '') : '?';
    avatar.textContent = initials.toUpperCase();

    const info = el('div', 'player-info');
    const name = el('div', 'player-name', user ? userDisplayName(user) : `ID ${pid}`);
    const username = el('div', 'player-username', user?.username ? `@${user.username}` : '');
    info.appendChild(name);
    info.appendChild(username);

    row.appendChild(avatar);
    row.appendChild(info);
    row.onclick = () => {
      if (isAdmin) openAdminPlayerPanel(game, pid, user, onPlayerDeleted);
    };
    container.appendChild(row);
  });
}

function openAddPlayerDialog(game, onDone) {
  pushOverlay(async (wrap, close) => {
    const panel = el('div', 'panel dialog-panel');
    const header = el('div', 'panel-header');
    const back = document.createElement('button');
    back.className = 'icon-btn';
    back.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>`;
    back.onclick = close;
    header.appendChild(back);
    header.appendChild(el('div', 'panel-title', 'Добавить игрока'));
    panel.appendChild(header);

    const form = el('div', 'dialog-form');

    const spinner = loadingSpinner();
    form.appendChild(spinner);

    let users = [];
    try {
      const all = await api.getAllUsers();
      users = all.filter(u =>
          String(u.id) !== String(currentUser?.id) &&
          !game.Players?.map(String).includes(String(u.id))
      );
    } catch {}
    spinner.remove();

    const selectLabel = el('label', 'field-label', 'Пользователь');
    form.appendChild(selectLabel);

    const customSelectWrapper = el('div', 'custom-dropdown-wrapper');
    const selectTrigger = el('div', 'custom-dropdown-trigger');
    selectTrigger.innerHTML = `<span class="trigger-text">Выберите пользователя</span><svg class="dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="6 9 12 15 18 9"/></svg>`;

    const optionsContainer = el('div', 'custom-dropdown-options');
    let selectedUserId = null;

    if (!users.length) {
      selectTrigger.querySelector('.trigger-text').textContent = 'Нет доступных пользователей';
      customSelectWrapper.classList.add('disabled');
    } else {
      users.forEach(u => {
        const optionRow = el('div', 'custom-dropdown-option');
        optionRow.dataset.value = u.id;

        const optAvatar = el('div', 'player-avatar dropdown-avatar');
        optAvatar.textContent = ((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase() || '?';

        const optInfo = el('div', 'player-info');
        optInfo.appendChild(el('div', 'player-name', userDisplayName(u)));
        if (u.username) optInfo.appendChild(el('div', 'player-username', `@${u.username}`));

        optionRow.appendChild(optAvatar);
        optionRow.appendChild(optInfo);

        optionRow.onclick = (e) => {
          e.stopPropagation();
          selectedUserId = u.id;
          selectTrigger.querySelector('.trigger-text').innerHTML = '';
          selectTrigger.querySelector('.trigger-text').appendChild(el('span', 'selected-user-name', userDisplayName(u)));
          optionsContainer.classList.remove('open');
          selectTrigger.classList.remove('active');
          submit.disabled = !(selectedUserId && nameInp.value.trim().length >= 3 && nameInp.value.trim().length <= 20);
        };

        optionsContainer.appendChild(optionRow);
      });

      selectTrigger.onclick = (e) => {
        e.stopPropagation();
        const isOpen = optionsContainer.classList.toggle('open');
        selectTrigger.classList.toggle('active', isOpen);
      };

      document.addEventListener('click', () => {
        optionsContainer.classList.remove('open');
        selectTrigger.classList.remove('active');
      }, { once: false });
    }

    customSelectWrapper.appendChild(selectTrigger);
    customSelectWrapper.appendChild(optionsContainer);
    form.appendChild(customSelectWrapper);

    const nameInp = createField(form, 'Имя игрока в игре (3–20)', 'text', '');
    const errEl = el('div', 'field-error');
    form.appendChild(errEl);

    const submit = document.createElement('button');
    submit.className = 'btn-primary';
    submit.textContent = 'Добавить';
    submit.disabled = true;

    nameInp.oninput = () => {
      const nameLen = nameInp.value.trim().length;
      submit.disabled = !(selectedUserId && nameLen >= 3 && nameLen <= 20);
    };

    submit.onclick = async () => {
      const name = nameInp.value.trim();
      if (name.length < 3) { errEl.textContent = 'Мин. 3 символа'; return; }
      if (name.length > 20) { errEl.textContent = 'Макс. 20 символов'; return; }
      if (!selectedUserId) { errEl.textContent = 'Выберите пользователя'; return; }
      submit.disabled = true;
      try {
        await api.createPlayer(game.Id, selectedUserId, name);
        toast('Игрок добавлен', 'success');
        onDone();
        close();
      } catch {
        toast('Ошибка добавления', 'error');
        submit.disabled = false;
      }
    };
    form.appendChild(submit);
    panel.appendChild(form);
    wrap.appendChild(panel);
  });
}

// ─── ADMIN PLAYER PANEL ───────────────────────────────────────────────────────

function openAdminPlayerPanel(game, playerId, userInfo, onDeletedCallback) {
  pushOverlay(async (wrap, close) => {
    const panel = el('div', 'panel full-panel');
    const header = el('div', 'panel-header');
    const back = document.createElement('button');
    back.className = 'icon-btn';
    back.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>`;
    back.onclick = close;
    header.appendChild(back);
    header.appendChild(el('div', 'panel-label', 'Игрок'));
    panel.appendChild(header);

    const body = el('div', 'panel-body');
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.height = '100%';

    const spinner = loadingSpinner();
    body.appendChild(spinner);
    panel.appendChild(body);
    wrap.appendChild(panel);

    let player;
    try {
      player = await api.getPlayer(game.Id, playerId);
    } catch {
      spinner.remove();
      body.appendChild(el('div', 'error-hint', 'Ошибка загрузки'));
      return;
    }
    spinner.remove();

    const avatarWrap = el('div', 'player-detail-avatar-wrap');
    const avatar = el('div', 'player-detail-avatar');
    const initials = userInfo ? (userInfo.first_name?.[0] || '') + (userInfo.last_name?.[0] || '') : '?';
    avatar.textContent = initials.toUpperCase();
    const systemName = el('div', 'player-detail-sysname', userInfo?.username ? `@${userInfo.username}` : `ID ${playerId}`);
    avatarWrap.appendChild(avatar);
    avatarWrap.appendChild(systemName);
    body.appendChild(avatarWrap);

    const nameRow = el('div', 'editable-row editable-row-big');
    inlineEdit(nameRow, player.Name, 'Имя игрока', async (val) => {
      await api.updatePlayer(game.Id, playerId, val);
      player.Name = val;
    });
    body.appendChild(nameRow);

    const invBtn = document.createElement('button');
    invBtn.className = 'btn-secondary full-width';
    invBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> Инвентарь`;
    invBtn.onclick = () => {
      openInventory(game.Id, playerId, player.Name, false, async (inv) => {
        await api.saveInventory(game.Id, playerId, inv);
      });
    };
    body.appendChild(invBtn);

    const settingsSection = el('div', 'player-settings-section');
    settingsSection.style.marginTop = 'auto';
    settingsSection.style.width = '100%';

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'btn-ghost full-width btn-settings-toggle';
    settingsBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Настроить`;

    const settingsPanel = el('div', 'player-settings-panel hidden');

    const preDeleteBtn = document.createElement('button');
    preDeleteBtn.className = 'btn-danger full-width';
    preDeleteBtn.textContent = 'Удалить игрока';

    preDeleteBtn.onclick = () => {
      pushOverlay((popWrap, popClose) => {
        const p = el('div', 'panel dialog-panel dialog-center');

        const icon = el('div', 'danger-icon');
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg>`;

        const text = el('div', 'confirm-text', `Удалить игрока «${player.Name}»?`);
        const sub = el('div', 'confirm-sub', 'Это действие необратимо');

        const fDelBtn = document.createElement('button');
        fDelBtn.className = 'btn-danger';
        fDelBtn.textContent = 'Удалить (10)';
        fDelBtn.disabled = true;

        countdownDelete(fDelBtn, 10, 'Удалить', async () => {
          fDelBtn.disabled = true;
          try {
            await api.deletePlayer(game.Id, playerId);
            toast('Игрок удалён', 'success');
            popClose();
            close();
            if (onDeletedCallback) onDeletedCallback();
          } catch {
            toast('Ошибка удаления', 'error');
            fDelBtn.disabled = false;
          }
        });

        const cBtn = document.createElement('button');
        cBtn.className = 'btn-ghost';
        cBtn.textContent = 'Отмена';
        cBtn.onclick = popClose;

        p.appendChild(icon);
        p.appendChild(text);
        p.appendChild(sub);
        p.appendChild(fDelBtn);
        p.appendChild(cBtn);
        popWrap.appendChild(p);
      });
    };

    settingsBtn.onclick = () => {
      settingsPanel.classList.toggle('hidden');
    };

    settingsPanel.appendChild(preDeleteBtn);
    settingsSection.appendChild(settingsBtn);
    settingsSection.appendChild(settingsPanel);
    body.appendChild(settingsSection);
  });
}

// ─── PLAYER PLAYING PANEL ─────────────────────────────────────────────────────

export async function renderPlayingTab(container) {
  container.innerHTML = '';
  const spinner = loadingSpinner();
  container.appendChild(spinner);

  try {
    const games = await api.getPlayerGames();
    spinner.remove();

    if (!games.length) {
      container.appendChild(el('div', 'empty-hint', 'Вы не участвуете ни в одной игре'));
      return;
    }

    const list = el('div', 'game-list');
    games.forEach(game => {
      list.appendChild(gameCard(game, false));
    });
    container.appendChild(list);
  } catch {
    spinner.remove();
    container.appendChild(el('div', 'error-hint', 'Ошибка загрузки'));
  }
}

function openPlayerGamePanel(game) {
  pushOverlay(async (wrap, close) => {
    const panel = el('div', 'panel full-panel');
    const header = el('div', 'panel-header');
    const back = document.createElement('button');
    back.className = 'icon-btn';
    back.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>`;
    back.onclick = close;
    header.appendChild(back);
    header.appendChild(el('div', 'panel-label', 'Панель игрока'));
    panel.appendChild(header);

    const body = el('div', 'panel-body');

    const nameEl = el('div', 'game-panel-name', game.Name);
    const descEl = el('div', 'game-panel-desc', game.Description || '');
    body.appendChild(nameEl);
    body.appendChild(descEl);

    const spinner = loadingSpinner();
    body.appendChild(spinner);
    panel.appendChild(body);
    wrap.appendChild(panel);

    let self;
    try {
      self = await api.getPlayerSelf(game.Id);
    } catch {
      spinner.remove();
      body.appendChild(el('div', 'error-hint', 'Ошибка загрузки'));
      return;
    }
    spinner.remove();

    const nameRow = el('div', 'editable-row');
    nameRow.appendChild(el('div', 'field-label', 'Моё имя в игре'));
    inlineEdit(nameRow, self.Name, 'Имя', async (val) => {
      await api.updateMyName(game.Id, val);
      self.Name = val;
    });
    body.appendChild(nameRow);

    const invBtn = document.createElement('button');
    invBtn.className = 'btn-secondary full-width';
    invBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> Инвентарь`;
    invBtn.onclick = () => {
      openInventory(game.Id, null, self.Name, true, null);
    };
    body.appendChild(invBtn);
  });
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function renderUsersTab(container) {
  container.innerHTML = '';
  const spinner = loadingSpinner();
  container.appendChild(spinner);

  try {
    const users = await api.getAllUsers();
    spinner.remove();

    const filtered = users.filter(u => String(u.id) !== String(currentUser?.id));

    if (!filtered.length) {
      container.appendChild(el('div', 'empty-hint', 'Нет других пользователей'));
      return;
    }

    const list = el('div', 'user-list');
    filtered.forEach(user => {
      const row = el('div', 'user-row');
      const avatar = el('div', 'player-avatar');
      avatar.textContent = ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || '?';
      const info = el('div', 'player-info');
      info.appendChild(el('div', 'player-name', userDisplayName(user)));
      if (user.username) info.appendChild(el('div', 'player-username', `@${user.username}`));
      row.appendChild(avatar);
      row.appendChild(info);
      list.appendChild(row);
    });
    container.appendChild(list);
  } catch {
    spinner.remove();
    container.appendChild(el('div', 'error-hint', 'Ошибка загрузки'));
  }
}

// ─── FIELD HELPER ─────────────────────────────────────────────────────────────

function createField(container, label, type, value) {
  const lbl = el('label', 'field-label', label);
  const inp = document.createElement('input');
  inp.className = 'field-input';
  inp.type = type;
  inp.value = value;
  container.appendChild(lbl);
  container.appendChild(inp);
  return inp;
}