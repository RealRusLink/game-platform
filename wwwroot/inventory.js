import { pushOverlay, toast } from './overlay.js';

const TYPE_ICONS = {
  item:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  resource:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3h18v18H3z"/><path d="M9 9h6v6H9z"/></svg>`,
  currency:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v2m0 8v2m-4-6h8m-6-2a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/></svg>`,
  material:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  cathegory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
};

const TYPE_LABELS = {
  item: 'Предмет', resource: 'Ресурс', currency: 'Валюта', material: 'Материал', cathegory: 'Категория',
};

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

function collectAllKeys(inventory, result = new Set()) {
  for (const [key, val] of Object.entries(inventory)) {
    result.add(key);
    if (val.type === 'cathegory' && val.value?.items) collectAllKeys(val.value.items, result);
  }
  return result;
}

function updateKeyInInventory(inventory, oldKey, newKey, newVal) {
  if (oldKey in inventory) {
    const entries = Object.entries(inventory);
    const idx = entries.findIndex(([k]) => k === oldKey);
    entries.splice(idx, 1, [newKey, newVal]);
    for (const k of Object.keys(inventory)) delete inventory[k];
    for (const [k, v] of entries) inventory[k] = v;
    return true;
  }
  for (const val of Object.values(inventory)) {
    if (val.type === 'cathegory' && val.value?.items) {
      if (updateKeyInInventory(val.value.items, oldKey, newKey, newVal)) return true;
    }
  }
  return false;
}

function deleteFromInventory(inventory, targetKey) {
  if (targetKey in inventory) { delete inventory[targetKey]; return true; }
  for (const val of Object.values(inventory)) {
    if (val.type === 'cathegory' && val.value?.items) {
      if (deleteFromInventory(val.value.items, targetKey)) return true;
    }
  }
  return false;
}

function showItemContextMenu(anchor, name, item, fullInventory, localContainer, onSync, onRefresh) {
  const existing = document.querySelector('.ctx-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'ctx-menu';

  const editBtn = document.createElement('button');
  editBtn.className = 'ctx-item';
  editBtn.textContent = 'Редактировать';
  editBtn.onclick = () => {
    menu.remove();
    openEditMetaDialog(name, item, fullInventory, onSync, onRefresh);
  };
  menu.appendChild(editBtn);

  if (item.type === 'resource' || item.type === 'currency') {
    const countBtn = document.createElement('button');
    countBtn.className = 'ctx-item';
    countBtn.textContent = 'Изменить количество';
    countBtn.onclick = () => {
      menu.remove();
      openCountDialog(name, item, fullInventory, onSync, onRefresh);
    };
    menu.appendChild(countBtn);
  }

  if (item.type === 'material') {
    const linkBtn = document.createElement('button');
    linkBtn.className = 'ctx-item';
    linkBtn.textContent = 'Изменить ссылку';
    linkBtn.onclick = () => {
      menu.remove();
      openLinkDialog(name, item, fullInventory, onSync, onRefresh);
    };
    menu.appendChild(linkBtn);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'ctx-item ctx-item-danger';
  deleteBtn.textContent = 'Удалить';
  deleteBtn.onclick = () => {
    menu.remove();
    pushOverlay((wrap, close) => {
      const p = document.createElement('div');
      p.className = 'panel dialog-panel dialog-center';

      const icon = document.createElement('div');
      icon.className = 'danger-icon';
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg>`;

      const text = document.createElement('div');
      text.className = 'confirm-text';
      text.textContent = `Удалить «${name}»?`;

      const sub = document.createElement('div');
      sub.className = 'confirm-sub';
      sub.textContent = 'Это действие необратимо';

      const fDelBtn = document.createElement('button');
      fDelBtn.className = 'btn-danger';
      fDelBtn.textContent = 'Удалить (10)';
      fDelBtn.disabled = true;

      import('./overlay.js').then(m => {
        m.countdownDelete(fDelBtn, 10, 'Удалить', async () => {
          fDelBtn.disabled = true;
          deleteFromInventory(fullInventory, name);
          onRefresh();
          close();
          await onSync();
        });
      });

      const cBtn = document.createElement('button');
      cBtn.className = 'btn-ghost';
      cBtn.textContent = 'Отмена';
      cBtn.onclick = close;

      p.appendChild(icon);
      p.appendChild(text);
      p.appendChild(sub);
      p.appendChild(fDelBtn);
      p.appendChild(cBtn);
      wrap.appendChild(p);
    });
  };
  menu.appendChild(deleteBtn);

  document.body.appendChild(menu);
  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;

  const close = (e) => {
    if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', close); }
  };
  setTimeout(() => document.addEventListener('click', close), 0);
}

