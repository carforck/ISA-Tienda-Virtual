// Pedidos (todo es bajo pedido, envío nacional con transportadoras).
import { esc, icon, cop, fmtDate, parseMoney, slugify, toast, toastError, openDrawer, withBusy, loadingHtml, emptyHtml } from './ui.js';
import { fieldHtml, moneyInput, bindMoney } from './forms.js';

export const STATUSES = [
  { id: 'nuevo', label: 'Nuevo' },
  { id: 'confirmado', label: 'Confirmado' },
  { id: 'en_produccion', label: 'En producción' },
  { id: 'listo', label: 'Listo para enviar' },
  { id: 'enviado', label: 'Enviado' },
  { id: 'entregado', label: 'Entregado' },
  { id: 'cancelado', label: 'Cancelado' },
];
const statusLabel = (id) => STATUSES.find((s) => s.id === id)?.label || id;
const statusBadge = (id) => `<span class="status status--${esc(id)}">${esc(statusLabel(id))}</span>`;

const filters = { status: '', q: '' };

/** Número para wa.me: solo dígitos; si es celular colombiano de 10 dígitos se antepone 57. */
export function waPhone(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10) d = `57${d}`;
  return d;
}
export const trackingLink = (carrier, guia) =>
  carrier?.tracking_url && guia ? carrier.tracking_url.replaceAll('{guia}', encodeURIComponent(guia)) : '';

