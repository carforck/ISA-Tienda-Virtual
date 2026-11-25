// Carrito compartido (inicio y página de producto). Líneas por producto + talla (+ color), guardado en localStorage.
import { $, esc, money, storage } from './util.js';
import { findProduct } from './catalog.js';

const KEY = 'isa-cart-v1';
const MAX_QTY = 10;
let catalog = null;
let lines = []; // [{ id, size, color, qty }]
const listeners = new Set();

const keyOf = (l) => `${l.id}|${l.size}|${l.color || ''}`;
const save = () => storage.set(KEY, lines);

function sanitize(raw) {
  if (!Array.isArray(raw)) return [];
  const out = new Map();
  for (const l of raw) {
    const p = l && findProduct(catalog, l.id);
    const size = String(l?.size ?? '');
    if (!p || !p.sizes.includes(size)) continue; // el producto o la talla ya no existen
    const color = l.color && p.colors.includes(l.color) ? l.color : '';
    const line = { id: p.id, size, color, qty: Math.min(MAX_QTY, Math.max(1, parseInt(l.qty, 10) || 1)) };
    out.set(keyOf(line), line);
  }
  return [...out.values()];
}

const emit = () => listeners.forEach((fn) => fn());

export const cart = {
  load(cat) {
    catalog = cat;
    lines = sanitize(storage.get(KEY, []));
    save();
    // mantiene el carrito sincronizado entre pestañas
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) { lines = sanitize(storage.get(KEY, [])); emit(); }
    });
  },
  onChange(fn) { listeners.add(fn); },
  add(id, size, qty = 1, color = '') {
    const line = { id, size: String(size), color: color || '', qty };
    const found = lines.find((l) => keyOf(l) === keyOf(line));
    if (found) found.qty = Math.min(MAX_QTY, found.qty + qty);
    else lines.push({ ...line, qty: Math.min(MAX_QTY, qty) });
    save(); emit();
  },
  setQty(key, qty) {
    const l = lines.find((x) => keyOf(x) === key);
    if (!l) return;
    if (qty <= 0) lines = lines.filter((x) => x !== l);
    else l.qty = Math.min(MAX_QTY, qty);
    save(); emit();
  },
  clear() { lines = []; save(); emit(); },
  items() {
    return lines.map((l) => {
      const product = findProduct(catalog, l.id);
      return { key: keyOf(l), ...l, product, total: product.price * l.qty };
    });
  },
  count() { return lines.reduce((n, l) => n + l.qty, 0); },
  subtotal() { return this.items().reduce((n, l) => n + l.total, 0); },
};

// Envío: solo se muestra un valor si la tienda lo definió en store_settings; si no, se cotiza
export function shippingInfo(settings, subtotal) {
  if (settings.freeShippingFrom != null && subtotal >= settings.freeShippingFrom) return { label: 'Gratis', cost: 0 };
  if (settings.shippingCost != null) return { label: money(settings.shippingCost), cost: settings.shippingCost };
  return { label: 'Se cotiza según tu ciudad', cost: null };
}

// ───────── Panel lateral del carrito ─────────
const DRAWER_HTML = `
  <div class="drawer-backdrop" data-cart-close></div>
  <aside class="drawer" aria-label="Carrito" data-drawer>
    <div class="drawer__head">
      <h3>Tu carrito</h3>
      <button class="icon-btn" aria-label="Cerrar carrito" data-cart-close>
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </div>
    <div class="drawer__body" data-cart-items></div>
    <div class="drawer__foot">
      <div class="drawer__total"><span>Subtotal</span><strong data-cart-total>$0</strong></div>
      <div class="drawer__ship"><span>Envío</span><span data-cart-ship>Se cotiza según tu ciudad</span></div>
      <button type="button" class="btn btn--primary btn--block" data-checkout-open>Continuar con el pedido</button>
      <p class="drawer__note" data-cart-note></p>
    </div>
  </aside>`;

let lastFocus = null;
export const openCart = () => {
  const d = $('[data-drawer]');
  if (!d || document.body.classList.contains('cart-open')) return;
  lastFocus = document.activeElement;
  document.body.classList.add('cart-open');
  d.inert = false;
  setTimeout(() => d.querySelector('[data-cart-close]')?.focus({ preventScroll: true }), 50);
};
export const closeCart = ({ restoreFocus = true } = {}) => {
  const d = $('[data-drawer]');
  if (!d || !document.body.classList.contains('cart-open')) return;
  document.body.classList.remove('cart-open');
  d.inert = true;
  if (restoreFocus && lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
};

export function mountCartDrawer(settings) {
  document.body.insertAdjacentHTML('beforeend', DRAWER_HTML);
  $('[data-drawer]').inert = true;
  $('[data-cart-note]').textContent = settings.orderNote;

  const render = () => {
    const items = cart.items();
    $('[data-cart-items]').innerHTML = items.length
      ? items.map((l) => `<div class="cart-item">
          <img class="cart-item__thumb" src="${esc(l.product.img)}" alt="" />
          <div>
            <h4>${esc(l.product.name)}</h4>
            <small>Talla ${esc(l.size)}${l.color ? ` · ${esc(l.color)}` : ''} · ${money(l.product.price)}</small>
            <div class="qty">
              <button type="button" data-cart-dec="${esc(l.key)}" aria-label="Quitar uno de ${esc(l.product.name)} talla ${esc(l.size)}">−</button>
              <span aria-label="Cantidad">${l.qty}</span>
              <button type="button" data-cart-inc="${esc(l.key)}" aria-label="Agregar uno de ${esc(l.product.name)} talla ${esc(l.size)}" ${l.qty >= MAX_QTY ? 'disabled' : ''}>+</button>
            </div>
          </div>
          <strong>${money(l.total)}</strong>
        </div>`).join('')
      : '<p class="drawer__empty">Tu carrito está vacío.</p>';
    const count = cart.count();
    const subtotal = cart.subtotal();
    document.querySelectorAll('[data-cart-count]').forEach((el) => (el.textContent = count));
    $('[data-cart-total]').textContent = money(subtotal);
    $('[data-cart-ship]').textContent = shippingInfo(settings, subtotal).label;
    $('[data-checkout-open]').disabled = count === 0;
  };
  cart.onChange(render);
  render();

  document.addEventListener('click', (e) => {
    const t = e.target;
    const inc = t.closest('[data-cart-inc]');
    if (inc) { const l = cart.items().find((x) => x.key === inc.dataset.cartInc); l && cart.setQty(l.key, l.qty + 1); }
    const dec = t.closest('[data-cart-dec]');
    if (dec) { const l = cart.items().find((x) => x.key === dec.dataset.cartDec); l && cart.setQty(l.key, l.qty - 1); }
    if (t.closest('[data-cart-open]')) openCart();
    if (t.closest('[data-cart-close]')) closeCart();
  });
}
