// Utilidades de interfaz del panel: escape, formato, toasts, diálogos.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => (v == null ? '' : String(v).replace(/[&<>"']/g, (c) => ESC[c]));

const copFmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
export const cop = (n) => (n == null || n === '' || Number.isNaN(Number(n)) ? '—' : `$${copFmt.format(Number(n))}`);
/** "$219.000" / "219000" / "219.000" → 219000; vacío → null */
export const parseMoney = (s) => {
  const digits = String(s ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : null;
};
export const moneyInputValue = (n) => (n == null ? '' : `$${copFmt.format(n)}`);

export const slugify = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const fmtDate = (d, withTime = false) => {
  if (!d) return '—';
  const date = typeof d === 'string' && d.length === 10 ? new Date(`${d}T00:00:00`) : new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
};

export const intOrNull = (v) => {
  if (v === '' || v == null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ───────── Toasts ─────────
export function toast(message, type = 'ok') {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  box.append(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => el.remove(), 300);
  }, type === 'error' ? 6000 : 3200);
}

/** Traduce errores de Supabase/Postgres a mensajes entendibles. */
export function errorMessage(err) {
  if (!err) return 'Ocurrió un error inesperado.';
  const code = err.code || '';
  const msg = err.message || String(err);
  if (code === '23505') return 'Ya existe un registro con ese mismo nombre o slug. Usa uno diferente.';
  if (code === '23503') return 'No se puede eliminar porque está siendo usado por otros registros (por ejemplo, pedidos).';
  if (code === '42501' || /row-level security/i.test(msg)) return 'No tienes permisos para esta acción.';
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'El correo aún no ha sido confirmado.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'No hay conexión con el servidor. Revisa tu internet.';
  return msg;
}

export const toastError = (err, prefix = '') => {
  console.error(err);
  toast(`${prefix}${errorMessage(err)}`, 'error');
};

// ───────── Diálogos ─────────
/** Confirmación con <dialog>. Devuelve Promise<boolean>. */
export function confirmDialog({ title = '¿Estás segura?', message = '', confirmText = 'Eliminar', danger = true } = {}) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'dlg dlg--confirm';
    dlg.innerHTML = `
      <form method="dialog" class="dlg__body">
        <h3>${esc(title)}</h3>
        ${message ? `<p>${esc(message)}</p>` : ''}
        <div class="dlg__actions">
          <button value="cancel" class="btn btn--ghost">Cancelar</button>
          <button value="ok" class="btn ${danger ? 'btn--danger' : 'btn--primary'}">${esc(confirmText)}</button>
        </div>
      </form>`;
    document.body.append(dlg);
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue === 'ok');
      dlg.remove();
    });
    dlg.showModal();
    dlg.querySelector('[value=cancel]').focus();
  });
}

/**
 * Panel lateral (drawer) para formularios.
 * Devuelve { el, body, close, setBusy }. onClose se llama al cerrar.
 */
export function openDrawer({ title, html = '', wide = false, onClose } = {}) {
  const dlg = document.createElement('dialog');
  dlg.className = `drawer${wide ? ' drawer--wide' : ''}`;
  dlg.innerHTML = `
    <div class="drawer__head">
      <h2>${esc(title)}</h2>
      <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button>
    </div>
    <div class="drawer__body">${html}</div>`;
  document.body.append(dlg);
  const close = () => dlg.close();
  dlg.querySelector('[data-close]').addEventListener('click', close);
  dlg.addEventListener('close', () => {
    onClose?.();
    dlg.remove();
  });
  // Cerrar al hacer clic en el fondo
  dlg.addEventListener('mousedown', (e) => {
    if (e.target === dlg) close();
  });
  dlg.showModal();
  return { el: dlg, body: dlg.querySelector('.drawer__body'), close };
}

/** Marca un botón como "cargando" mientras se ejecuta fn. */
export async function withBusy(btn, fn) {
  if (!btn) return fn();
  const prev = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('is-busy');
  btn.innerHTML = `<span class="spinner"></span>${esc(btn.dataset.busy || 'Guardando…')}`;
  try {
    return await fn();
  } finally {
    btn.disabled = false;
    btn.classList.remove('is-busy');
    btn.innerHTML = prev;
  }
}

export const loadingHtml = (text = 'Cargando…') =>
  `<div class="state state--loading"><span class="spinner spinner--lg"></span><p>${esc(text)}</p></div>`;

export const emptyHtml = (title, text = '', action = '') =>
  `<div class="state state--empty">
     <img src="/brand/logo-isa.svg" alt="" aria-hidden="true" />
     <h3>${esc(title)}</h3>
     ${text ? `<p>${esc(text)}</p>` : ''}
     ${action}
   </div>`;

// ───────── Iconos (trazo fino) ─────────
const ICONS = {
  collections: '<path d="M4 7h16M4 12h16M4 17h10"/><circle cx="18.5" cy="17" r="1.5"/>',
  categories: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  products: '<path d="M3 17c3 0 5-1 7-3l3-4c1-1.3 2.5-1.5 3.5-.5L21 14v3H3z"/><path d="M17 17v3"/>',
  orders: '<path d="M6 3h12l1 18H5z"/><path d="M9 7a3 3 0 0 0 6 0"/>',
  settings: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="1.6"/><path d="m3 17 5-4 4 3 3-2 6 4"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};
export const icon = (name) =>
  `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