export async function renderOrders(ctx) {
  const { api, root, isCurrent } = ctx;
  root.innerHTML = `
    <header class="page-head">
      <div>
        <p class="eyebrow">Ventas bajo pedido</p>
        <h1>Pedidos</h1>
        <p class="muted">Actualiza el estado, la transportadora y la guía, y avísale a la clienta por WhatsApp.</p>
      </div>
    </header>
    <div class="filters" data-filters></div>
    <div data-list>${loadingHtml('Cargando pedidos…')}</div>`;

  const [orders, carriers] = await Promise.all([
    api.list('orders', { order: [['created_at', false]] }),
    api.list('carriers', { order: [['sort_order', true], ['name', true]] }),
  ]);
  if (!isCurrent()) return;

  const counts = {};
  for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
  const fbox = root.querySelector('[data-filters]');
  fbox.innerHTML = `
    <label class="search">${icon('search')}<input type="search" name="q" placeholder="Código, nombre o celular…" value="${esc(filters.q)}" aria-label="Buscar pedidos" /></label>
    <div class="seg" role="tablist" aria-label="Estado">
      <button class="seg__btn ${filters.status === '' ? 'is-on' : ''}" data-status="">Todos <small>${orders.length}</small></button>
      ${STATUSES.map((s) => `<button class="seg__btn ${filters.status === s.id ? 'is-on' : ''}" data-status="${s.id}">${esc(s.label)} <small>${counts[s.id] || 0}</small></button>`).join('')}
    </div>`;

  const list = root.querySelector('[data-list]');
  const norm = (s) => slugify(s).replace(/-/g, ' ');
  const draw = () => {
    const q = filters.q.trim();
    const qn = norm(q);
    const qd = q.replace(/\D/g, '');
    const rows = orders.filter((o) => {
      if (filters.status && o.status !== filters.status) return false;
      if (!q) return true;
      return o.code.toLowerCase().includes(q.toLowerCase().replace(/^#/, ''))
        || (qn && norm(o.customer_name).includes(qn))
        || (qd.length >= 3 && String(o.customer_phone).replace(/\D/g, '').includes(qd));
    });
    if (!orders.length) { list.innerHTML = emptyHtml('Aún no hay pedidos', 'Cuando una clienta haga un pedido en la tienda aparecerá aquí.'); return; }
    if (!rows.length) { list.innerHTML = emptyHtml('Sin resultados', 'Ningún pedido coincide con la búsqueda.'); return; }
    list.innerHTML = `
      <div class="table-wrap">
        <table class="table table--orders">
          <thead><tr><th>Pedido</th><th>Clienta</th><th class="hide-sm">Destino</th><th>Estado</th><th class="num">Total</th></tr></thead>
          <tbody>${rows.map((o) => `
            <tr data-id="${esc(o.id)}" tabindex="0" class="row-link">
              <td><strong>#${esc(o.code)}</strong><br><small class="muted">${esc(fmtDate(o.created_at, true))}</small></td>
              <td>${esc(o.customer_name)}<br><small class="muted">${esc(o.customer_phone)}</small></td>
              <td class="hide-sm">${esc(o.city)}<br><small class="muted">${esc(o.department)}</small></td>
              <td>${statusBadge(o.status)}</td>
              <td class="num">${o.total != null ? cop(o.total) : `<span class="muted" title="Subtotal (sin envío)">${cop(o.subtotal)}*</span>`}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="muted small">* Subtotal sin envío: el total aún no se ha definido.</p>`;
  };
  draw();

  fbox.addEventListener('input', (e) => {
    if (e.target.name === 'q') { filters.q = e.target.value; draw(); }
  });
  fbox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-status]');
    if (!b) return;
    filters.status = b.dataset.status;
    fbox.querySelectorAll('[data-status]').forEach((x) => x.classList.toggle('is-on', x === b));
    draw();
  });
  const open = (tr) => {
    const o = orders.find((x) => x.id === tr.dataset.id);
    if (o) openOrder(ctx, o, carriers);
  };
  list.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) open(tr); });
  list.addEventListener('keydown', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(tr); }
  });
}

async function openOrder(ctx, order, carriers) {
  const { api } = ctx;
  const o = { ...order };
  const drawer = openDrawer({ title: `Pedido #${o.code}`, wide: true, html: loadingHtml('Cargando pedido…') });
  let items = [];
  try {
    items = await api.list('order_items', { eq: { order_id: o.id } });
  } catch (err) { toastError(err, 'No se pudieron cargar los productos: '); }

  const carrierOpts = carriers
    .filter((c) => c.is_active || c.id === o.carrier_id)
    .map((c) => `<option value="${esc(c.id)}" ${c.id === o.carrier_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');

  drawer.body.innerHTML = `
    <div class="order">
      <div class="order__meta">
        ${statusBadge(o.status)}
        <span class="muted small">Creado el ${esc(fmtDate(o.created_at, true))}${o.updated_at ? ` · actualizado ${esc(fmtDate(o.updated_at, true))}` : ''}</span>
      </div>

      <section class="order__grid">
        <div class="panel">
          <h3>Clienta</h3>
          <dl class="dl">
            <dt>Nombre</dt><dd>${esc(o.customer_name)}</dd>
            <dt>Cédula</dt><dd>${esc(o.customer_id_number || '—')}</dd>
            <dt>Celular</dt><dd>${esc(o.customer_phone)}</dd>
            ${o.customer_email ? `<dt>Correo</dt><dd><a href="mailto:${esc(o.customer_email)}">${esc(o.customer_email)}</a></dd>` : ''}
          </dl>
        </div>
        <div class="panel">
          <h3>Envío</h3>
          <dl class="dl">
            <dt>Departamento</dt><dd>${esc(o.department)}</dd>
            <dt>Ciudad</dt><dd>${esc(o.city)}</dd>
            <dt>Dirección</dt><dd>${esc(o.address)}</dd>
            ${o.address_notes ? `<dt>Indicaciones</dt><dd>${esc(o.address_notes)}</dd>` : ''}
          </dl>
        </div>
      </section>

      <section class="panel">
        <h3>Productos</h3>
        ${items.length ? `
        <div class="table-wrap"><table class="table table--items">
          <thead><tr><th>Producto</th><th>Talla</th><th class="hide-sm">Color</th><th class="num">Cant.</th><th class="num">Valor</th></tr></thead>
          <tbody>${items.map((it) => `
            <tr><td>${esc(it.product_name)}<span class="show-sm muted small">${it.color ? ` · ${esc(it.color)}` : ''}</span></td><td>${esc(it.size)}</td><td class="hide-sm">${esc(it.color || '—')}</td>
            <td class="num">${esc(it.quantity)}</td><td class="num">${cop(it.unit_price * it.quantity)}</td></tr>`).join('')}
          </tbody>
          <tfoot><tr><td colspan="5" class="num">Subtotal <strong>${cop(o.subtotal)}</strong></td></tr></tfoot>
        </table></div>` : '<p class="muted">Sin productos registrados.</p>'}
      </section>

      <form class="form panel" novalidate>
        <h3>Gestión del pedido</h3>
        <div class="grid-2">
          ${fieldHtml('Estado', `<select name="status">${STATUSES.map((s) => `<option value="${s.id}" ${s.id === o.status ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select>`)}
          ${fieldHtml('Transportadora', `<select name="carrier_id"><option value="">Sin asignar</option>${carrierOpts}</select>`)}
          ${fieldHtml('Número de guía', `<input name="tracking_number" value="${esc(o.tracking_number || '')}" autocomplete="off" />`, '', 'field--track')}
          <div class="field"><span>Rastreo</span><div data-track class="track-link"></div></div>
          ${fieldHtml('Costo de envío', moneyInput('shipping_cost', o.shipping_cost, 'Por definir'), 'Déjalo vacío si aún no está cotizado.')}
          ${fieldHtml('Total', `<div class="inline-add">${moneyInput('total', o.total, 'Por definir')}<button type="button" class="btn btn--ghost btn--sm" data-calc title="Subtotal + envío">Calcular</button></div>`)}
        </div>
        ${fieldHtml('Notas internas', `<textarea name="notes" rows="3">${esc(o.notes || '')}</textarea>`)}
        <div class="form__actions">
          <a class="btn btn--wa" data-wa target="_blank" rel="noopener">${icon('wa')}Escribir por WhatsApp</a>
          <button class="btn btn--primary" data-busy="Guardando…">Guardar cambios</button>
        </div>
      </form>
    </div>`;

  const form = drawer.body.querySelector('form');
  const f = form.elements;
  bindMoney(form);
  const carrierById = (id) => carriers.find((c) => c.id === id);

  const refresh = () => {
    const carrier = carrierById(f.carrier_id.value);
    const guia = f.tracking_number.value.trim();
    const link = trackingLink(carrier, guia);
    form.querySelector('[data-track]').innerHTML = link
      ? `<a href="${esc(link)}" target="_blank" rel="noopener">${icon('link')}Abrir rastreo</a>`
      : `<small class="muted">${carrier ? (guia ? 'Esta transportadora no tiene enlace de rastreo.' : 'Escribe el número de guía.') : 'Elige transportadora y guía.'}</small>`;

    const status = f.status.value;
    const lines = [`Hola ${o.customer_name.split(' ')[0]}, te escribimos de isa.`, `Tu pedido #${o.code} está: ${statusLabel(status)}.`];
    if (carrier) lines.push(`Transportadora: ${carrier.name}.`);
    if (guia) lines.push(`Número de guía: ${guia}.`);
    if (link) lines.push(`Puedes rastrearlo aquí: ${link}`);
    const total = parseMoney(f.total.value);
    if (total != null && ['nuevo', 'confirmado'].includes(status)) lines.push(`Total a pagar: ${cop(total)}.`);
    lines.push('¡Gracias por tu compra!');
    const phone = waPhone(o.customer_phone);
    const wa = form.querySelector('[data-wa]');
    wa.href = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
    wa.classList.toggle('is-disabled', !phone);
  };
  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  refresh();

  form.querySelector('[data-calc]').addEventListener('click', () => {
    const ship = parseMoney(f.shipping_cost.value);
    f.total.value = cop((o.subtotal || 0) + (ship || 0));
    if (ship == null) toast('Sin costo de envío: el total es igual al subtotal', 'info');
    refresh();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patch = {
      status: f.status.value,
      carrier_id: f.carrier_id.value || null,
      tracking_number: f.tracking_number.value.trim() || null,
      shipping_cost: parseMoney(f.shipping_cost.value),
      total: parseMoney(f.total.value),
      notes: f.notes.value.trim() || null,
    };
    if (patch.status === 'enviado' && !patch.tracking_number) toast('Recuerda agregar el número de guía', 'info');
    await withBusy(form.querySelector('[data-busy]'), async () => {
      try {
        const saved = await api.update('orders', o.id, patch);
        Object.assign(order, saved);
        toast('Pedido actualizado');
        drawer.close();
        renderOrders(ctx);
      } catch (err) { toastError(err); }
    });
  });
}
