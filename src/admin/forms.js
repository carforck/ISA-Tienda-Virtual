// Piezas de formulario reutilizables.
import { esc, icon, moneyInputValue, parseMoney, toastError } from './ui.js';
import { resizeImage, fileName } from './images.js';

/** Interruptor accesible. */
export const toggleHtml = (name, label, checked, hint = '') => `
  <label class="toggle">
    <input type="checkbox" name="${esc(name)}" ${checked ? 'checked' : ''} />
    <span class="toggle__track" aria-hidden="true"></span>
    <span class="toggle__text"><strong>${esc(label)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</span>
  </label>`;

export const fieldHtml = (label, inner, hint = '', cls = '') => `
  <label class="field ${cls}"><span>${esc(label)}</span>${inner}${hint ? `<small class="hint">${esc(hint)}</small>` : ''}</label>`;

export const moneyInput = (name, value, placeholder = '') =>
  `<input type="text" inputmode="numeric" name="${esc(name)}" data-money value="${esc(moneyInputValue(value))}" placeholder="${esc(placeholder)}" autocomplete="off" />`;

/** Formatea en vivo los campos de dinero ($219.000). */
export function bindMoney(root) {
  root.querySelectorAll('[data-money]').forEach((input) => {
    input.addEventListener('input', () => {
      const n = parseMoney(input.value);
      input.value = n == null ? '' : moneyInputValue(n);
    });
  });
}

/** Auto-slug a partir del nombre mientras el usuario no edite el slug a mano. */
export function bindSlug(form, slugify, { locked = false } = {}) {
  const name = form.elements.name;
  const slug = form.elements.slug;
  let manual = locked;
  slug.addEventListener('input', () => { manual = slug.value.trim() !== ''; });
  slug.addEventListener('blur', () => { slug.value = slugify(slug.value); });
  name.addEventListener('input', () => {
    if (!manual) slug.value = slugify(name.value);
  });
}

/**
 * Selector de una sola imagen (portadas de colección / categoría).
 * Devuelve { html, bind(root), getState() } — getState(): { file: Blob|null, removed: boolean }
 */
export function singleImagePicker(api, currentPath, label = 'Imagen') {
  const state = { blob: null, name: '', removed: false };
  const url = currentPath ? api.imageUrl(currentPath) : '';
  const html = `
    <div class="field">
      <span>${esc(label)}</span>
      <div class="imgpick" data-imgpick>
        <div class="imgpick__preview" data-preview>${url ? `<img src="${esc(url)}" alt="" />` : `<div class="imgpick__empty">${icon('image')}<small>Sin imagen</small></div>`}</div>
        <div class="imgpick__actions">
          <label class="btn btn--ghost btn--sm">${icon('image')}<span>${url ? 'Cambiar' : 'Subir imagen'}</span>
            <input type="file" accept="image/*" hidden data-file /></label>
          <button type="button" class="btn btn--text btn--sm" data-remove ${url ? '' : 'hidden'}>Quitar</button>
          <small class="hint">Se optimiza automáticamente (máx. 1400 px).</small>
        </div>
      </div>
    </div>`;
  const bind = (root) => {
    const box = root.querySelector('[data-imgpick]');
    const preview = box.querySelector('[data-preview]');
    const removeBtn = box.querySelector('[data-remove]');
    box.querySelector('[data-file]').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      preview.innerHTML = '<span class="spinner"></span>';
      try {
        state.blob = await resizeImage(file);
        state.name = file.name;
        state.removed = false;
        preview.innerHTML = `<img src="${URL.createObjectURL(state.blob)}" alt="" />`;
        removeBtn.hidden = false;
      } catch (err) {
        toastError(err);
        preview.innerHTML = url ? `<img src="${esc(url)}" alt="" />` : '';
      }
    });
    removeBtn.addEventListener('click', () => {
      state.blob = null;
      state.removed = true;
      preview.innerHTML = `<div class="imgpick__empty">${icon('image')}<small>Sin imagen</small></div>`;
      removeBtn.hidden = true;
    });
  };
  return { html, bind, state };
}

/** Sube la imagen elegida (si hay) y devuelve el nuevo path; maneja quitar/reemplazar. */
export async function persistSingleImage(api, picker, folder, oldPath) {
  const { state } = picker;
  if (state.blob) {
    const path = await api.upload(`${folder}/${fileName(state.name, state.blob)}`, state.blob);
    if (oldPath) api.removeFiles([oldPath]).catch(() => {});
    return path;
  }
  if (state.removed) {
    if (oldPath) api.removeFiles([oldPath]).catch(() => {});
    return null;
  }
  return oldPath ?? null;
}
