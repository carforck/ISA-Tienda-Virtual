// Modo demo SOLO para desarrollo (admin.html?demo=1 con `vite dev`).
// Datos en memoria para revisar la interfaz sin backend. No se incluye en el build.
import { toast } from './ui.js';

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function seed() {
  const col = [
    { id: uid(), name: 'Otoño 2026', slug: 'otono-2026', season: 'Otoño', description: 'Tonos tierra, charol y terciopelo.', cover_path: '/products/04-slingback-hebillas-vino.jpg', starts_on: '2026-09-01', ends_on: '2026-11-30', is_active: true, is_featured: true, sort_order: 1, created_at: now() },
    { id: uid(), name: 'Navidad 2026', slug: 'navidad-2026', season: 'Fin de año', description: 'Brillos dorados para las fiestas.', cover_path: '/products/06-stiletto-dorado.jpg', starts_on: '2026-12-01', ends_on: '2027-01-10', is_active: false, is_featured: false, sort_order: 2, created_at: now() },
  ];
  const cat = [
    { id: uid(), name: 'Tacones', slug: 'tacones', image_path: '/products/08-pump-negro-charol.jpg', is_active: true, sort_order: 1, created_at: now() },
    { id: uid(), name: 'Slingbacks', slug: 'slingbacks', image_path: '/products/09-tacon-noche.jpg', is_active: true, sort_order: 2, created_at: now() },
    { id: uid(), name: 'Plataformas', slug: 'plataformas', image_path: '/products/12-alpargata-plata.jpg', is_active: true, sort_order: 3, created_at: now() },
    { id: uid(), name: 'Planos', slug: 'planos', image_path: '/products/05-baleta-gemas.jpg', is_active: false, sort_order: 4, created_at: now() },
  ];
  const files = ['01-slingback-celeste', '02-mule-rubi', '03-slingback-violeta', '06-stiletto-dorado', '07-pump-nude', '11-plataforma-dorada'];
  const names = ['Slingback Celeste', 'Mule Rubí', 'Slingback Violeta', 'Stiletto Dorado', 'Pump Nude', 'Plataforma Dorada'];
  const products = names.map((name, i) => ({
    id: uid(), name, slug: files[i].slice(3), description: 'Diseño elegante, hecho bajo pedido.', material: 'Cuero sintético',
    price: 189000 + i * 15000, compare_at_price: i === 1 ? 249000 : null, sizes: ['35', '36', '37', '38', '39'], colors: ['Negro', 'Nude'],
    tag: i === 0 ? 'Nuevo' : i === 3 ? 'Top' : null, category_id: cat[i % 3].id, collection_id: col[i % 2].id,
    lead_time_days: 8, is_active: i !== 5, sort_order: i + 1, created_at: now(), updated_at: now(),
    specs: [{ label: 'Altura del tacón', value: `${7 + (i % 3)} cm` }, { label: 'Hecho en', value: 'Colombia' }],
  }));
  const images = products.map((p, i) => ({ id: uid(), product_id: p.id, path: `/products/${files[i]}.jpg`, alt: p.name, sort_order: 0 }));
  const carriers = [
    ['Servientrega', 'https://www.servientrega.com/wps/portal/rastreo-envio?guia={guia}'],
    ['Coordinadora', 'https://coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia={guia}'],
    ['Interrapidísimo', 'https://www.interrapidisimo.com/sigue-tu-envio/?guia={guia}'],
    ['Envía', 'https://envia.co/rastreo?guia={guia}'],
    ['TCC', 'https://tcc.com.co/rastreo/?guia={guia}'],
  ].map(([name, tracking_url], i) => ({ id: uid(), name, tracking_url, is_active: true, sort_order: i + 1 }));
  const orders = [
    { code: 'A3F9C1', status: 'nuevo', customer_name: 'María Fernanda López', customer_id_number: '1020456789', customer_phone: '3015551234', customer_email: 'mafe@example.com', department: 'Antioquia', city: 'Medellín', address: 'Cra 43A # 1-50, apto 802', address_notes: 'Portería 24h', carrier_id: null, tracking_number: null, subtotal: 189000, shipping_cost: null, total: null, notes: null },
    { code: 'B71D20', status: 'enviado', customer_name: 'Laura Gómez', customer_id_number: '52123456', customer_phone: '3109876543', customer_email: null, department: 'Bogotá D.C.', city: 'Bogotá', address: 'Calle 93 # 11-20', address_notes: null, carrier_id: carriers[0].id, tracking_number: '2045678901', subtotal: 398000, shipping_cost: 15000, total: 413000, notes: 'Cliente pidió empaque de regalo' },
  ].map((o, i) => ({ id: uid(), created_at: new Date(Date.now() - i * 86400000 * 2).toISOString(), updated_at: now(), ...o }));
  const items = [
    { id: uid(), order_id: orders[0].id, product_id: products[0].id, product_name: 'Slingback Celeste', size: '37', color: 'Celeste', quantity: 1, unit_price: 189000 },
    { id: uid(), order_id: orders[1].id, product_id: products[1].id, product_name: 'Mule Rubí', size: '36', color: null, quantity: 2, unit_price: 199000 },
  ];
  return {
    admins: [], collections: col, categories: cat, products, product_images: images, carriers,
    store_settings: [{ id: 1, whatsapp: '573015928067', free_shipping_from: null, default_shipping_cost: null, default_lead_time_days: 8, order_note: 'Todos nuestros productos se elaboran o consiguen bajo pedido. Te confirmamos talla, disponibilidad y costo de envío por WhatsApp.' }],
    orders, order_items: items,
  };
}

