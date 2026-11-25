// Catálogo — fotos reales; precios y tallas son de ejemplo hasta confirmar
export const WHATSAPP = '573015928067';

export const categories = [
  { id: 'tacones', name: 'Tacones', img: '/products/08-pump-negro-charol.jpg' },
  { id: 'slingbacks', name: 'Slingbacks', img: '/products/09-tacon-noche.jpg' },
  { id: 'plataformas', name: 'Plataformas', img: '/products/12-alpargata-plata.jpg' },
  { id: 'planos', name: 'Planos', img: '/products/05-baleta-gemas.jpg' },
];

const p = (n, slug) => `/products/${String(n).padStart(2, '0')}-${slug}.jpg`;

export const products = [
  { id: 'p06', cat: 'tacones', name: 'Stiletto Dorado', material: 'Metalizado', sizes: '35–40', price: 219000, tag: 'Nuevo', img: p(6, 'stiletto-dorado') },
  { id: 'p01', cat: 'slingbacks', name: 'Slingback Celeste', material: 'Cuero', sizes: '35–39', price: 189000, tag: 'Nuevo', img: p(1, 'slingback-celeste') },
  { id: 'p07', cat: 'tacones', name: 'Pump Nude', material: 'Charol', sizes: '35–40', price: 199000, tag: 'Top', img: p(7, 'pump-nude') },
  { id: 'p11', cat: 'plataformas', name: 'Plataforma Dorada', material: 'Yute y metalizado', sizes: '35–40', price: 179000, img: p(11, 'plataforma-dorada') },
  { id: 'p04', cat: 'slingbacks', name: 'Slingback Hebillas Vino', material: 'Cuero', sizes: '35–39', price: 209000, img: p(4, 'slingback-hebillas-vino') },
  { id: 'p08', cat: 'tacones', name: 'Pump Negro Charol', material: 'Charol', sizes: '35–40', price: 199000, img: p(8, 'pump-negro-charol') },
  { id: 'p05', cat: 'planos', name: 'Baleta Gemas', material: 'Cuero calado', sizes: '35–40', price: 159000, tag: 'Nuevo', img: p(5, 'baleta-gemas') },
  { id: 'p02', cat: 'tacones', name: 'Mule Rubí', material: 'Glitter', sizes: '35–39', price: 189000, img: p(2, 'mule-rubi') },
  { id: 'p09', cat: 'slingbacks', name: 'Tacón Noche', material: 'Cuero', sizes: '35–40', price: 199000, img: p(9, 'tacon-noche') },
  { id: 'p10', cat: 'tacones', name: 'Stiletto Bronce', material: 'Metalizado', sizes: '35–40', price: 219000, img: p(10, 'stiletto-bronce') },
  { id: 'p03', cat: 'slingbacks', name: 'Slingback Violeta', material: 'Satín', sizes: '35–39', price: 189000, img: p(3, 'slingback-violeta') },
  { id: 'p12', cat: 'plataformas', name: 'Alpargata Plata', material: 'Yute y metalizado', sizes: '35–40', price: 179000, img: p(12, 'alpargata-plata') },
];
