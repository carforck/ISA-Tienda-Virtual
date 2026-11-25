// Productos: listado con filtros, formulario, imágenes, especificaciones y duplicado.
import {
  esc, icon, cop, parseMoney, slugify, intOrNull, toast, toastError, confirmDialog, openDrawer,
  withBusy, loadingHtml, emptyHtml,
} from './ui.js';
import { toggleHtml, fieldHtml, moneyInput, bindMoney, bindSlug } from './forms.js';
import { resizeImage, fileName } from './images.js';
import { isStoragePath } from './api.js';

const SIZES = ['34', '35', '36', '37', '38', '39', '40', '41', '42'];
const SPEC_SUGGESTIONS = ['Material exterior', 'Forro', 'Plantilla', 'Suela', 'Tipo de tacón', 'Altura del tacón', 'Horma', 'Punta', 'Cierre', 'Hecho en', 'Cuidados'];
const TAG_SUGGESTIONS = ['Nuevo', 'Top', 'Últimos', 'Oferta'];

// Filtros recordados mientras la pestaña esté abierta
const filters = { q: '', collection: '', category: '', active: '' };

export const productUrl = (slug) => `producto.html?p=${encodeURIComponent(slug)}`;

export async function renderProducts(ctx) {
  const { api, root, isCurrent } = ctx;
  const hashParams = new URLSearchParams(location.hash.split('?')[1] || '');
  if (hashParams.has('coleccion')) {
    filters.collection = hashParams.get('coleccion');
    history.replaceState(null, '', '#/productos');
  }

  root.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Catálogo</p>
        <h1>Productos</h1>
        <p class="muted">Todos se venden bajo pedido. Usa <strong>Duplicar</strong> para crear rápido la versión de una nueva temporada.</p>
      </div>
      <button class="btn btn--primary" data-new>${icon('plus')}Nuevo producto</button>
    </header>
    <div class="filters" data-filters></div>
    <div data-list>${loadingHtml('Cargando productos…')}</div>`;

  const [products, images, collections, categories] = await Promise.all([
    api.list('products', { order: [['sort_order', true], ['created_at', false]] }),
    api.list('product_images', { select: 'id,product_id,path,sort_order', order: [['sort_order', true]] }),
    api.list('collections', { select: 'id,name,is_active', order: [['sort_order', true], ['created_at', false]] }),
    api.list('categories', { select: 'id,name', order: [['sort_order', true]] }),
  ]);
  if (!isCurrent()) return;

  const lookups = { collections, categories };
  const thumbs = {};
  for (const img of images) if (!thumbs[img.product_id]) thumbs[img.product_id] = img.path;
  const colName = Object.fromEntries(collections.map((c) => [c.id, c.name]));
  const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  root.querySelector('[data-new]').addEventListener('click', () => openForm(ctx, null, lookups));

  const opt = (v, label, sel) => `<option value="${esc(v)}" ${sel === v ? 'selected' : ''}>${esc(label)}</option>`;
  const fbox = root.querySelector('[data-filters]');
  fbox.innerHTML = `
    <label class="search">${icon('search')}<input type="search" name="q" placeholder="Buscar por nombre…" value="${esc(filters.q)}" aria-label="Buscar productos" /></label>
    <select name="collection" aria-label="Colección">
      ${opt('', 'Todas las colecciones', filters.collection)}${opt('none', 'Sin colección', filters.collection)}
      ${collections.map((c) => opt(c.id, c.name, filters.collection)).join('')}
    </select>
    <select name="category" aria-label="Categoría">
      ${opt('', 'Todas las categorías', filters.category)}${opt('none', 'Sin categoría', filters.category)}
      ${categories.map((c) => opt(c.id, c.name, filters.category)).join('')}
    </select>
    <select name="active" aria-label="Estado">
      ${opt('', 'Activos e inactivos', filters.active)}${opt('1', 'Solo activos', filters.active)}${opt('0', 'Solo inactivos', filters.active)}
    </select>`;

  const list = root.querySelector('[data-list]');
  const norm = (s) => slugify(s).replace(/-/g, ' ');

  const draw = () => {
    const q = norm(filters.q);
    const rows = products.filter((p) => {
      if (q && !norm(p.name).includes(q)) return false;
      if (filters.collection === 'none' ? p.collection_id : filters.collection && p.collection_id !== filters.collection) return false;
      if (filters.category === 'none' ? p.category_id : filters.category && p.category_id !== filters.category) return false;
      if (filters.active && String(Number(p.is_active)) !== filters.active) return false;
      return true;
    });
    if (!products.length) {
      list.innerHTML = emptyHtml('Aún no hay productos', 'Crea tu primer producto y asígnalo a una colección.');
      return;
    }
    if (!rows.length) {
      list.innerHTML = emptyHtml('Sin resultados', 'Ningún producto coincide con los filtros.', '<button class="btn btn--ghost" data-clear>Limpiar filtros</button>');
      return;
    }
    list.innerHTML = `
      <p class="muted small count">${rows.length} de ${products.length} producto${products.length === 1 ? '' : 's'}</p>
      <div class="pgrid">${rows.map((p) => `
        <article class="pcard ${p.is_active ? '' : 'is-off'}" data-id="${esc(p.id)}">
          <button class="pcard__media" data-act="edit" aria-label="Editar ${esc(p.name)}">
            ${thumbs[p.id] ? `<img src="${esc(api.imageUrl(thumbs[p.id]))}" alt="" loading="lazy" />` : `<div class="card__ph">${icon('image')}</div>`}
            ${p.tag ? `<span class="badge badge--ink">${esc(p.tag)}</span>` : ''}
          </button>
          <div class="pcard__body">
            <h3>${esc(p.name)}</h3>
            <p class="pcard__price">${cop(p.price)}${p.compare_at_price ? ` <s>${cop(p.compare_at_price)}</s>` : ''}</p>
            <p class="muted small">${esc(colName[p.collection_id] || 'Sin colección')} · ${esc(catName[p.category_id] || 'Sin categoría')}</p>
            <span class="badge ${p.is_active ? 'badge--ok' : 'badge--off'}">${p.is_active ? 'Activo' : 'Inactivo'}</span>
          </div>
          <div class="pcard__actions">
            <button class="icon-btn" data-act="edit" aria-label="Editar" title="Editar">${icon('edit')}</button>
            <button class="icon-btn" data-act="duplicate" aria-label="Duplicar" title="Duplicar producto">${icon('copy')}</button>
            <a class="icon-btn" href="${esc(productUrl(p.slug))}" target="_blank" rel="noopener" aria-label="Ver en tienda" title="Ver en tienda">${icon('eye')}</a>
            <button class="icon-btn icon-btn--danger" data-act="delete" aria-label="Eliminar" title="Eliminar">${icon('trash')}</button>
          </div>
        </article>`).join('')}
      </div>`;
  };
  draw();

  fbox.addEventListener('input', (e) => {
    if (!e.target.name) return;
    filters[e.target.name] = e.target.value;
    draw();
  });
  list.addEventListener('click', async (e) => {
    if (e.target.closest('[data-clear]')) {
      Object.assign(filters, { q: '', collection: '', category: '', active: '' });
      renderProducts(ctx);
      return;
    }
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const p = products.find((x) => x.id === btn.closest('[data-id]').dataset.id);
    if (!p) return;
    if (btn.dataset.act === 'edit') openForm(ctx, p, lookups);
    if (btn.dataset.act === 'duplicate') duplicateProduct(ctx, p, lookups, btn);
    if (btn.dataset.act === 'delete') {
      const ok = await confirmDialog({ title: `¿Eliminar "${p.name}"?`, message: 'Se borrarán también sus imágenes. Los pedidos existentes conservan el nombre del producto.' });
      if (!ok) return;
      try {
        const imgs = await api.list('product_images', { eq: { product_id: p.id } });
        await api.remove('products', p.id);
        await cleanupFiles(api, imgs.map((i) => i.path));
        toast('Producto eliminado');
        renderProducts(ctx);
      } catch (err) { toastError(err); }
    }
  });
}

/** Borra archivos de Storage que ya no use ninguna imagen de producto. */
async function cleanupFiles(api, paths) {
  const orphan = [];
  for (const path of new Set(paths.filter(isStoragePath))) {
    try {
      if ((await api.count('product_images', { path })) === 0) orphan.push(path);
    } catch { /* si falla la verificación, mejor no borrar */ }
  }
  if (orphan.length) await api.removeFiles(orphan).catch((err) => console.warn('No se pudieron borrar archivos', err));
}

async function duplicateProduct(ctx, p, lookups, btn) {
  const { api } = ctx;
  await withBusy(btn, async () => {
    try {
      const suffix = Math.random().toString(36).slice(2, 6);
      const { id, created_at, updated_at, ...rest } = p;
      const copy = await api.insert('products', {
        ...rest,
        name: `${p.name} (copia)`,
        slug: `${p.slug}-copia-${suffix}`.slice(0, 90),
        specs: Array.isArray(p.specs) ? p.specs : [],
        is_active: false,
      });
      const imgs = await api.list('product_images', { eq: { product_id: p.id }, order: [['sort_order', true]] });
      const rows = [];
      for (const img of imgs) {
        let path = img.path;
        if (isStoragePath(path)) {
          const base = path.split('/').pop().replace(/^\d+-/, '');
          try {
            path = await api.copyFile(path, `products/${copy.id}/${Date.now()}-${base}`);
          } catch (err) {
            console.warn('No se pudo copiar la imagen, se reutiliza la original', err);
          }
        }
        rows.push({ product_id: copy.id, path, alt: img.alt, sort_order: img.sort_order });
      }
      await api.insertMany('product_images', rows);
      toast('Producto duplicado (queda inactivo hasta que lo revises)');
      await renderProducts(ctx);
      openForm(ctx, copy, lookups);
    } catch (err) { toastError(err, 'No se pudo duplicar: '); }
  });
}

// ───────── Formulario ─────────
async function openForm(ctx, product, { collections, categories }) {
  const { api } = ctx;
  const p = product || {
    name: '', slug: '', description: '', material: '', price: null, compare_at_price: null,
    sizes: ['35', '36', '37', '38', '39', '40'], colors: [], tag: '', category_id: null,
    collection_id: collections.find((c) => c.is_active)?.id ?? null,
    lead_time_days: null, is_active: true, sort_order: 0, specs: [],
  };
  const sizes = new Set((p.sizes || []).map(String));
  const colors = [...(p.colors || [])];
  const specs = (Array.isArray(p.specs) ? p.specs : []).map((s) => ({ label: s.label || '', value: s.value || '' }));
  /** @type {{id?:string, path?:string, blob?:Blob, name?:string, url:string, sort_order?:number}[]} */
  let imgs = [];
  const removedImgs = [];

  const option = (v, label, sel) => `<option value="${esc(v)}" ${sel === v ? 'selected' : ''}>${esc(label)}</option>`;
  const drawer = openDrawer({
    title: product ? 'Editar producto' : 'Nuevo producto',
    wide: true,
    html: `
      <form class="form" novalidate>
        <section class="form__section">
          <h3>Información</h3>
          ${fieldHtml('Nombre', `<input name="name" required value="${esc(p.name)}" placeholder="Slingback Celeste" />`)}
          ${fieldHtml('Slug (dirección web)', `<input name="slug" required value="${esc(p.slug)}" />`, product ? `Página: ${productUrl(p.slug)}` : 'Se genera a partir del nombre.')}
          ${fieldHtml('Descripción', `<textarea name="description" rows="4">${esc(p.description)}</textarea>`)}
          ${fieldHtml('Material', `<input name="material" value="${esc(p.material)}" placeholder="Cuero, charol, gamuza…" />`)}
        </section>

        <section class="form__section">
          <h3>Precio</h3>
          <div class="grid-2">
            ${fieldHtml('Precio (COP)', moneyInput('price', p.price, '$0'))}
            ${fieldHtml('Precio antes (opcional)', moneyInput('compare_at_price', p.compare_at_price, '$0'), 'Se muestra tachado si es mayor al precio.')}
          </div>
        </section>

        <section class="form__section">
          <h3>Imágenes</h3>
          <p class="hint">La primera es la principal. Se redimensionan a 1400 px antes de subir.</p>
          <div class="gallery" data-gallery></div>
          <label class="dropzone" data-drop>
            ${icon('image')}<span><strong>Agregar imágenes</strong><small>Haz clic o arrastra aquí</small></span>
            <input type="file" accept="image/*" multiple hidden data-files />
          </label>
        </section>

        <section class="form__section">
          <h3>Tallas y colores</h3>
          <div class="field"><span>Tallas disponibles</span>
            <div class="chips" data-sizes>${SIZES.map((s) => `<button type="button" class="chip ${sizes.has(s) ? 'is-on' : ''}" data-size="${s}" aria-pressed="${sizes.has(s)}">${s}</button>`).join('')}</div>
          </div>
          <div class="field"><span>Colores</span>
            <div class="chips chips--free" data-colors></div>
            <div class="inline-add"><input data-color-input placeholder="Ej: Negro, Nude, Dorado…" /><button type="button" class="btn btn--ghost btn--sm" data-color-add>${icon('plus')}Agregar</button></div>
          </div>
        </section>

        <section class="form__section">
          <h3>Especificaciones técnicas</h3>
          <p class="hint">Se muestran en la página del producto. Las filas vacías se ignoran.</p>
          <div class="specs" data-specs></div>
          <div class="chips chips--suggest" data-spec-suggest>${SPEC_SUGGESTIONS.map((s) => `<button type="button" class="chip chip--add" data-spec-label="${esc(s)}">+ ${esc(s)}</button>`).join('')}</div>
          <button type="button" class="btn btn--ghost btn--sm" data-spec-add>${icon('plus')}Agregar fila</button>
        </section>

        <section class="form__section">
          <h3>Organización</h3>
          <div class="grid-2">
            ${fieldHtml('Colección', `<select name="collection_id">${option('', 'Sin colección', p.collection_id || '')}${collections.map((c) => option(c.id, `${c.name}${c.is_active ? '' : ' (oculta)'}`, p.collection_id || '')).join('')}</select>`)}
            ${fieldHtml('Categoría', `<select name="category_id">${option('', 'Sin categoría', p.category_id || '')}${categories.map((c) => option(c.id, c.name, p.category_id || '')).join('')}</select>`)}
            ${fieldHtml('Etiqueta', `<input name="tag" list="tag-list" value="${esc(p.tag)}" placeholder="Nuevo, Top, Últimos…" /><datalist id="tag-list">${TAG_SUGGESTIONS.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>`)}
            ${fieldHtml('Días de preparación', `<input type="number" min="0" name="lead_time_days" value="${esc(p.lead_time_days ?? '')}" placeholder="Sin definir" />`, 'Tiempo bajo pedido antes del envío.')}
            ${fieldHtml('Orden', `<input type="number" name="sort_order" value="${esc(p.sort_order ?? 0)}" />`, 'Menor número = aparece primero.')}
          </div>
          <div class="toggles">${toggleHtml('is_active', 'Activo (visible en la tienda)', p.is_active, 'También debe estar visible su colección.')}</div>
        </section>

        <p class="form-error" data-error hidden></p>
        <div class="form__actions form__actions--sticky">
          <button type="button" class="btn btn--ghost" data-cancel>Cancelar</button>
          <button class="btn btn--primary" data-busy="Guardando…">Guardar producto</button>
        </div>
      </form>`,
  });
  const form = drawer.body.querySelector('form');
  bindMoney(form);
  bindSlug(form, slugify, { locked: Boolean(product) });
  form.querySelector('[data-cancel]').addEventListener('click', drawer.close);

  // ── Tallas
  form.querySelector('[data-sizes]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    const s = b.dataset.size;
    sizes.has(s) ? sizes.delete(s) : sizes.add(s);
    b.classList.toggle('is-on', sizes.has(s));
    b.setAttribute('aria-pressed', sizes.has(s));
  });

  // ── Colores
  const colorsBox = form.querySelector('[data-colors]');
  const colorInput = form.querySelector('[data-color-input]');
  const drawColors = () => {
    colorsBox.innerHTML = colors.length
      ? colors.map((c, i) => `<span class="chip is-on">${esc(c)}<button type="button" data-color-del="${i}" aria-label="Quitar ${esc(c)}">×</button></span>`).join('')
      : '<small class="hint">Sin colores. Agrega uno abajo.</small>';
  };
  const addColor = () => {
    const parts = colorInput.value.split(',').map((s) => s.trim()).filter(Boolean);
    for (const c of parts) if (!colors.some((x) => x.toLowerCase() === c.toLowerCase())) colors.push(c);
    colorInput.value = '';
    drawColors();
    colorInput.focus();
  };
  colorInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } });
  form.querySelector('[data-color-add]').addEventListener('click', addColor);
  colorsBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-color-del]');
    if (b) { colors.splice(Number(b.dataset.colorDel), 1); drawColors(); }
  });
  drawColors();

  // ── Especificaciones
  const specsBox = form.querySelector('[data-specs]');
  const syncSpecs = () => {
    specsBox.querySelectorAll('[data-spec-row]').forEach((row, i) => {
      specs[i].label = row.querySelector('[data-k=label]').value;
      specs[i].value = row.querySelector('[data-k=value]').value;
    });
  };
  const drawSpecs = (focusIdx = -1) => {
    specsBox.innerHTML = specs.length
      ? specs.map((s, i) => `
        <div class="spec-row" data-spec-row>
          <input data-k="label" value="${esc(s.label)}" placeholder="Característica" aria-label="Característica" />
          <input data-k="value" value="${esc(s.value)}" placeholder="Valor" aria-label="Valor" />
          <div class="spec-row__btns">
            <button type="button" class="icon-btn icon-btn--sm" data-spec-move="${i}:-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
            <button type="button" class="icon-btn icon-btn--sm" data-spec-move="${i}:1" aria-label="Bajar" ${i === specs.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
            <button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-spec-del="${i}" aria-label="Quitar">${icon('x')}</button>
          </div>
        </div>`).join('')
      : '<small class="hint">Aún no hay especificaciones. Usa las sugerencias o agrega una fila.</small>';
    if (focusIdx >= 0) specsBox.querySelectorAll('[data-spec-row]')[focusIdx]?.querySelector(specs[focusIdx].label ? '[data-k=value]' : '[data-k=label]').focus();
  };
  specsBox.addEventListener('click', (e) => {
    const mv = e.target.closest('[data-spec-move]');
    const del = e.target.closest('[data-spec-del]');
    if (!mv && !del) return;
    syncSpecs();
    if (mv) {
      const [i, d] = mv.dataset.specMove.split(':').map(Number);
      [specs[i], specs[i + d]] = [specs[i + d], specs[i]];
    } else specs.splice(Number(del.dataset.specDel), 1);
    drawSpecs();
  });
  form.querySelector('[data-spec-suggest]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-spec-label]');
    if (!b) return;
    syncSpecs();
    const existing = specs.findIndex((s) => s.label.trim().toLowerCase() === b.dataset.specLabel.toLowerCase());
    if (existing >= 0) { drawSpecs(existing); return; }
    specs.push({ label: b.dataset.specLabel, value: '' });
    drawSpecs(specs.length - 1);
  });
  form.querySelector('[data-spec-add]').addEventListener('click', () => {
    syncSpecs();
    specs.push({ label: '', value: '' });
    drawSpecs(specs.length - 1);
  });
  drawSpecs();

  // ── Imágenes
  const gallery = form.querySelector('[data-gallery]');
  const drawGallery = () => {
    gallery.innerHTML = imgs.length
      ? imgs.map((im, i) => `
        <figure class="gimg ${i === 0 ? 'is-main' : ''}">
          ${im.url ? `<img src="${esc(im.url)}" alt="" />` : '<span class="spinner"></span>'}
          ${i === 0 ? '<span class="badge badge--gold gimg__main">Principal</span>' : ''}
          <figcaption>
            <button type="button" class="icon-btn icon-btn--sm" data-img-move="${i}:-1" aria-label="Mover a la izquierda" ${i === 0 ? 'disabled' : ''}>${icon('left')}</button>
            ${i > 0 ? `<button type="button" class="icon-btn icon-btn--sm" data-img-main="${i}" aria-label="Usar como principal" title="Usar como principal">${icon('star')}</button>` : ''}
            <button type="button" class="icon-btn icon-btn--sm" data-img-move="${i}:1" aria-label="Mover a la derecha" ${i === imgs.length - 1 ? 'disabled' : ''}>${icon('right')}</button>
            <button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-img-del="${i}" aria-label="Quitar imagen">${icon('trash')}</button>
          </figcaption>
        </figure>`).join('')
      : '<p class="hint">Este producto aún no tiene imágenes.</p>';
  };
  gallery.addEventListener('click', (e) => {
    const mv = e.target.closest('[data-img-move]');
    const main = e.target.closest('[data-img-main]');
    const del = e.target.closest('[data-img-del]');
    if (mv) {
      const [i, d] = mv.dataset.imgMove.split(':').map(Number);
      [imgs[i], imgs[i + d]] = [imgs[i + d], imgs[i]];
    } else if (main) {
      const [im] = imgs.splice(Number(main.dataset.imgMain), 1);
      imgs.unshift(im);
    } else if (del) {
      const [im] = imgs.splice(Number(del.dataset.imgDel), 1);
      if (im.id) removedImgs.push(im);
    } else return;
    drawGallery();
  });
  const addFiles = async (files) => {
    for (const file of files) {
      const entry = { url: '', name: file.name };
      imgs.push(entry);
      drawGallery();
      try {
        entry.blob = await resizeImage(file);
        entry.url = URL.createObjectURL(entry.blob);
      } catch (err) {
        imgs.splice(imgs.indexOf(entry), 1);
        toastError(err);
      }
      drawGallery();
    }
  };
  form.querySelector('[data-files]').addEventListener('change', (e) => {
    addFiles([...e.target.files]);
    e.target.value = '';
  });
  const drop = form.querySelector('[data-drop]');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('is-over');
    addFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/')));
  });

  gallery.innerHTML = loadingHtml('Cargando imágenes…');
  if (product) {
    try {
      const existing = await api.list('product_images', { eq: { product_id: product.id }, order: [['sort_order', true]] });
      imgs = existing.map((im) => ({ id: im.id, path: im.path, sort_order: im.sort_order, url: api.imageUrl(im.path) }));
    } catch (err) { toastError(err, 'No se pudieron cargar las imágenes: '); }
  }
  drawGallery();

  // ── Guardar
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = form.querySelector('[data-error]');
    const fail = (m) => { errBox.textContent = m; errBox.hidden = false; errBox.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    const f = form.elements;
    syncSpecs();
    const name = f.name.value.trim();
    const slug = slugify(f.slug.value || name);
    const price = parseMoney(f.price.value);
    const compare = parseMoney(f.compare_at_price.value);
    if (!name || !slug) return fail('El nombre es obligatorio.');
    if (price == null) return fail('Escribe el precio del producto.');
    if (!sizes.size) return fail('Selecciona al menos una talla.');
    if (imgs.some((im) => !im.url)) return fail('Espera a que terminen de procesarse las imágenes.');
    const cleanSpecs = specs.map((s) => ({ label: s.label.trim(), value: s.value.trim() })).filter((s) => s.label || s.value);
    if (cleanSpecs.some((s) => !s.label || !s.value)) return fail('Cada especificación necesita característica y valor (o déjala vacía para quitarla).');
    errBox.hidden = true;

    const row = {
      name, slug,
      description: f.description.value.trim() || null,
      material: f.material.value.trim() || null,
      price,
      compare_at_price: compare,
      sizes: SIZES.filter((s) => sizes.has(s)).concat([...sizes].filter((s) => !SIZES.includes(s))),
      colors,
      tag: f.tag.value.trim() || null,
      category_id: f.category_id.value || null,
      collection_id: f.collection_id.value || null,
      lead_time_days: intOrNull(f.lead_time_days.value),
      is_active: f.is_active.checked,
      sort_order: intOrNull(f.sort_order.value) ?? 0,
      specs: cleanSpecs,
    };

    await withBusy(form.querySelector('[data-busy]'), async () => {
      let saved;
      try {
        saved = product ? await api.update('products', product.id, row) : await api.insert('products', row);
      } catch (err) { toastError(err); return; }
      try {
        // Imágenes quitadas
        for (const im of removedImgs) await api.remove('product_images', im.id);
        await cleanupFiles(api, removedImgs.map((im) => im.path));
        removedImgs.length = 0;
        // Nuevas imágenes y orden
        const inserts = [];
        for (const [i, im] of imgs.entries()) {
          if (im.blob && !im.path) {
            im.path = await api.upload(`products/${saved.id}/${fileName(im.name, im.blob)}`, im.blob);
            inserts.push({ product_id: saved.id, path: im.path, alt: name, sort_order: i });
          } else if (im.id && im.sort_order !== i) {
            await api.update('product_images', im.id, { sort_order: i });
            im.sort_order = i;
          }
        }
        const created = await api.insertMany('product_images', inserts);
        for (const c of created) {
          const im = imgs.find((x) => x.path === c.path);
          if (im) im.id = c.id;
        }
        toast(product ? 'Producto actualizado' : 'Producto creado');
        drawer.close();
        renderProducts(ctx);
      } catch (err) {
        toastError(err, 'El producto se guardó, pero hubo un problema con las imágenes: ');
        if (!product) { drawer.close(); renderProducts(ctx); }
      }
    });
  });
}
