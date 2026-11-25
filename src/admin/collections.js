// Colecciones por temporada.
import { esc, icon, fmtDate, slugify, intOrNull, toast, toastError, confirmDialog, openDrawer, withBusy, loadingHtml, emptyHtml } from './ui.js';
import { toggleHtml, fieldHtml, bindSlug, singleImagePicker, persistSingleImage } from './forms.js';

export async function renderCollections(ctx) {
  const { api, root, isCurrent } = ctx;
  root.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Temporadas</p>
        <h1>Colecciones</h1>
        <p class="muted">Cada temporada sube una colección nueva. Solo las marcadas como <strong>visibles</strong> aparecen en la tienda; la <strong>destacada</strong> se muestra en la portada.</p>
      </div>
      <button class="btn btn--primary" data-new>${icon('plus')}Nueva colección</button>
    </header>
    <div data-list>${loadingHtml('Cargando colecciones…')}</div>`;
  root.querySelector('[data-new]').addEventListener('click', () => openForm(ctx, null));

  const [cols, prods] = await Promise.all([
    api.list('collections', { order: [['sort_order', true], ['created_at', false]] }),
    api.list('products', { select: 'id,collection_id,is_active' }),
  ]);
  if (!isCurrent()) return;
  const counts = {};
  for (const p of prods) if (p.collection_id) counts[p.collection_id] = (counts[p.collection_id] || 0) + 1;

  const list = root.querySelector('[data-list]');
  if (!cols.length) {
    list.innerHTML = emptyHtml('Aún no hay colecciones', 'Crea la primera colección de temporada, por ejemplo "Otoño 2026".',
      `<button class="btn btn--primary" data-new2>${icon('plus')}Crear colección</button>`);
    list.querySelector('[data-new2]').addEventListener('click', () => openForm(ctx, null));
    return;
  }
  list.innerHTML = `<div class="cards">${cols.map((c) => card(api, c, counts[c.id] || 0)).join('')}</div>`;

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const col = cols.find((c) => c.id === btn.closest('[data-id]').dataset.id);
    if (!col) return;
    const act = btn.dataset.act;
    if (act === 'edit') openForm(ctx, col);
    if (act === 'products') location.hash = `#/productos?coleccion=${col.id}`;
    if (act === 'delete') {
      const n = counts[col.id] || 0;
      const ok = await confirmDialog({
        title: `¿Eliminar "${col.name}"?`,
        message: n ? `Sus ${n} producto(s) no se borran: quedarán sin colección.` : 'Esta acción no se puede deshacer.',
      });
      if (!ok) return;
      try {
        await api.remove('collections', col.id);
        if (col.cover_path) api.removeFiles([col.cover_path]).catch(() => {});
        toast('Colección eliminada');
        renderCollections(ctx);
      } catch (err) { toastError(err); }
    }
    if (act === 'toggle-active' || act === 'toggle-featured') {
      const field = act === 'toggle-active' ? 'is_active' : 'is_featured';
      try {
        await withBusy(btn, () => api.update('collections', col.id, { [field]: !col[field] }));
        toast(field === 'is_active'
          ? (!col.is_active ? 'Colección visible en la tienda' : 'Colección oculta de la tienda')
          : (!col.is_featured ? 'Colección destacada' : 'Ya no está destacada'));
        renderCollections(ctx);
      } catch (err) { toastError(err); }
    }
  });
}

function card(api, c, count) {
  const cover = c.cover_path ? `<img src="${esc(api.imageUrl(c.cover_path))}" alt="" loading="lazy" />` : `<div class="card__ph">${icon('image')}</div>`;
  const dates = c.starts_on || c.ends_on ? `${fmtDate(c.starts_on)} – ${fmtDate(c.ends_on)}` : 'Sin fechas';
  return `
    <article class="card" data-id="${esc(c.id)}">
      <div class="card__media">${cover}
        <div class="card__badges">
          ${c.is_featured ? `<span class="badge badge--gold">${icon('star')}Destacada</span>` : ''}
          <span class="badge ${c.is_active ? 'badge--ok' : 'badge--off'}">${c.is_active ? 'Visible' : 'Oculta'}</span>
        </div>
      </div>
      <div class="card__body">
        <h3>${esc(c.name)}</h3>
        <p class="muted small">${esc(c.season || 'Temporada sin definir')} · ${esc(dates)}</p>
        <button class="link" data-act="products">${count} producto${count === 1 ? '' : 's'} →</button>
        <div class="card__switches">
          <button class="chip-toggle ${c.is_active ? 'is-on' : ''}" data-act="toggle-active" aria-pressed="${c.is_active}">${icon('eye')}Visible en la tienda</button>
          <button class="chip-toggle ${c.is_featured ? 'is-on' : ''}" data-act="toggle-featured" aria-pressed="${c.is_featured}">${icon('star')}Destacada</button>
        </div>
      </div>
      <div class="card__actions">
        <button class="btn btn--ghost btn--sm" data-act="edit">${icon('edit')}Editar</button>
        <button class="icon-btn icon-btn--danger" data-act="delete" aria-label="Eliminar colección">${icon('trash')}</button>
      </div>
    </article>`;
}