function openEditMetaDialog(name, item, fullInventory, onSync, onRefresh) {
  pushOverlay((wrap, close) => {
    const panel = mkPanel('Редактировать');
    const back = mkBackBtn(close);
    panel.querySelector('.panel-header').prepend(back);

    const form = document.createElement('div');
    form.className = 'dialog-form';

    const nameInp = createField(form, 'Название', 'text', name);
    const descInp = createField(form, 'Описание', 'text', item.description || '');
    const errEl = document.createElement('div');
    errEl.className = 'field-error';
    form.appendChild(errEl);

    const submit = document.createElement('button');
    submit.className = 'btn-primary';
    submit.textContent = 'Сохранить';
    submit.onclick = async () => {
      const newName = nameInp.value.trim();
      if (!newName) { errEl.textContent = 'Название обязательно'; return; }
      if (newName !== name) {
        const keys = collectAllKeys(fullInventory);
        keys.delete(name);
        if (keys.has(newName)) { errEl.textContent = 'Название должно быть уникальным'; return; }
      }
      const newItem = deepClone(item);
      newItem.description = descInp.value.trim();
      updateKeyInInventory(fullInventory, name, newName, newItem);
      onRefresh();
      close();
      await onSync();
    };
    form.appendChild(submit);

    panel.querySelector('.panel-body-slot').appendChild(form);
    wrap.appendChild(panel);
  });
}

function openCountDialog(name, item, fullInventory, onSync, onRefresh) {
  pushOverlay((wrap, close) => {
    const panel = mkPanel('Количество');
    const back = mkBackBtn(close);
    panel.querySelector('.panel-header').prepend(back);

    const isResource = item.type === 'resource';
    let current = item.value?.count ?? 0;

    const inner = document.createElement('div');
    inner.className = 'count-dialog';

    const minusBtn = document.createElement('button');
    minusBtn.className = 'count-stepper';
    minusBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

    const inputEl = document.createElement('input');
    inputEl.className = 'count-input';
    inputEl.type = 'number';
    inputEl.value = current;
    inputEl.step = isResource ? '1' : '0.01';

    const plusBtn = document.createElement('button');
    plusBtn.className = 'count-stepper';
    plusBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

    function step(delta) {
      let v = parseFloat(inputEl.value) || 0;
      v += delta;
      if (isResource && v < 1) v = 1;
      inputEl.value = isResource ? Math.round(v) : parseFloat(v.toFixed(2));
    }

    minusBtn.onclick = () => step(-1);
    plusBtn.onclick  = () => step(1);

    inner.appendChild(minusBtn);
    inner.appendChild(inputEl);
    inner.appendChild(plusBtn);

    const errEl = document.createElement('div');
    errEl.className = 'field-error count-error';

    const submit = document.createElement('button');
    submit.className = 'btn-primary';
    submit.textContent = 'Применить';
    submit.onclick = async () => {
      let v = isResource ? parseInt(inputEl.value) : parseFloat(parseFloat(inputEl.value).toFixed(2));
      if (isResource && (!v || v < 1)) { errEl.textContent = 'Целое число > 0'; return; }
      if (isNaN(v)) { errEl.textContent = 'Введите число'; return; }
      item.value = { count: v };
      onRefresh();
      close();
      await onSync();
    };

    const slot = panel.querySelector('.panel-body-slot');
    slot.appendChild(inner);
    slot.appendChild(errEl);
    slot.style.padding = '28px 16px 24px';
    slot.appendChild(submit);
    wrap.appendChild(panel);
  });
}

function openLinkDialog(name, item, fullInventory, onSync, onRefresh) {
  pushOverlay((wrap, close) => {
    const panel = mkPanel('Ссылка');
    const back = mkBackBtn(close);
    panel.querySelector('.panel-header').prepend(back);

    const form = document.createElement('div');
    form.className = 'dialog-form';

    const linkInp = createField(form, 'URL', 'text', item.value?.link || '');
    const errEl = document.createElement('div');
    errEl.className = 'field-error';
    form.appendChild(errEl);

    const submit = document.createElement('button');
    submit.className = 'btn-primary';
    submit.textContent = 'Сохранить';
    submit.onclick = async () => {
      const v = linkInp.value.trim();
      if (!v) { errEl.textContent = 'Ссылка не может быть пустой'; return; }
      item.value = { link: v };
      onRefresh();
      close();
      await onSync();
    };
    form.appendChild(submit);

    panel.querySelector('.panel-body-slot').appendChild(form);
    wrap.appendChild(panel);
  });
}

