// Categorías (tipo de calzado).
import { esc, icon, slugify, intOrNull, toast, toastError, confirmDialog, openDrawer, withBusy, loadingHtml, emptyHtml } from './ui.js';
import { toggleHtml, fieldHtml, bindSlug, singleImagePicker, persistSingleImage } from './forms.js';

export async function renderCategories(ctx) {
  const { api, root, isCurrent } = ctx;
  root.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Catálogo</p>
        <h1>Categorías</h1>
        <p class="muted">Tipos de calzado: tacones, slingbacks, plataformas, planos…</p>
      </div>
      <button class="btn btn--primary" data-new>${icon('plus')}Nueva categoría</button>
    </header>
    <div data-list>${loadingHtml('Cargando categorías…')}</div>`;
  root.querySelector('[data-new]').addEventListener('click', () => openForm(ctx, null));

  const [cats, prods] = await Promise.all([
    api.list('categories', { order: [['sort_order', true], ['name', true]] }),
    api.list('products', { select: 'id,category_id' }),
  ]);
  if (!isCurrent()) return;
  const counts = {};
  for (const p of prods) if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1;

  const list = root.querySelector('[data-list]');
  if (!cats.length) {
    list.innerHTML = emptyHtml('Aún no hay categorías', 'Crea categorías para organizar tus productos.');
    return;
  }
  list.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th></th><th>Nombre</th><th class="hide-sm">Slug</th><th>Productos</th><th>Estado</th><th class="hide-sm">Orden</th><th></th></tr></thead>
        <tbody>${cats.map((c) => `
          <tr data-id="${esc(c.id)}">
            <td class="td-thumb">${c.image_path ? `<img src="${esc(api.imageUrl(c.image_path))}" alt="" loading="lazy" />` : `<div class="thumb-ph">${icon('image')}</div>`}</td>
            <td><strong>${esc(c.name)}</strong></td>
            <td class="hide-sm muted">${esc(c.slug)}</td>
            <td>${counts[c.id] || 0}</td>
            <td><button class="chip-toggle ${c.is_active ? 'is-on' : ''}" data-act="toggle" aria-pressed="${c.is_active}">${c.is_active ? 'Activa' : 'Oculta'}</button></td>
            <td class="hide-sm">${esc(c.sort_order)}</td>
            <td class="td-actions">
              <button class="icon-btn" data-act="edit" aria-label="Editar">${icon('edit')}</button>
              <button class="icon-btn icon-btn--danger" data-act="delete" aria-label="Eliminar">${icon('trash')}</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const cat = cats.find((c) => c.id === btn.closest('[data-id]').dataset.id);
    if (!cat) return;
    const act = btn.dataset.act;
    if (act === 'edit') openForm(ctx, cat);
    if (act === 'toggle') {
      try {
        await withBusy(btn, () => api.update('categories', cat.id, { is_active: !cat.is_active }));
        toast(!cat.is_active ? 'Categoría activada' : 'Categoría oculta');
        renderCategories(ctx);
      } catch (err) { toastError(err); }
    }
    if (act === 'delete') {
      const n = counts[cat.id] || 0;
      const ok = await confirmDialog({
        title: `¿Eliminar "${cat.name}"?`,
        message: n ? `Sus ${n} producto(s) no se borran: quedarán sin categoría.` : 'Esta acción no se puede deshacer.',
      });
      if (!ok) return;
      try {
        await api.remove('categories', cat.id);
        if (cat.image_path) api.removeFiles([cat.image_path]).catch(() => {});
        toast('Categoría eliminada');
        renderCategories(ctx);
      } catch (err) { toastError(err); }
    }
  });
}

function openForm(ctx, cat) {
  const { api } = ctx;
  const c = cat || { name: '', slug: '', is_active: true, sort_order: 0 };
  const picker = singleImagePicker(api, c.image_path, 'Imagen');
  const drawer = openDrawer({
    title: cat ? 'Editar categoría' : 'Nueva categoría',
    html: `
      <form class="form" novalidate>
        ${fieldHtml('Nombre', `<input name="name" required value="${esc(c.name)}" placeholder="Tacones" />`)}
        ${fieldHtml('Slug (dirección web)', `<input name="slug" required value="${esc(c.slug)}" />`)}
        ${picker.html}
        <div class="toggles">${toggleHtml('is_active', 'Activa', c.is_active, 'Visible en el menú y filtros de la tienda.')}</div>
        ${fieldHtml('Orden', `<input type="number" name="sort_order" value="${esc(c.sort_order ?? 0)}" />`, 'Menor número = aparece primero.', 'field--sm')}
        <p class="form-error" data-error hidden></p>
        <div class="form__actions">
          <button type="button" class="btn btn--ghost" data-cancel>Cancelar</button>
          <button class="btn btn--primary" data-busy="Guardando…">Guardar categoría</button>
        </div>
      </form>`,
  });
  const form = drawer.body.querySelector('form');
  picker.bind(form);
  bindSlug(form, slugify, { locked: Boolean(cat) });
  form.querySelector('[data-cancel]').addEventListener('click', drawer.close);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = form.querySelector('[data-error]');
    const f = form.elements;
    const name = f.name.value.trim();
    const slug = slugify(f.slug.value || name);
    if (!name || !slug) { err.textContent = 'El nombre es obligatorio.'; err.hidden = false; return; }
    err.hidden = true;
    await withBusy(form.querySelector('[data-busy]'), async () => {
      try {
        const image_path = await persistSingleImage(api, picker, 'categories', c.image_path);
        const row = { name, slug, image_path, is_active: f.is_active.checked, sort_order: intOrNull(f.sort_order.value) ?? 0 };
        if (cat) await api.update('categories', cat.id, row);
        else await api.insert('categories', row);
        toast(cat ? 'Categoría actualizada' : 'Categoría creada');
        drawer.close();
        renderCategories(ctx);
      } catch (e2) { toastError(e2); }
    });
  });
}
