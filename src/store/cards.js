// Tarjeta de producto (inicio y relacionados) con selector rápido de talla
import { $$, esc, money, waLink, waIcon, productUrl, sizesLabel } from './util.js';
import { cart, openCart } from './cart.js';

export function productCard(p, prefix = 'qs') {
  const url = productUrl(p);
  const qid = `${prefix}-${p.id}`;
  const needsOptions = p.colors.length > 1 || !p.sizes.length;
  const meta = [p.material, p.sizes.length ? `Tallas ${sizesLabel(p.sizes)}` : ''].filter(Boolean).join(' · ');
  return `<article class="product">
    <div class="product__media">
      <a class="product__img" href="${esc(url)}" tabindex="-1" aria-hidden="true">
        ${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" />` : ''}
      </a>
      ${p.tag ? `<span class="product__tag">${esc(p.tag)}</span>` : ''}
      <div class="product__actions">
        ${needsOptions
          ? `<a class="btn btn--primary product__add" href="${esc(url)}">Ver opciones</a>`
          : `<button type="button" class="btn btn--primary product__add" data-quick="${esc(qid)}" aria-expanded="false" aria-controls="${esc(qid)}">Elegir talla</button>`}
        <a class="product__wa" target="_blank" rel="noopener" aria-label="Preguntar por ${esc(p.name)} en WhatsApp"
          href="${esc(waLink(`Hola isa, me interesa el modelo ${p.name}. ¿Me ayudan con la talla?`))}">${waIcon}</a>
      </div>
      ${needsOptions ? '' : `<div class="quick-size" id="${esc(qid)}" role="group" aria-label="Elige tu talla de ${esc(p.name)}" hidden>
        <div class="quick-size__head"><span>Elige tu talla</span>
          <button type="button" class="quick-size__close" data-quick-close aria-label="Cerrar selector de talla">×</button></div>
        <div class="quick-size__grid">
          ${p.sizes.map((s) => `<button type="button" data-quick-add="${esc(p.id)}" data-size="${esc(s)}" aria-label="Talla ${esc(s)}: agregar ${esc(p.name)} al carrito">${esc(s)}</button>`).join('')}
        </div>
        <a class="quick-size__more" href="${esc(url)}">Ver detalles del producto</a>
      </div>`}
    </div>
    <h3><a href="${esc(url)}">${esc(p.name)}</a></h3>
    <div class="product__meta"><span>${esc(meta)}</span><span class="product__price">${p.compareAt > p.price ? `<s>${money(p.compareAt)}</s> ` : ''}${money(p.price)}</span></div>
  </article>`;
}

const closeAll = (except) =>
  $$('.quick-size:not([hidden])').forEach((qs) => {
    if (qs === except) return;
    qs.hidden = true;
    qs.closest('.product')?.classList.remove('is-picking');
    document.querySelector(`[data-quick="${qs.id}"]`)?.setAttribute('aria-expanded', 'false');
  });

let bound = false;
export function bindQuickSize() {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    const t = e.target;
    const btn = t.closest('[data-quick]');
    if (btn) {
      const qs = document.getElementById(btn.dataset.quick);
      const open = qs.hidden;
      closeAll(qs);
      qs.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      qs.closest('.product').classList.toggle('is-picking', open);
      if (open) qs.querySelector('[data-quick-add]')?.focus({ preventScroll: true });
      return;
    }
    const add = t.closest('[data-quick-add]');
    if (add) {
      cart.add(add.dataset.quickAdd, add.dataset.size, 1);
      closeAll();
      openCart();
      return;
    }
    if (t.closest('[data-quick-close]')) {
      const qs = t.closest('.quick-size');
      closeAll();
      document.querySelector(`[data-quick="${qs.id}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (!t.closest('.quick-size')) closeAll();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const qs = document.activeElement?.closest?.('.quick-size');
    if (qs) { closeAll(); document.querySelector(`[data-quick="${qs.id}"]`)?.focus(); }
    else closeAll();
  });
}
