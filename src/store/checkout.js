// Checkout bajo pedido: formulario de datos + envío, registro en Supabase (create_order) si existe
// y mensaje de WhatsApp con el detalle del pedido.
import { supabase, hasSupabase } from '../lib/supabase.js';
import { $, esc, money, waLink, waIcon } from './util.js';
import { cart, shippingInfo, closeCart, openCart } from './cart.js';
import { DEPARTMENTS } from './colombia.js';

const FIELDS = [
  { name: 'name', label: 'Nombre completo', autocomplete: 'name', required: true, max: 120 },
  { name: 'id_number', label: 'Cédula', inputmode: 'numeric', autocomplete: 'off', required: true, max: 15, hint: 'La transportadora la solicita para la guía.' },
  { name: 'phone', label: 'Celular', type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', required: true, max: 20, placeholder: '300 123 4567' },
  { name: 'email', label: 'Correo electrónico', type: 'email', autocomplete: 'email', optional: true, max: 120 },
];

const validators = {
  name: (v) => (v.length < 5 || v.split(/\s+/).length < 2 ? 'Escribe tu nombre y apellido.' : ''),
  id_number: (v) => (/^\d{5,10}$/.test(v.replace(/[.\s-]/g, '')) ? '' : 'Escribe tu número de cédula, solo números (5 a 10 dígitos).'),
  phone: (v) => (normPhone(v) ? '' : 'Escribe un celular colombiano de 10 dígitos que empiece por 3 (ej. 300 123 4567).'),
  email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Revisa tu correo electrónico (ej. nombre@correo.com).'),
  department: (v) => (DEPARTMENTS[v] ? '' : 'Elige tu departamento.'),
  city: (v) => (v.length >= 3 ? '' : 'Escribe tu ciudad o municipio.'),
  address: (v) => (v.length >= 6 ? '' : 'Escribe la dirección completa de entrega.'),
};

function normPhone(v) {
  let d = String(v).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
  return /^3\d{9}$/.test(d) ? d : '';
}
const fmtPhone = (d) => `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;

const input = (f) => `
  <div class="field" data-field="${f.name}">
    <label for="co-${f.name}">${f.label}${f.optional ? ' <span class="field__opt">(opcional)</span>' : ''}</label>
    <input id="co-${f.name}" name="${f.name}" type="${f.type || 'text'}" maxlength="${f.max}"
      ${f.inputmode ? `inputmode="${f.inputmode}"` : ''} autocomplete="${f.autocomplete}"
      ${f.placeholder ? `placeholder="${f.placeholder}"` : ''} ${f.required ? 'required aria-required="true"' : ''}
      aria-describedby="co-${f.name}-err${f.hint ? ` co-${f.name}-hint` : ''}" />
    ${f.hint ? `<small class="field__hint" id="co-${f.name}-hint">${f.hint}</small>` : ''}
    <small class="field__error" id="co-${f.name}-err" aria-live="polite"></small>
  </div>`;

function dialogHtml(catalog) {
  const deps = Object.keys(DEPARTMENTS).map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
  const carriers = catalog.carriers.map((c) => `<option value="${esc(c.id || c.name)}">${esc(c.name)}</option>`).join('');
  return `
  <dialog class="modal checkout" data-checkout aria-labelledby="co-title">
    <div class="modal__head">
      <h2 id="co-title">Finaliza tu pedido</h2>
      <button type="button" class="icon-btn" aria-label="Cerrar" data-co-close>
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </div>
    <form class="checkout__grid" data-co-form novalidate>
      <div class="checkout__form">
        <p class="checkout__intro"><strong>Producto bajo pedido.</strong> <span data-co-note></span></p>
        <fieldset>
          <legend>Tus datos</legend>
          <div class="field-grid">${FIELDS.map(input).join('')}</div>
        </fieldset>
        <fieldset>
          <legend>Datos de envío</legend>
          <div class="field-grid">
            <div class="field" data-field="department">
              <label for="co-department">Departamento</label>
              <select id="co-department" name="department" required aria-required="true" autocomplete="address-level1" aria-describedby="co-department-err">
                <option value="">Selecciona…</option>${deps}
              </select>
              <small class="field__error" id="co-department-err" aria-live="polite"></small>
            </div>
            <div class="field" data-field="city">
              <label for="co-city">Ciudad o municipio</label>
              <input id="co-city" name="city" list="co-city-list" maxlength="80" required aria-required="true" autocomplete="address-level2" aria-describedby="co-city-err" />
              <datalist id="co-city-list"></datalist>
              <small class="field__error" id="co-city-err" aria-live="polite"></small>
            </div>
            <div class="field field--wide" data-field="address">
              <label for="co-address">Dirección</label>
              <input id="co-address" name="address" maxlength="160" required aria-required="true" autocomplete="street-address" placeholder="Ej. Calle 10 # 20-30, apto 401" aria-describedby="co-address-err" />
              <small class="field__error" id="co-address-err" aria-live="polite"></small>
            </div>
            <div class="field field--wide" data-field="address_notes">
              <label for="co-address_notes">Barrio e indicaciones <span class="field__opt">(opcional)</span></label>
              <input id="co-address_notes" name="address_notes" maxlength="160" placeholder="Barrio, conjunto, torre, punto de referencia" />
            </div>
            <div class="field field--wide" data-field="carrier">
              <label for="co-carrier">Transportadora preferida <span class="field__opt">(opcional)</span></label>
              <select id="co-carrier" name="carrier" aria-describedby="co-carrier-hint">
                <option value="">Sin preferencia</option>${carriers}
              </select>
              <small class="field__hint" id="co-carrier-hint">Te confirmamos por WhatsApp la transportadora y el costo según tu ciudad.</small>
            </div>
          </div>
        </fieldset>
        <div class="field" data-field="notes">
          <label for="co-notes">Notas del pedido <span class="field__opt">(opcional)</span></label>
          <textarea id="co-notes" name="notes" rows="3" maxlength="500" placeholder="¿Algo que debamos saber? Ej. horario para recibir, dudas de talla…"></textarea>
        </div>
      </div>
      <aside class="checkout__summary" aria-labelledby="co-sum-title">
        <h3 id="co-sum-title">Resumen</h3>
        <div class="summary__items" data-co-items></div>
        <dl class="summary__totals" data-co-totals></dl>
        <div class="form-alert" role="alert" data-co-alert hidden></div>
        <button type="submit" class="btn btn--wa btn--block" data-co-submit><span class="btn__icon">${waIcon}</span><span data-co-submit-label>Confirmar pedido</span></button>
        <p class="summary__fine">Al confirmar se abrirá WhatsApp con el detalle de tu pedido para coordinar talla, disponibilidad, envío y pago.</p>
        <button type="button" class="link-btn" data-co-back>← Volver al carrito</button>
      </aside>
    </form>
    <div class="checkout__done" data-co-done hidden tabindex="-1"></div>
  </dialog>`;
}

function buildMessage({ code, items, subtotal, ship, data, carrierName }) {
  const L = [];
  L.push('Hola isa, quiero hacer este pedido (bajo pedido):');
  if (code) L.push(`*Código de pedido:* ${code}`);
  L.push('', '*Productos*');
  items.forEach((l) => L.push(`• ${l.qty} x ${l.product.name} — Talla ${l.size}${l.color ? ` — ${l.color}` : ''} — ${money(l.total)}`));
  L.push('', `*Subtotal:* ${money(subtotal)}`);
  L.push(`*Envío:* ${ship.label}`);
  if (ship.cost != null) L.push(`*Total:* ${money(subtotal + ship.cost)}`);
  L.push('', '*Mis datos*');
  L.push(`Nombre: ${data.name}`, `Cédula: ${data.id_number}`, `Celular: ${fmtPhone(data.phone)}`);
  if (data.email) L.push(`Correo: ${data.email}`);
  L.push('', '*Envío*', `Departamento: ${data.department}`, `Ciudad: ${data.city}`, `Dirección: ${data.address}`);
  if (data.address_notes) L.push(`Barrio / indicaciones: ${data.address_notes}`);
  L.push(`Transportadora preferida: ${carrierName || 'Sin preferencia'}`);
  if (data.notes) L.push('', `*Notas:* ${data.notes}`);
  return L.join('\n');
}

export function mountCheckout(catalog) {
  const { settings } = catalog;
  document.body.insertAdjacentHTML('beforeend', dialogHtml(catalog));
  const dlg = $('[data-checkout]');
  const form = $('[data-co-form]', dlg);
  const done = $('[data-co-done]', dlg);
  const alertBox = $('[data-co-alert]', dlg);
  const submitBtn = $('[data-co-submit]', dlg);
  const submitLabel = $('[data-co-submit-label]', dlg);
  $('[data-co-note]', dlg).textContent = settings.orderNote;
  let busy = false;

  const renderSummary = () => {
    const items = cart.items();
    const subtotal = cart.subtotal();
    const ship = shippingInfo(settings, subtotal);
    $('[data-co-items]', dlg).innerHTML = items.map((l) => `
      <div class="summary__item">
        <img src="${esc(l.product.img)}" alt="" />
        <div><strong>${esc(l.product.name)}</strong><small>Talla ${esc(l.size)}${l.color ? ` · ${esc(l.color)}` : ''} · Cant. ${l.qty}</small></div>
        <span>${money(l.total)}</span>
      </div>`).join('');
    $('[data-co-totals]', dlg).innerHTML = `
      <div><dt>Subtotal</dt><dd>${money(subtotal)}</dd></div>
      <div><dt>Envío</dt><dd>${esc(ship.label)}</dd></div>
      ${ship.cost != null ? `<div class="summary__total"><dt>Total</dt><dd>${money(subtotal + ship.cost)}</dd></div>` : ''}`;
  };

  const fieldEl = (name) => form.elements[name];
  const setError = (name, msg) => {
    const el = fieldEl(name);
    const err = $(`#co-${name}-err`, dlg);
    if (!el || !err) return;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    err.textContent = msg;
  };
  const read = () => {
    const v = (n) => String(fieldEl(n)?.value ?? '').trim().replace(/\s+/g, ' ');
    return {
      name: v('name'), id_number: v('id_number').replace(/[.\s-]/g, ''), phone: v('phone'), email: v('email').toLowerCase(),
      department: v('department'), city: v('city'), address: v('address'), address_notes: v('address_notes'),
      carrier: v('carrier'), notes: String(fieldEl('notes').value).trim(),
    };
  };
  const validate = (only) => {
    const data = read();
    let firstBad = null;
    for (const [name, fn] of Object.entries(validators)) {
      if (only && only !== name) continue;
      const msg = fn(data[name]);
      setError(name, msg);
      if (msg && !firstBad) firstBad = name;
    }
    return { data, firstBad };
  };

  // Ciudades sugeridas según el departamento
  fieldEl('department').addEventListener('change', (e) => {
    const cities = DEPARTMENTS[e.target.value] || [];
    $('#co-city-list', dlg).innerHTML = cities.map((c) => `<option value="${esc(c)}"></option>`).join('');
    if (e.target.value === 'Bogotá D.C.' && !fieldEl('city').value) fieldEl('city').value = 'Bogotá';
  });
  // Tras el primer intento, cada campo se valida al editarlo
  form.addEventListener('input', (e) => { if (form.dataset.tried && validators[e.target.name]) validate(e.target.name); });
  form.addEventListener('change', (e) => { if (form.dataset.tried && validators[e.target.name]) validate(e.target.name); });
  form.addEventListener('focusout', (e) => {
    const n = e.target.name;
    if (validators[n] && e.target.value.trim()) validate(n);
  });

  const setBusy = (b, label) => {
    busy = b;
    submitBtn.disabled = b;
    submitBtn.setAttribute('aria-busy', String(b));
    submitLabel.textContent = label || 'Confirmar pedido';
  };
  const showAlert = (html) => { alertBox.innerHTML = html; alertBox.hidden = !html; };

  const finish = ({ code, url }) => {
    form.hidden = true;
    done.hidden = false;
    $('#co-title', dlg).textContent = code ? '¡Pedido registrado!' : '¡Ya casi!';
    done.innerHTML = `
      <div class="done__icon" aria-hidden="true">✓</div>
      ${code
        ? `<p class="done__lead">Tu código de pedido es</p><p class="done__code">${esc(code)}</p>
           <p>Envíanos el pedido por WhatsApp para confirmarlo. Allí te confirmamos talla, disponibilidad, costo de envío y forma de pago.</p>`
        : `<p class="done__lead">Abrimos WhatsApp con el detalle de tu pedido.</p>
           <p>Envía el mensaje para confirmarlo. Allí te confirmamos talla, disponibilidad, costo de envío y forma de pago. Si WhatsApp no se abrió, toca el botón.</p>`}
      <a class="btn btn--wa btn--block" href="${esc(url)}" target="_blank" rel="noopener"><span class="btn__icon">${waIcon}</span>Enviar pedido por WhatsApp</a>
      <button type="button" class="btn btn--ghost btn--block" data-co-close>Seguir comprando</button>`;
    done.focus();
  };

  const sendViaWhatsapp = (code, payload) => {
    const url = waLink(buildMessage({ code, ...payload }));
    cart.clear();
    finish({ code, url });
    window.open(url, '_blank', 'noopener');
  };

  let lastPayload = null;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy || form.hidden) return;
    form.dataset.tried = '1';
    showAlert('');
    const { data, firstBad } = validate();
    if (firstBad) {
      showAlert('Revisa los campos marcados para continuar.');
      fieldEl(firstBad).focus();
      return;
    }
    const items = cart.items();
    if (!items.length) { showAlert('Tu carrito está vacío.'); return; }
    data.phone = normPhone(data.phone);
    const carrier = catalog.carriers.find((c) => (c.id || c.name) === data.carrier);
    const subtotal = cart.subtotal();
    const payload = { items, subtotal, ship: shippingInfo(settings, subtotal), data, carrierName: carrier?.name || '' };
    lastPayload = payload;

    // Con Supabase el pedido queda registrado (y el precio lo calcula la base de datos)
    if (hasSupabase && catalog.source === 'supabase') {
      setBusy(true, 'Registrando pedido…');
      try {
        const notes = [data.notes, !carrier?.id && carrier ? `Transportadora preferida: ${carrier.name}` : ''].filter(Boolean).join('\n') || null;
        const { data: res, error } = await supabase.rpc('create_order', {
          p_customer: {
            name: data.name, id_number: data.id_number, phone: data.phone, email: data.email || null,
            department: data.department, city: data.city, address: data.address, address_notes: data.address_notes || null,
          },
          p_items: items.map((l) => ({ product_id: l.product.dbId, product_name: l.product.name, size: l.size, color: l.color || null, quantity: l.qty })),
          p_carrier_id: carrier?.id || null,
          p_notes: notes,
        });
        if (error) throw error;
        const row = Array.isArray(res) ? res[0] : res;
        if (!row?.order_code) throw new Error('Respuesta sin código de pedido');
        if (Number.isFinite(row.order_subtotal)) {
          payload.subtotal = row.order_subtotal;
          payload.ship = shippingInfo(settings, row.order_subtotal);
        }
        setBusy(false);
        sendViaWhatsapp(row.order_code, payload);
      } catch (err) {
        console.error('[isa] create_order', err);
        setBusy(false);
        showAlert(`No pudimos registrar tu pedido en este momento. Puedes enviarlo directamente por WhatsApp.
          <button type="button" class="link-btn" data-co-fallback>Enviar por WhatsApp sin código</button>`);
      }
      return;
    }
    setBusy(true, 'Abriendo WhatsApp…');
    sendViaWhatsapp(null, payload);
    setBusy(false);
  });

  const reset = () => {
    form.hidden = false;
    done.hidden = true;
    done.innerHTML = '';
    $('#co-title', dlg).textContent = 'Finaliza tu pedido';
    showAlert('');
  };

  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-co-close]')) dlg.close();
    if (e.target.closest('[data-co-back]')) { dlg.close(); openCart(); }
    if (e.target.closest('[data-co-fallback]') && lastPayload) sendViaWhatsapp(null, lastPayload);
  });
  dlg.addEventListener('cancel', (e) => { if (busy) e.preventDefault(); });
  dlg.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    if (!done.hidden) reset();
  });

  const open = () => {
    if (!cart.count()) return;
    reset();
    renderSummary();
    closeCart({ restoreFocus: false });
    document.body.classList.add('modal-open');
    dlg.showModal();
    dlg.scrollTop = 0;
    fieldEl('name').focus({ preventScroll: true });
  };
  cart.onChange(() => { if (dlg.open && form.hidden === false) renderSummary(); });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-checkout-open]')) open(); });
}
