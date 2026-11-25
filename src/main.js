import { categories, products, WHATSAPP } from './data.js';

const $ = (s, el = document) => el.querySelector(s);
const money = (n) => '$' + n.toLocaleString('es-CO');
const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
export const waIcon = `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3Zm0 23.4c-2.1 0-4.1-.6-5.8-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9C5.1 10 10 5.2 16 5.2S26.9 10 26.9 15.8 22 26.4 16 26.4Zm6-7.9c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z"/></svg>`;

// WhatsApp: todos los enlaces con data-wa usan el número de la tienda
document.querySelectorAll('[data-wa]').forEach((a) => {
  a.href = waLink(a.dataset.wa || 'Hola isa, quiero más información sobre su calzado.');
});

// Categorías
const countBy = (id) => products.filter((p) => p.cat === id).length;
$('[data-categories]').innerHTML = categories
  .map(
    (c) => `<a href="#novedades" class="category" data-cat="${c.id}">
      <img class="category__bg" src="${c.img}" alt="" loading="lazy" />
      <span><small>${countBy(c.id)} modelos</small>${c.name}</span>
    </a>`
  )
  .join('');

// Filtros + productos
let active = 'todos';
const filterList = [{ id: 'todos', name: 'Todos' }, ...categories];
const renderFilters = () => {
  $('[data-filters]').innerHTML = filterList
    .map((f) => `<button class="chip ${f.id === active ? 'is-active' : ''}" data-filter="${f.id}">${f.name}</button>`)
    .join('');
};
const renderProducts = () => {
  const list = active === 'todos' ? products : products.filter((p) => p.cat === active);
  $('[data-products]').innerHTML = list
    .map(
      (p) => `<article class="product">
        <div class="product__media">
          <img src="${p.img}" alt="${p.name}" loading="lazy" />
          ${p.tag ? `<span class="product__tag">${p.tag}</span>` : ''}
          <div class="product__actions">
            <button class="btn btn--primary product__add" data-add="${p.id}">Agregar</button>
            <a class="product__wa" target="_blank" rel="noopener" aria-label="Preguntar por WhatsApp"
              href="${waLink(`Hola isa, me interesa el modelo ${p.name}. ¿Qué tallas tienen disponibles?`)}">${waIcon}</a>
          </div>
        </div>
        <h3>${p.name}</h3>
        <div class="product__meta"><span>${p.material} · Tallas ${p.sizes}</span><span class="product__price">${money(p.price)}</span></div>
      </article>`
    )
    .join('');
};
document.addEventListener('click', (e) => {
  const f = e.target.closest('[data-filter]');
  if (f) { active = f.dataset.filter; renderFilters(); renderProducts(); }
  const c = e.target.closest('[data-cat], [data-cat-link]');
  if (c) { active = c.dataset.cat || c.dataset.catLink; renderFilters(); renderProducts(); }
});

// Carrito
const cart = new Map();
const renderCart = () => {
  let count = 0, total = 0;
  const items = [...cart.entries()].map(([id, qty]) => {
    const p = products.find((x) => x.id === id);
    count += qty; total += p.price * qty;
    return `<div class="cart-item">
      <img class="cart-item__thumb" src="${p.img}" alt="" />
      <div><h4>${p.name}</h4><small>${money(p.price)}</small>
        <div class="qty"><button data-dec="${id}" aria-label="Quitar uno">−</button>${qty}<button data-inc="${id}" aria-label="Agregar uno">+</button></div>
      </div>
      <strong>${money(p.price * qty)}</strong>
    </div>`;
  });
  $('[data-cart-items]').innerHTML = items.join('') || '<p class="drawer__empty">Tu carrito está vacío.</p>';
  $('[data-cart-count]').textContent = count;
  $('[data-cart-total]').textContent = money(total);
  const checkout = $('[data-checkout]');
  checkout.classList.toggle('is-disabled', count === 0);
  const lines = [...cart.entries()].map(([id, q]) => {
    const p = products.find((x) => x.id === id);
    return `• ${q} x ${p.name} — ${money(p.price * q)}`;
  });
  checkout.href = waLink(`Hola isa, quiero hacer este pedido:\n${lines.join('\n')}\nSubtotal: ${money(total)}\n\nMi talla es: `);
};
function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  const btn = $('[data-menu-toggle]');
  btn.setAttribute('aria-expanded', open);
  btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
}
const openCart = () => document.body.classList.add('cart-open');
const closeCart = () => document.body.classList.remove('cart-open');