function openForm(ctx, col) {
  const { api } = ctx;
  const c = col || { name: '', slug: '', season: '', description: '', starts_on: '', ends_on: '', is_active: false, is_featured: false, sort_order: 0 };
  const picker = singleImagePicker(api, c.cover_path, 'Imagen de portada');
  const drawer = openDrawer({
    title: col ? 'Editar colección' : 'Nueva colección',
    html: `
      <form class="form" novalidate>
        ${fieldHtml('Nombre', `<input name="name" required value="${esc(c.name)}" placeholder="Otoño 2026" />`)}
        ${fieldHtml('Slug (dirección web)', `<input name="slug" required value="${esc(c.slug)}" />`, 'Se genera a partir del nombre. Solo letras, números y guiones.')}
        ${fieldHtml('Temporada', `<input name="season" value="${esc(c.season)}" placeholder="Otoño, Navidad, Verano…" />`)}
        ${fieldHtml('Descripción', `<textarea name="description" rows="3">${esc(c.description)}</textarea>`)}
        ${picker.html}
        <div class="grid-2">
          ${fieldHtml('Inicia', `<input type="date" name="starts_on" value="${esc(c.starts_on || '')}" />`)}
          ${fieldHtml('Termina', `<input type="date" name="ends_on" value="${esc(c.ends_on || '')}" />`)}
        </div>
        <div class="toggles">
          ${toggleHtml('is_active', 'Visible en la tienda', c.is_active, 'Si está apagado, la colección y sus productos no se muestran.')}
          ${toggleHtml('is_featured', 'Destacada', c.is_featured, 'Se muestra en la portada de la tienda.')}
        </div>
        ${fieldHtml('Orden', `<input type="number" name="sort_order" value="${esc(c.sort_order ?? 0)}" />`, 'Menor número = aparece primero.', 'field--sm')}
        <p class="form-error" data-error hidden></p>
        <div class="form__actions">
          <button type="button" class="btn btn--ghost" data-cancel>Cancelar</button>
          <button class="btn btn--primary" data-busy="Guardando…">Guardar colección</button>
        </div>
      </form>`,
  });
  const form = drawer.body.querySelector('form');
  picker.bind(form);
  bindSlug(form, slugify, { locked: Boolean(col) });
  form.querySelector('[data-cancel]').addEventListener('click', drawer.close);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = form.querySelector('[data-error]');
    const f = form.elements;
    const name = f.name.value.trim();
    const slug = slugify(f.slug.value || name);
    if (!name || !slug) { err.textContent = 'El nombre es obligatorio.'; err.hidden = false; return; }
    if (f.starts_on.value && f.ends_on.value && f.ends_on.value < f.starts_on.value) {
      err.textContent = 'La fecha de fin no puede ser anterior a la de inicio.'; err.hidden = false; return;
    }
    err.hidden = true;
    await withBusy(form.querySelector('[data-busy]'), async () => {
      try {
        const cover_path = await persistSingleImage(api, picker, 'collections', c.cover_path);
        const row = {
          name, slug,
          season: f.season.value.trim() || null,
          description: f.description.value.trim() || null,
          cover_path,
          starts_on: f.starts_on.value || null,
          ends_on: f.ends_on.value || null,
          is_active: f.is_active.checked,
          is_featured: f.is_featured.checked,
          sort_order: intOrNull(f.sort_order.value) ?? 0,
        };
        if (col) await api.update('collections', col.id, row);
        else await api.insert('collections', row);
        toast(col ? 'Colección actualizada' : 'Colección creada');
        drawer.close();
        renderCollections(ctx);
      } catch (e2) { toastError(e2); }
    });
  });
}