export function createDemoApi() {
  const db = seed();
  const blobs = new Map();
  const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 120));
  const find = (table, id) => db[table].find((r) => r.id === id);
  // El demo arranca con sesión iniciada; al cerrar sesión se ve el login.
  let user = { id: 'demo', email: 'demo@isa.co' };
  const listeners = [];

  return {
    demo: true,
    async getUser() { return user; },
    onAuthChange(cb) { listeners.push(cb); },
    async signIn(email) {
      user = { id: 'demo', email: email || 'demo@isa.co' };
      listeners.forEach((cb) => cb('SIGNED_IN', user));
      return user;
    },
    async signOut() { user = null; listeners.forEach((cb) => cb('SIGNED_OUT', null)); },
    async isAdmin() { return true; },

    async list(table, opts = {}) {
      let rows = db[table].filter((r) => Object.entries(opts.eq || {}).every(([k, v]) => r[k] === v));
      if (opts.in) rows = rows.filter((r) => opts.in[1].includes(r[opts.in[0]]));
      for (const [col, asc] of [...(opts.order || [])].reverse()) {
        rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
      }
      return wait(rows);
    },
    async get(table, id) { return wait(find(table, id) ?? null); },
    async insert(table, row) {
      const r = { id: uid(), created_at: now(), ...structuredClone(row) };
      if (table === 'orders') r.code ??= Math.random().toString(16).slice(2, 8).toUpperCase();
      if (table === 'products') r.specs ??= [];
      db[table].push(r);
      return wait(r);
    },
    async insertMany(table, rows) { return Promise.all(rows.map((r) => this.insert(table, r))); },
    async update(table, id, patch) {
      const r = find(table, id);
      if (!r) throw new Error('Registro no encontrado');
      Object.assign(r, structuredClone(patch));
      return wait(r);
    },
    async remove(table, id) {
      db[table] = db[table].filter((r) => r.id !== id);
      if (table === 'products') db.product_images = db.product_images.filter((r) => r.product_id !== id);
      if (table === 'orders') db.order_items = db.order_items.filter((r) => r.order_id !== id);
      for (const t of ['products']) for (const r of db[t]) {
        if (table === 'collections' && r.collection_id === id) r.collection_id = null;
        if (table === 'categories' && r.category_id === id) r.category_id = null;
      }
      return wait(null);
    },
    async count(table, eq = {}) { return (await this.list(table, { eq })).length; },
    async upload(path, blob) {
      blobs.set(path, URL.createObjectURL(blob));
      toast(`Demo: imagen procesada (${Math.round(blob.size / 1024)} KB, ${blob.type})`, 'info');
      return path;
    },
    async copyFile(from, to) { blobs.set(to, blobs.get(from)); return to; },
    async removeFiles() {},
    imageUrl: (path) => (!path ? '' : blobs.get(path) || path),
  };
}
