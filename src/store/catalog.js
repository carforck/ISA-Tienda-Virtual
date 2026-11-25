// Capa de datos de la tienda: Supabase si está configurado, catálogo local (src/data.js) si no.
// Ambas fuentes se normalizan a la misma forma:
//   settings:    { whatsapp, freeShippingFrom, shippingCost, leadTimeDays, orderNote }
//   collections: [{ id, dbId, name, season, description, cover, featured }]
//   categories:  [{ id, dbId, name, img }]                        (id = slug)
//   products:    [{ id, dbId, slug, name, description, material, price, compareAt, sizes[], colors[],
//                   tag, category, collection, leadTimeDays, images[{url, alt}], img, specs[{label, value}] }]
//   carriers:    [{ id, name }]                                   (id = uuid o null en local)
import { supabase, hasSupabase, publicImageUrl } from '../lib/supabase.js';
import * as local from '../data.js';
import { slugify } from './util.js';

const DEFAULT_SETTINGS = {
  whatsapp: local.WHATSAPP,
  freeShippingFrom: null,
  shippingCost: null,
  leadTimeDays: null,
  orderNote: 'Todos nuestros productos son bajo pedido. Te confirmamos talla, disponibilidad y costo de envío por WhatsApp.',
};

const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const cleanSpecs = (specs) =>
  (Array.isArray(specs) ? specs : [])
    .map((s) => ({ label: String(s?.label ?? '').trim(), value: String(s?.value ?? '').trim() }))
    .filter((s) => s.label && s.value);

function fromLocal() {
  const products = local.products.map((p, i) => ({
    id: p.id,
    dbId: null,
    slug: p.slug || slugify(p.name),
    name: p.name,
    description: p.description || '',
    material: p.material || '',
    price: p.price,
    compareAt: p.compareAt ?? null,
    sizes: Array.isArray(p.sizes) ? p.sizes.map(String) : [],
    colors: p.colors || [],
    tag: p.tag || '',
    category: p.cat,
    collection: p.collection || null,
    leadTimeDays: null,
    images: (p.images || [p.img]).map((url) => ({ url, alt: p.name })),
    img: p.images?.[0] || p.img,
    specs: cleanSpecs(p.specs),
    order: i,
  }));
  return {
    source: 'local',
    settings: { ...DEFAULT_SETTINGS },
    collections: local.collections.map((c) => ({ ...c, dbId: null })),
    categories: local.categories.map((c) => ({ ...c, dbId: null })),
    products,
    carriers: local.carriers.map((name) => ({ id: null, name })),
  };
}

const today = () => new Date().toISOString().slice(0, 10);
const inSeason = (c) => (!c.starts_on || c.starts_on <= today()) && (!c.ends_on || c.ends_on >= today());

async function fromSupabase() {
  const [settingsR, colR, catR, prodR, carR] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('collections')
      .select('id, name, slug, season, description, cover_path, starts_on, ends_on, is_featured, sort_order')
      .eq('is_active', true).order('is_featured', { ascending: false }).order('sort_order'),
    supabase.from('categories').select('id, name, slug, image_path, sort_order').eq('is_active', true).order('sort_order'),
    supabase.from('products').select('*, product_images (path, alt, sort_order)')
      .eq('is_active', true).order('sort_order').order('created_at', { ascending: false }),
    supabase.from('carriers').select('id, name, sort_order').eq('is_active', true).order('sort_order'),
  ]);
  // Sin productos o categorías no hay tienda: se usa el respaldo local
  if (prodR.error) throw prodR.error;
  if (catR.error) throw catR.error;

  const s = settingsR.data || {};
  const settings = {
    whatsapp: s.whatsapp || DEFAULT_SETTINGS.whatsapp,
    freeShippingFrom: num(s.free_shipping_from),
    shippingCost: num(s.default_shipping_cost),
    leadTimeDays: num(s.default_lead_time_days),
    orderNote: s.order_note || DEFAULT_SETTINGS.orderNote,
  };

  const catById = new Map(catR.data.map((c) => [c.id, c.slug]));
  const cols = (colR.error ? [] : colR.data).filter(inSeason);
  const colById = new Map(cols.map((c) => [c.id, c.slug]));

  const products = prodR.data.map((p, i) => {
    const images = [...(p.product_images || [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((im) => ({ url: publicImageUrl(im.path), alt: im.alt || p.name }))
      .filter((im) => im.url);
    return {
      id: p.id,
      dbId: p.id,
      slug: p.slug || slugify(p.name),
      name: p.name,
      description: p.description || '',
      material: p.material || '',
      price: p.price,
      compareAt: num(p.compare_at_price),
      sizes: (p.sizes || []).map(String),
      colors: p.colors || [],
      tag: p.tag || '',
      category: catById.get(p.category_id) || null,
      collection: colById.get(p.collection_id) || null,
      leadTimeDays: num(p.lead_time_days) ?? settings.leadTimeDays,
      images,
      img: images[0]?.url || '',
      specs: cleanSpecs(p.specs),
      order: i,
    };
  });

  const firstImg = (key, val) => products.find((p) => p[key] === val && p.img)?.img || '';
  const categories = catR.data.map((c) => ({
    id: c.slug, dbId: c.id, name: c.name,
    img: publicImageUrl(c.image_path) || firstImg('category', c.slug),
  }));
  const collections = cols.map((c) => ({
    id: c.slug, dbId: c.id, name: c.name, season: c.season || '', description: c.description || '',
    cover: publicImageUrl(c.cover_path) || firstImg('collection', c.slug),
    featured: c.is_featured,
  }));
  const carriers = carR.error || !carR.data.length
    ? local.carriers.map((name) => ({ id: null, name }))
    : carR.data.map((c) => ({ id: c.id, name: c.name }));

  return { source: 'supabase', settings, collections, categories, products, carriers };
}

let cached;
export function loadCatalog() {
  if (!cached) {
    cached = (hasSupabase ? fromSupabase() : Promise.resolve(fromLocal())).catch((err) => {
      console.warn('[isa] No se pudo cargar el catálogo desde Supabase; se usa el catálogo local.', err);
      return fromLocal();
    });
  }
  return cached;
}

export const findProduct = (catalog, id) => catalog.products.find((p) => p.id === id);
