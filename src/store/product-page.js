// Página de producto: /producto.html?p=<slug>
import { $, $$, esc, money, waLink, waIcon, sizesLabel, productUrl } from './util.js';
import { initShell } from './shell.js';
import { cart, openCart } from './cart.js';
import { productCard, bindQuickSize } from './cards.js';

bindQuickSize();
const catalog = await initShell();
const slug = new URLSearchParams(location.search).get('p') || '';
const product = catalog.products.find((p) => p.slug === slug) || catalog.products.find((p) => p.id === slug);
const body = $('[data-pdp-body]');
body.removeAttribute('aria-busy');

const setMeta = (attr, key, content) => {
  let m = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.appendChild(m); }
  m.setAttribute('content', content);
};

if (!product) renderNotFound();
else renderProduct(product);

function renderNotFound() {
  document.title = 'Producto no encontrado · isa';
  setMeta('name', 'robots', 'noindex');
  $('[data-breadcrumb]').innerHTML = '<a href="/">Inicio</a><span aria-current="page">Producto no encontrado</span>';
  body.innerHTML = `<div class="pdp-empty">
    <p class="eyebrow">Ups</p>
    <h1>Producto no encontrado</h1>
    <p>Es posible que este modelo ya no esté disponible o que el enlace esté incompleto.</p>
    <div class="pdp-empty__cta">
      <a class="btn btn--primary" href="/#novedades">Ver todos los modelos</a>
      <a class="btn btn--ghost" target="_blank" rel="noopener" href="${esc(waLink('Hola isa, estoy buscando un modelo y no lo encontré en la tienda.'))}">Preguntar por WhatsApp</a>
    </div>
  </div>`;
}

