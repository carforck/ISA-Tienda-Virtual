// Envíos y ajustes de la tienda.
import { esc, icon, parseMoney, intOrNull, toast, toastError, confirmDialog, withBusy, loadingHtml } from './ui.js';
import { fieldHtml, moneyInput, bindMoney, toggleHtml } from './forms.js';

export async function renderSettings(ctx) {
  const { api, root, isCurrent } = ctx;
  root.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Configuración</p>
        <h1>Envíos y ajustes</h1>
        <p class="muted">Datos generales de la tienda y transportadoras para envíos nacionales.</p>
      </div>
    </header>
    <div data-body>${loadingHtml()}</div>`;

  const [settingsRows, carriers] = await Promise.all([
    api.list('store_settings', { eq: { id: 1 } }),
    api.list('carriers', { order: [['sort_order', true], ['name', true]] }),
  ]);
  if (!isCurrent()) return;
  const s = settingsRows[0] || null;
  const body = root.querySelector('[data-body]');

  body.innerHTML = `
    <form class="form panel" data-settings novalidate>
      <h3>Tienda</h3>
      ${s ? '' : '<p class="note">No se encontró la fila de ajustes. Ejecuta de nuevo <code>supabase/schema.sql</code>.</p>'}
      <div class="grid-2">
        ${fieldHtml('WhatsApp de la tienda', `<input name="whatsapp" inputmode="tel" value="${esc(s?.whatsapp || '')}" placeholder="573001234567" />`, 'Con indicativo 57, sin espacios ni +.')}
        ${fieldHtml('Días de preparación por defecto', `<input type="number" min="0" name="default_lead_time_days" value="${esc(s?.default_lead_time_days ?? '')}" placeholder="Sin definir" />`)}
        ${fieldHtml('Costo de envío por defecto', moneyInput('default_shipping_cost', s?.default_shipping_cost, 'Se cotiza por WhatsApp'), 'Vacío = se cotiza por WhatsApp en cada pedido.')}
        ${fieldHtml('Envío gratis desde', moneyInput('free_shipping_from', s?.free_shipping_from, 'Sin envío gratis'), 'Vacío = no hay envío gratis.')}
      </div>
      ${fieldHtml('Nota para pedidos', `<textarea name="order_note" rows="3">${esc(s?.order_note || '')}</textarea>`, 'Se muestra a la clienta al hacer el pedido.')}
      <div class="form__actions"><button class="btn btn--primary" data-busy="Guardando…" ${s ? '' : 'disabled'}>Guardar ajustes</button></div>
    </form>

    <section class="panel">
      <div class="panel__head">
        <div>
          <h3>Transportadoras</h3>
          <p class="hint">En el enlace de rastreo usa <code>{guia}</code> donde va el número de guía.</p>
        </div>
        <button class="btn btn--ghost btn--sm" data-add>${icon('plus')}Agregar</button>
      </div>
      <div class="carriers" data-carriers></div>
    </section>`;

  // ── Ajustes
  const sForm = body.querySelector('[data-settings]');
  bindMoney(sForm);
  sForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = sForm.elements;
    const whatsapp = f.whatsapp.value.replace(/\D/g, '');
    if (!whatsapp) { toast('El WhatsApp de la tienda es obligatorio', 'error'); return; }
    const patch = {
      whatsapp: whatsapp.length === 10 ? `57${whatsapp}` : whatsapp,
      default_lead_time_days: intOrNull(f.default_lead_time_days.value),
      default_shipping_cost: parseMoney(f.default_shipping_cost.value),
      free_shipping_from: parseMoney(f.free_shipping_from.value),
      order_note: f.order_note.value.trim() || null,
    };
    await withBusy(sForm.querySelector('[data-busy]'), async () => {
      try {
        await api.update('store_settings', 1, patch);
        f.whatsapp.value = patch.whatsapp;
        toast('Ajustes guardados');
      } catch (err) { toastError(err); }
    });
  });

  // ── Transportadoras
  const box = body.querySelector('[data-carriers]');
  const rowHtml = (c) => `
    <form class="carrier ${c.id ? '' : 'is-new'}" data-id="${esc(c.id || '')}" novalidate>
      <div class="carrier__fields">
        ${fieldHtml('Nombre', `<input name="name" required value="${esc(c.name || '')}" placeholder="Servientrega" />`)}
        ${fieldHtml('Enlace de rastreo', `<input name="tracking_url" value="${esc(c.tracking_url || '')}" placeholder="https://…?guia={guia}" />`, '', 'field--grow')}
        ${fieldHtml('Orden', `<input type="number" name="sort_order" value="${esc(c.sort_order ?? 0)}" />`, '', 'field--xs')}
      </div>
      <div class="carrier__foot">
        ${toggleHtml('is_active', 'Activa', c.is_active ?? true)}
        <div class="carrier__btns">
          <button type="button" class="icon-btn icon-btn--danger" data-del aria-label="Eliminar transportadora">${icon('trash')}</button>
          <button class="btn btn--primary btn--sm" data-busy="Guardando…">${c.id ? 'Guardar' : 'Crear'}</button>
        </div>
      </div>
    </form>`;
  const draw = () => {
    box.innerHTML = carriers.length ? carriers.map(rowHtml).join('') : '<p class="muted">No hay transportadoras. Agrega la primera.</p>';
  };
  draw();

  body.querySelector('[data-add]').addEventListener('click', () => {
    if (box.querySelector('.is-new')) { box.querySelector('.is-new input').focus(); return; }
    if (!carriers.length) box.innerHTML = '';
    box.insertAdjacentHTML('beforeend', rowHtml({ sort_order: (carriers.at(-1)?.sort_order ?? 0) + 1 }));
    box.querySelector('.is-new input').focus();
  });

  box.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const f = form.elements;
    const name = f.name.value.trim();
    const url = f.tracking_url.value.trim();
    if (!name) { toast('El nombre es obligatorio', 'error'); return; }
    if (url && !/^https?:\/\//.test(url)) { toast('El enlace debe empezar por https://', 'error'); return; }
    if (url && !url.includes('{guia}')) toast('El enlace no tiene {guia}: no se podrá armar el rastreo automático', 'info');
    const row = { name, tracking_url: url || null, is_active: f.is_active.checked, sort_order: intOrNull(f.sort_order.value) ?? 0 };
    await withBusy(form.querySelector('[data-busy]'), async () => {
      try {
        const id = form.dataset.id;
        if (id) {
          const saved = await api.update('carriers', id, row);
          Object.assign(carriers.find((c) => c.id === id), saved);
          toast('Transportadora guardada');
        } else {
          carriers.push(await api.insert('carriers', row));
          carriers.sort((a, b) => a.sort_order - b.sort_order);
          toast('Transportadora creada');
          draw();
        }
      } catch (err) { toastError(err); }
    });
  });

  box.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-del]');
    if (!del) return;
    const form = del.closest('form');
    const id = form.dataset.id;
    if (!id) { form.remove(); if (!carriers.length) draw(); return; }
    const c = carriers.find((x) => x.id === id);
    const ok = await confirmDialog({
      title: `¿Eliminar "${c.name}"?`,
      message: 'Si ya tiene pedidos asociados no se podrá eliminar; en ese caso desactívala.',
    });
    if (!ok) return;
    try {
      await api.remove('carriers', id);
      carriers.splice(carriers.indexOf(c), 1);
      toast('Transportadora eliminada');
      draw();
    } catch (err) { toastError(err); }
  });
}
