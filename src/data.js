// Catálogo local de respaldo: se usa cuando no hay Supabase configurado (o si falla la conexión).
// Fotos reales; precios y tallas son de ejemplo hasta confirmar.
// Las especificaciones técnicas (specs) quedan vacías a propósito: no se inventan datos de producto.
export const WHATSAPP = '573015928067';

export const categories = [
  { id: 'tacones', name: 'Tacones', img: '/products/08-pump-negro-charol.jpg' },
  { id: 'slingbacks', name: 'Slingbacks', img: '/products/09-tacon-noche.jpg' },
  { id: 'plataformas', name: 'Plataformas', img: '/products/12-alpargata-plata.jpg' },
  { id: 'planos', name: 'Planos', img: '/products/05-baleta-gemas.jpg' },
];

// MUESTRA: colección de ejemplo para el modo sin Supabase. Las colecciones reales se crean en el panel.
export const collections = [
  {
    id: 'esencia',
    name: 'Colección Esencia',
    season: 'Temporada actual',
    description: 'Tacones, slingbacks, plataformas y planos con diseño atemporal: piezas pensadas para acompañarte de la oficina a la noche.',
    cover: '/products/07-pump-nude.jpg',
    featured: true,
    sample: true,
  },
];

// Transportadoras con las que se puede despachar (preferencia de la clienta, no compromiso de servicio)
export const carriers = ['Servientrega', 'Coordinadora', 'Interrapidísimo', 'Envía', 'TCC'];

const p = (n, slug) => `/products/${String(n).padStart(2, '0')}-${slug}.jpg`;
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
const S35_40 = range(35, 40);
const S35_39 = range(35, 39);

export const products = [
  { id: 'p06', cat: 'tacones', collection: 'esencia', name: 'Stiletto Dorado', material: 'Metalizado', sizes: S35_40, price: 219000, tag: 'Nuevo', img: p(6, 'stiletto-dorado') },
  { id: 'p01', cat: 'slingbacks', collection: 'esencia', name: 'Slingback Celeste', material: 'Cuero', sizes: S35_39, price: 189000, tag: 'Nuevo', img: p(1, 'slingback-celeste') },
  { id: 'p07', cat: 'tacones', collection: 'esencia', name: 'Pump Nude', material: 'Charol', sizes: S35_40, price: 199000, tag: 'Top', img: p(7, 'pump-nude') },
  { id: 'p11', cat: 'plataformas', collection: 'esencia', name: 'Plataforma Dorada', material: 'Yute y metalizado', sizes: S35_40, price: 179000, img: p(11, 'plataforma-dorada') },
  { id: 'p04', cat: 'slingbacks', collection: 'esencia', name: 'Slingback Hebillas Vino', material: 'Cuero', sizes: S35_39, price: 209000, img: p(4, 'slingback-hebillas-vino') },
  { id: 'p08', cat: 'tacones', collection: 'esencia', name: 'Pump Negro Charol', material: 'Charol', sizes: S35_40, price: 199000, img: p(8, 'pump-negro-charol') },
  { id: 'p05', cat: 'planos', collection: 'esencia', name: 'Baleta Gemas', material: 'Cuero calado', sizes: S35_40, price: 159000, tag: 'Nuevo', img: p(5, 'baleta-gemas') },
  { id: 'p02', cat: 'tacones', collection: 'esencia', name: 'Mule Rubí', material: 'Glitter', sizes: S35_39, price: 189000, img: p(2, 'mule-rubi') },
  { id: 'p09', cat: 'slingbacks', collection: 'esencia', name: 'Tacón Noche', material: 'Cuero', sizes: S35_40, price: 199000, img: p(9, 'tacon-noche') },
  { id: 'p10', cat: 'tacones', collection: 'esencia', name: 'Stiletto Bronce', material: 'Metalizado', sizes: S35_40, price: 219000, img: p(10, 'stiletto-bronce') },
  { id: 'p03', cat: 'slingbacks', collection: 'esencia', name: 'Slingback Violeta', material: 'Satín', sizes: S35_39, price: 189000, img: p(3, 'slingback-violeta') },
  { id: 'p12', cat: 'plataformas', collection: 'esencia', name: 'Alpargata Plata', material: 'Yute y metalizado', sizes: S35_40, price: 179000, img: p(12, 'alpargata-plata') },
];
