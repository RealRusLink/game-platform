const stack = document.getElementById('overlay-stack');

function createOverlay(className) {
  const overlay = document.createElement('div');
  overlay.className = `overlay ${className}`;
  return overlay;
}

export function pushOverlay(renderFn) {
  const wrap = document.createElement('div');
  wrap.className = 'overlay-wrap';
  stack.appendChild(wrap);
  renderFn(wrap, () => {
    wrap.classList.add('leaving');
    wrap.addEventListener('animationend', () => wrap.remove(), { once: true });
  });
  requestAnimationFrame(() => wrap.classList.add('visible'));
}

export function closeTopOverlay() {
  const wraps = stack.querySelectorAll('.overlay-wrap');
  const last = wraps[wraps.length - 1];
  if (!last) return;
  last.classList.add('leaving');
  last.addEventListener('animationend', () => last.remove(), { once: true });
}

export function closeAllOverlays() {
  stack.innerHTML = '';
}

// Toast notifications
export function toast(msg, type = 'info') { 
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => {
    el.classList.remove('visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }, 2800);
}

// Countdown delete button
export function countdownDelete(btn, seconds, label, onConfirm) {
  let remaining = seconds;
  btn.disabled = true;
  btn.textContent = `Удалить (${remaining})`;
  const interval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(interval);
      btn.disabled = false;
      btn.textContent = label;
      btn.onclick = onConfirm;
    } else {
      btn.textContent = `Удалить (${remaining})`;
    }
  }, 1000);
}