document.addEventListener('click', (e) => {
  const t = e.target;
  const add = t.closest('[data-add]');
  if (add) { const id = add.dataset.add; cart.set(id, (cart.get(id) || 0) + 1); renderCart(); openCart(); }
  const inc = t.closest('[data-inc]');
  if (inc) { cart.set(inc.dataset.inc, cart.get(inc.dataset.inc) + 1); renderCart(); }
  const dec = t.closest('[data-dec]');
  if (dec) { const id = dec.dataset.dec; const q = cart.get(id) - 1; q > 0 ? cart.set(id, q) : cart.delete(id); renderCart(); }
  if (t.closest('[data-cart-open]')) openCart();
  if (t.closest('[data-cart-close]')) closeCart();
  if (t.closest('[data-menu-toggle]')) setMenu(!document.body.classList.contains('menu-open'));
  if (t.closest('[data-nav] a')) setMenu(false);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCart(); setMenu(false); } });
renderFilters();
renderProducts();
renderCart();
document.querySelectorAll('[data-wa-icon]').forEach((el) => (el.innerHTML = waIcon));

// Newsletter
$('[data-newsletter]').addEventListener('submit', (e) => {
  e.preventDefault();
  e.target.innerHTML = '<p>¡Gracias por suscribirte! ✨</p>';
});
$('[data-year]').textContent = new Date().getFullYear();

// Hero: varios videos en rotación con fundido; móvil usa versiones verticales
const PLAYLIST = {
  desktop: [
    { src: '/media/hero-tacon-negro.mp4', pos: 'center 70%' },
    { src: '/media/hero-tacon-coral.mp4', pos: 'center 80%' },
  ],
  mobile: [
    { src: '/media/m-hero-tenis.mp4', pos: 'center 60%' },
    { src: '/media/m-hero-botas.mp4', pos: 'center 70%' },
    { src: '/media/m-hero-tacon-negro.mp4', pos: 'center' },
  ],
};
const heroVideos = [...document.querySelectorAll('[data-hero-video]')];
const heroToggle = $('[data-hero-toggle]');
if (heroVideos.length) {
  const list = window.matchMedia('(max-width: 760px)').matches ? PLAYLIST.mobile : PLAYLIST.desktop;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let idx = 0, cur = 0, paused = reduced;

  const load = (v, item) => { v.src = item.src; v.style.objectPosition = item.pos; };
  const setIcon = () => {
    heroToggle.setAttribute('aria-label', paused ? 'Reproducir video' : 'Pausar video');
    heroToggle.innerHTML = paused
      ? '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7V5Z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>';
  };
  const next = () => {
    if (list.length < 2) { heroVideos[cur].currentTime = 0; heroVideos[cur].play(); return; }
    idx = (idx + 1) % list.length;
    const incoming = heroVideos[1 - cur];
    incoming.play().catch(() => {});
    incoming.classList.add('is-active');
    heroVideos[cur].classList.remove('is-active');
    cur = 1 - cur;
    // precarga el siguiente en el video que quedó oculto
    setTimeout(() => load(heroVideos[1 - cur], list[(idx + 1) % list.length]), 1200);
  };

  load(heroVideos[0], list[0]);
  if (list[1]) load(heroVideos[1], list[1]);
  heroVideos[0].classList.add('is-active');
  heroVideos.forEach((v) => v.addEventListener('ended', () => v === heroVideos[cur] && next()));
  if (!reduced) heroVideos[0].play().catch(() => { paused = true; setIcon(); });
  setIcon();

  heroToggle.addEventListener('click', () => {
    paused = !paused;
    paused ? heroVideos[cur].pause() : heroVideos[cur].play();
    setIcon();
  });
}

// Encabezado: transparente sobre el video, sólido al hacer scroll
const header = $('[data-header]');
const hero = $('.hero');
const updateHeader = () => {
  const limit = hero ? hero.offsetHeight - header.offsetHeight - 20 : 0;
  header.classList.toggle('is-over', window.scrollY < limit);
};
window.addEventListener('scroll', updateHeader, { passive: true });
window.addEventListener('resize', updateHeader);
window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => e.matches && setMenu(false));
updateHeader();

// Oculta el botón flotante de WhatsApp cuando el footer (que ya tiene uno) está visible
const footer = $('.footer');
if (footer && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => document.body.classList.toggle('footer-visible', e.isIntersecting), { threshold: 0.15 }).observe(footer);
}