function openAddItemDialog(fullInventory, targetContainer, onSync, onRefresh) {
  pushOverlay((wrap, close) => {
    const panel = mkPanel('Добавить предмет');
    const back = mkBackBtn(close);
    panel.querySelector('.panel-header').prepend(back);

    const form = document.createElement('div');
    form.className = 'dialog-form';

    const typeLbl = document.createElement('label');
    typeLbl.className = 'field-label';
    typeLbl.textContent = 'Тип';
    form.appendChild(typeLbl);

    const typeSelector = document.createElement('div');
    typeSelector.className = 'type-selector';
    let selectedType = 'item';

    ['item', 'resource', 'currency', 'material', 'cathegory'].forEach(t => {
      const btn = document.createElement('button');
      btn.className = `type-btn${t === 'item' ? ' active' : ''}`;
      btn.innerHTML = TYPE_ICONS[t];
      btn.title = TYPE_LABELS[t];
      btn.onclick = () => {
        selectedType = t;
        typeSelector.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateValueFields();
      };
      typeSelector.appendChild(btn);
    });
    form.appendChild(typeSelector);

    const nameInp = createField(form, 'Название', 'text', '');
    const descInp = createField(form, 'Описание', 'text', '');

    const valueSection = document.createElement('div');
    valueSection.className = 'value-section';
    form.appendChild(valueSection);

    let countInp = null, linkInp = null;

    function updateValueFields() {
      valueSection.innerHTML = '';
      countInp = null; linkInp = null;
      if (selectedType === 'resource')  countInp = createField(valueSection, 'Quantity (integer > 0)', 'number', '1');
      if (selectedType === 'currency')  countInp = createField(valueSection, 'Quantity (decimal)',   'number', '0');
      if (selectedType === 'material')  linkInp  = createField(valueSection, 'Link', 'text', 'https://');
    }
    updateValueFields();

    const errEl = document.createElement('div');
    errEl.className = 'field-error';
    form.appendChild(errEl);

    const submit = document.createElement('button');
    submit.className = 'btn-primary';
    submit.textContent = 'Добавить';
    submit.onclick = async () => {
      const name = nameInp.value.trim();
      if (!name) { errEl.textContent = 'Название обязательно'; return; }
      const allKeys = collectAllKeys(fullInventory);
      if (allKeys.has(name)) { errEl.textContent = 'Название должно быть уникальным'; return; }

      let value = {};
      if (selectedType === 'resource') {
        const v = parseInt(countInp.value);
        if (!v || v < 1) { errEl.textContent = 'Количество должно быть > 0'; return; }
        value = { count: v };
      } else if (selectedType === 'currency') {
        value = { count: parseFloat(parseFloat(countInp.value || '0').toFixed(2)) };
      } else if (selectedType === 'material') {
        if (!linkInp.value.trim()) { errEl.textContent = 'Ссылка обязательна'; return; }
        value = { link: linkInp.value.trim() };
      } else if (selectedType === 'cathegory') {
        value = { items: {} };
      }

      const target = targetContainer || fullInventory;
      target[name] = { description: descInp.value.trim(), type: selectedType, value };
      onRefresh();
      close();
      await onSync();
    };
    form.appendChild(submit);

    panel.querySelector('.panel-body-slot').appendChild(form);
    wrap.appendChild(panel);
  });
}