function renderProduct(p) {
  const category = catalog.categories.find((c) => c.id === p.category);
  const collection = catalog.collections.find((c) => c.id === p.collection);
  const images = p.images.length ? p.images : [{ url: '', alt: p.name }];
  const multi = images.length > 1;

  // SEO / compartir
  const desc = p.description || `${p.name}${p.material ? ` en ${p.material.toLowerCase()}` : ''}. Calzado femenino isa, bajo pedido con envío a toda Colombia.`;
  document.title = `${p.name} · isa`;
  setMeta('name', 'description', desc.slice(0, 160));
  setMeta('property', 'og:title', `${p.name} · isa`);
  setMeta('property', 'og:description', desc.slice(0, 200));
  if (p.img) setMeta('property', 'og:image', new URL(p.img, location.origin).href);
  setMeta('property', 'og:url', new URL(productUrl(p), location.origin).href);

  $('[data-breadcrumb]').innerHTML = `<a href="/">Inicio</a>
    ${category ? `<a href="/?cat=${encodeURIComponent(category.id)}#novedades">${esc(category.name)}</a>` : ''}
    <span aria-current="page">${esc(p.name)}</span>`;

  // Especificaciones: filas derivadas siempre + las que defina la tienda (products.specs)
  const specs = [
    category && { label: 'Categoría', value: category.name },
    collection && { label: 'Colección', value: collection.season ? `${collection.name} · ${collection.season}` : collection.name },
    p.material && { label: 'Material', value: p.material },
    p.sizes.length && { label: 'Tallas disponibles', value: p.sizes.join(' · ') },
    p.colors.length && { label: p.colors.length > 1 ? 'Colores' : 'Color', value: p.colors.join(' · ') },
    ...p.specs,
  ].filter(Boolean);

  const colorField = p.colors.length > 1
    ? `<fieldset class="opt" aria-describedby="pdp-color-err">
        <legend class="opt__legend"><span>Color: <strong data-color-label>Elige uno</strong></span></legend>
        <div class="opt__list">
          ${p.colors.map((c) => `<label class="opt__chip"><input type="radio" name="color" value="${esc(c)}" /><span>${esc(c)}</span></label>`).join('')}
        </div>
        <p class="field__error" id="pdp-color-err" aria-live="polite"></p>
      </fieldset>`
    : '';

  body.innerHTML = `
  <div class="pdp">
    <div class="pdp__gallery">
      <div class="gallery ${multi ? 'has-many' : ''}" data-gallery>
        <div class="gallery__track" data-gallery-track ${multi ? 'tabindex="0" role="region" aria-label="Fotos del producto, desliza para ver más"' : ''}>
          ${images.map((im, i) => `<figure class="gallery__slide" data-zoom>
            ${im.url ? `<img src="${esc(im.url)}" alt="${esc(im.alt || p.name)}${multi ? ` (foto ${i + 1} de ${images.length})` : ''}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} />` : ''}
          </figure>`).join('')}
        </div>
        ${p.tag ? `<span class="product__tag">${esc(p.tag)}</span>` : ''}
        ${multi ? `
          <button type="button" class="gallery__nav gallery__nav--prev" data-gallery-prev aria-label="Foto anterior"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
          <button type="button" class="gallery__nav gallery__nav--next" data-gallery-next aria-label="Foto siguiente"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
          <span class="gallery__count" data-gallery-count aria-hidden="true">1 / ${images.length}</span>` : ''}
      </div>
      ${multi ? `<div class="gallery__thumbs">
        ${images.map((im, i) => `<button type="button" class="gallery__thumb" data-gallery-go="${i}" aria-label="Ver foto ${i + 1}" ${i === 0 ? 'aria-current="true"' : ''}><img src="${esc(im.url)}" alt="" loading="lazy" /></button>`).join('')}
      </div>` : ''}
    </div>

    <div class="pdp__info">
      <div class="pdp__badges">
        ${collection ? `<a class="badge badge--gold" href="/?col=${encodeURIComponent(collection.id)}#novedades">${esc(collection.name)}${collection.season ? ` · ${esc(collection.season)}` : ''}</a>` : ''}
        ${category ? `<span class="badge">${esc(category.name)}</span>` : ''}
      </div>
      <h1 class="pdp__title">${esc(p.name)}</h1>
      <p class="pdp__price">
        ${p.compareAt > p.price ? `<s aria-label="Precio anterior">${money(p.compareAt)}</s>` : ''}
        <span>${money(p.price)}</span>
      </p>
      ${p.material ? `<p class="pdp__material">${esc(p.material)}${p.sizes.length ? ` · Tallas ${esc(sizesLabel(p.sizes))}` : ''}</p>` : ''}

      <form class="pdp__form" data-pdp-form novalidate>
        ${colorField}
        <fieldset class="opt" aria-describedby="pdp-size-err">
          <legend class="opt__legend">
            <span>Talla: <strong data-size-label>Elige tu talla</strong></span>
            <a class="opt__guide" target="_blank" rel="noopener" href="${esc(waLink(`Hola isa, ¿me ayudan con la guía de tallas del modelo ${p.name}?`))}">Guía de tallas</a>
          </legend>
          <div class="opt__list opt__list--sizes">
            ${p.sizes.map((s) => `<label class="opt__chip opt__chip--size"><input type="radio" name="size" value="${esc(s)}" /><span>${esc(s)}</span></label>`).join('')}
          </div>
          <p class="field__error" id="pdp-size-err" aria-live="polite"></p>
        </fieldset>

        <div class="pdp__buy">
          <div class="stepper" role="group" aria-label="Cantidad">
            <button type="button" data-qty-dec aria-label="Disminuir cantidad">−</button>
            <input type="number" name="qty" value="1" min="1" max="10" inputmode="numeric" aria-label="Cantidad" data-qty />
            <button type="button" data-qty-inc aria-label="Aumentar cantidad">+</button>
          </div>
          <button type="submit" class="btn btn--primary pdp__add">Agregar al carrito</button>
        </div>
        <a class="btn btn--wa btn--block pdp__ask" data-pdp-ask target="_blank" rel="noopener"><span class="btn__icon">${waIcon}</span>Preguntar por WhatsApp</a>
        <p class="pdp__status" role="status" data-pdp-status></p>
      </form>

      <div class="pdp__note">
        <strong>Producto bajo pedido</strong>
        <p>${esc(catalog.settings.orderNote)}</p>
        ${p.leadTimeDays ? `<p>Tiempo de preparación aproximado: <strong>${p.leadTimeDays} ${p.leadTimeDays === 1 ? 'día' : 'días'}</strong>.</p>` : ''}
        <p>Envío nacional con transportadora; el costo se cotiza según tu ciudad.</p>
      </div>
    </div>
  </div>

  <div class="pdp__details">
    ${p.description ? `<section class="pdp__desc" aria-labelledby="pdp-desc-title">
      <h2 id="pdp-desc-title">Descripción</h2>
      ${p.description.split(/\n{2,}/).map((para) => `<p>${esc(para).replace(/\n/g, '<br />')}</p>`).join('')}
    </section>` : ''}
    <section class="pdp__specs" aria-labelledby="pdp-specs-title">
      <h2 id="pdp-specs-title">Especificaciones técnicas</h2>
      <table class="specs">
        <tbody>
          ${specs.map((s) => `<tr><th scope="row">${esc(s.label)}</th><td>${esc(s.value)}</td></tr>`).join('')}
        </tbody>
      </table>
    </section>
  </div>`;

  initGallery(images.length);
  initBuyForm(p);
  renderRelated(p);
}

