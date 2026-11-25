// Elementos comunes a todas las páginas de la tienda: encabezado, menú, WhatsApp, footer,
// newsletter, carrito y checkout.
import { $, $$, waLink, waIcon, setWhatsapp } from './util.js';
import { loadCatalog } from './catalog.js';
import { cart, mountCartDrawer, closeCart } from './cart.js';
import { mountCheckout } from './checkout.js';

const DEFAULT_WA_TEXT = 'Hola isa, quiero más información sobre su calzado.';

export function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  const btn = $('[data-menu-toggle]');
  if (!btn) return;
  btn.setAttribute('aria-expanded', open);
  btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
}

export const refreshWaLinks = () =>
  $$('[data-wa]').forEach((a) => (a.href = waLink(a.dataset.wa || DEFAULT_WA_TEXT)));

function initChrome() {
  refreshWaLinks();
  $$('[data-wa-icon]').forEach((el) => (el.innerHTML = waIcon));

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-menu-toggle]')) setMenu(!document.body.classList.contains('menu-open'));
    if (e.target.closest('[data-nav] a')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { closeCart(); setMenu(false); }
  });
  window.matchMedia('(min-width: 1081px)').addEventListener('change', (e) => e.matches && setMenu(false));

  const newsletter = $('[data-newsletter]');
  newsletter?.addEventListener('submit', (e) => {
    e.preventDefault();
    newsletter.innerHTML = '<p role="status">¡Gracias por suscribirte! ✨</p>';
  });
  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  // Encabezado: transparente sobre el video del inicio, sólido al hacer scroll (y siempre sólido sin hero)
  const header = $('[data-header]');
  const hero = $('.hero');
  const updateHeader = () => {
    const limit = hero ? hero.offsetHeight - header.offsetHeight - 20 : 0;
    header.classList.toggle('is-over', window.scrollY < limit);
  };
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', updateHeader);
  updateHeader();

  // Oculta el botón flotante de WhatsApp cuando el footer (que ya tiene uno) está visible
  const footer = $('.footer');
  if (footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => document.body.classList.toggle('footer-visible', en.isIntersecting), { threshold: 0.15 }).observe(footer);
  }
}

// Inicializa la página y devuelve el catálogo normalizado
export async function initShell() {
  initChrome();
  const catalog = await loadCatalog();
  setWhatsapp(catalog.settings.whatsapp);
  refreshWaLinks();
  cart.load(catalog);
  mountCartDrawer(catalog.settings);
  mountCheckout(catalog);
  return catalog;
}