function openCategoryPanel(catName, catItem, fullInventory, readonly, onSync) {
  pushOverlay((wrap, close) => {
    const panel = document.createElement('div');
    panel.className = 'panel full-panel';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'flex-start';

    const back = mkBackBtn(close);
    header.appendChild(back);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = catName;
    title.style.marginLeft = '12px';
    header.appendChild(title);

    if (!readonly) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn-ghost btn-sm';
      addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Добавить`;
      addBtn.style.marginLeft = 'auto';
      addBtn.onclick = () => openAddItemDialog(fullInventory, catItem.value.items, onSync, renderList);
      header.appendChild(addBtn);
    }

    panel.appendChild(header);

    const listEl = document.createElement('div');
    listEl.className = 'inv-list';
    panel.appendChild(listEl);

    function renderList() {
      renderInventoryLevel(catItem.value.items, listEl, fullInventory, readonly, onSync);
    }
    renderList();

    wrap.appendChild(panel);
  });
}

function renderInventoryLevel(localInv, container, fullInventory, readonly, onSync) {
  container.innerHTML = '';

  const entries = Object.entries(localInv);
  if (!entries.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-hint';
    empty.textContent = 'Пусто';
    container.appendChild(empty);
    return;
  }

  for (const [name, item] of entries) {
    const row = document.createElement('div');
    row.className = 'inv-row';

    const left = document.createElement('div');
    left.className = 'inv-row-left';

    const icon = document.createElement('span');
    icon.className = `inv-icon inv-icon-${item.type}`;
    icon.innerHTML = TYPE_ICONS[item.type] || '';

    const info = document.createElement('div');
    info.className = 'inv-row-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'inv-row-name';
    nameEl.textContent = name;

    info.appendChild(nameEl);

    if (item.description) {
      const desc = document.createElement('div');
      desc.className = 'inv-row-desc';
      desc.textContent = item.description;
      info.appendChild(desc);
    }

    if (item.type === 'resource' || item.type === 'currency') {
      const meta = document.createElement('div');
      meta.className = 'inv-row-meta';
      meta.textContent = item.value?.count?.toString() ?? '0';
      info.appendChild(meta);
    } else if (item.type === 'material') {
      const meta = document.createElement('div');
      meta.className = 'inv-row-meta inv-link';
      meta.textContent = item.value?.link || '—';
      info.appendChild(meta);
    } else if (item.type === 'cathegory') {
      const meta = document.createElement('div');
      meta.className = 'inv-row-meta';
      meta.textContent = `${Object.keys(item.value?.items || {}).length} предм.`;
      info.appendChild(meta);
    }

    left.appendChild(icon);
    left.appendChild(info);
    row.appendChild(left);

    if (item.type === 'cathegory') {
      const chevron = document.createElement('span');
      chevron.className = 'inv-chevron';
      chevron.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>`;
      row.appendChild(chevron);
      row.style.cursor = 'pointer';
      row.onclick = () => openCategoryPanel(name, item, fullInventory, readonly, onSync);
    }

    if (!readonly) {
      const menuBtn = document.createElement('button');
      menuBtn.className = 'icon-btn';
      menuBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`;
      menuBtn.onclick = (e) => {
        e.stopPropagation();
        showItemContextMenu(
            e.currentTarget, name, item,
            fullInventory, localInv,
            onSync,
            () => renderInventoryLevel(localInv, container, fullInventory, readonly, onSync)
        );
      };
      row.appendChild(menuBtn);
    }

    container.appendChild(row);
  }
}

export function openInventory(gameId, playerId, playerName, readonly, saveCallback) {
  pushOverlay((wrap, close) => {
    let inventory = {};

    const panel = document.createElement('div');
    panel.className = 'panel full-panel';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'flex-start';

    const back = mkBackBtn(close);
    header.appendChild(back);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = `Инвентарь`;
    title.style.marginLeft = '12px';
    header.appendChild(title);

    if (!readonly) {
      const addBtn = document.createElement('button');
      addBtn.className = 'btn-ghost btn-sm';
      addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Добавить`;
      addBtn.style.marginLeft = 'auto';
      header.appendChild(addBtn);
      addBtn.onclick = () => openAddItemDialog(inventory, null, syncInventory, renderList);
    }

    panel.appendChild(header);

    const listEl = document.createElement('div');
    listEl.className = 'inv-list';
    panel.appendChild(listEl);

    wrap.appendChild(panel);

    async function syncInventory() {
      if (readonly) return;
      try {
        await saveCallback(inventory);
      } catch {
        toast('Ошибка синхронизации', 'error');
      }
    }

    function renderList() {
      renderInventoryLevel(inventory, listEl, inventory, readonly, syncInventory);
    }

    import('./api.js').then(({ api }) => {
      const load = readonly
          ? api.getPlayerSelf(gameId).then(d => d.Inventory || {})
          : api.getInventory(gameId, playerId).then(d => d || {});

      load.then(data => {
        inventory = data;
        renderList();
      }).catch(() => {
        listEl.innerHTML = '<div class="error-hint">Ошибка загрузки</div>';
      });
    });
  });
}

function mkPanel(titleText) {
  const panel = document.createElement('div');
  panel.className = 'panel dialog-panel';

  const header = document.createElement('div');
  header.className = 'panel-header';

  const titleEl = document.createElement('div');
  titleEl.className = 'panel-title';
  titleEl.textContent = titleText;
  header.appendChild(titleEl);

  const slot = document.createElement('div');
  slot.className = 'panel-body-slot';

  panel.appendChild(header);
  panel.appendChild(slot);
  return panel;
}

function mkBackBtn(close) {
  const btn = document.createElement('button');
  btn.className = 'icon-btn';
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>`;
  btn.onclick = close;
  return btn;
}

function createField(container, label, type, value) {
  const lbl = document.createElement('label');
  lbl.className = 'field-label';
  lbl.textContent = label;
  const inp = document.createElement('input');
  inp.className = 'field-input';
  inp.type = type;
  inp.value = value;
  if (type === 'number') inp.step = 'any';
  container.appendChild(lbl);
  container.appendChild(inp);
  return inp;
}