function initGallery(count) {
  const track = $('[data-gallery-track]');
  if (!track) return;
  // Zoom al pasar el mouse (solo escritorio con puntero fino)
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('[data-zoom]').forEach((fig) => {
      fig.classList.add('is-zoomable');
      fig.addEventListener('mousemove', (e) => {
        const r = fig.getBoundingClientRect();
        const img = fig.querySelector('img');
        if (img) img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
      });
    });
  }
  if (count < 2) return;
  const current = () => Math.round(track.scrollLeft / track.clientWidth);
  const go = (i) => track.scrollTo({ left: ((i + count) % count) * track.clientWidth, behavior: 'smooth' });
  const sync = () => {
    const i = current();
    $('[data-gallery-count]').textContent = `${i + 1} / ${count}`;
    $$('[data-gallery-go]').forEach((b, j) => (j === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
  };
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  $('[data-gallery-prev]').addEventListener('click', () => go(current() - 1));
  $('[data-gallery-next]').addEventListener('click', () => go(current() + 1));
  $$('[data-gallery-go]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.galleryGo))));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current() - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
  });
}

function initBuyForm(p) {
  const form = $('[data-pdp-form]');
  const qtyInput = $('[data-qty]', form);
  const ask = $('[data-pdp-ask]', form);
  const status = $('[data-pdp-status]', form);
  const sizeErr = $('#pdp-size-err');
  const colorErr = $('#pdp-color-err');
  const singleColor = p.colors.length === 1 ? p.colors[0] : '';

  const chosen = () => ({
    size: form.querySelector('input[name="size"]:checked')?.value || '',
    color: singleColor || form.querySelector('input[name="color"]:checked')?.value || '',
  });
  const qty = () => Math.min(10, Math.max(1, parseInt(qtyInput.value, 10) || 1));

  const updateAsk = () => {
    const { size, color } = chosen();
    const extra = [size && `talla ${size}`, color && `color ${color}`].filter(Boolean).join(', ');
    ask.href = waLink(`Hola isa, me interesa el modelo ${p.name}${extra ? ` (${extra})` : ''}. ¿Me pueden ayudar?\n${location.origin}${productUrl(p)}`);
  };
  updateAsk();

  form.addEventListener('change', (e) => {
    if (e.target.name === 'size') {
      $('[data-size-label]').textContent = e.target.value;
      sizeErr.textContent = '';
      form.querySelector('.opt[aria-describedby="pdp-size-err"]').classList.remove('is-invalid');
    }
    if (e.target.name === 'color') {
      $('[data-color-label]').textContent = e.target.value;
      if (colorErr) colorErr.textContent = '';
    }
    if (e.target === qtyInput) qtyInput.value = qty();
    updateAsk();
  });
  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-qty-dec]')) qtyInput.value = Math.max(1, qty() - 1);
    if (e.target.closest('[data-qty-inc]')) qtyInput.value = Math.min(10, qty() + 1);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { size, color } = chosen();
    status.textContent = '';
    if (p.colors.length > 1 && !color) {
      colorErr.textContent = 'Elige un color para continuar.';
      form.querySelector('input[name="color"]').focus();
      return;
    }
    if (!size) {
      sizeErr.textContent = 'Elige tu talla para continuar.';
      form.querySelector('.opt[aria-describedby="pdp-size-err"]').classList.add('is-invalid');
      form.querySelector('input[name="size"]')?.focus();
      return;
    }
    cart.add(p.id, size, qty(), color);
    status.textContent = `Agregaste ${qty()} × ${p.name} (talla ${size}) al carrito.`;
    openCart();
  });
}

function renderRelated(p) {
  const others = catalog.products.filter((x) => x.id !== p.id);
  const sameCat = others.filter((x) => x.category && x.category === p.category);
  const sameCol = others.filter((x) => x.collection && x.collection === p.collection && !sameCat.includes(x));
  const list = [...sameCat, ...sameCol, ...others.filter((x) => !sameCat.includes(x) && !sameCol.includes(x))].slice(0, 4);
  if (!list.length) return;
  $('[data-related-list]').innerHTML = list.map((x) => productCard(x, 'rel')).join('');
  $('[data-related]').hidden = false;
}
