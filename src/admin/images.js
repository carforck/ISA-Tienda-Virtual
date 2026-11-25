// Redimensiona imágenes en el navegador antes de subirlas.
import { slugify } from './ui.js';

const MAX = 1400;
const QUALITY = 0.82;

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* se intenta con <img> */ }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = URL.createObjectURL(file);
  });
}

const toBlob = (canvas, type) => new Promise((r) => canvas.toBlob(r, type, QUALITY));

/** Devuelve un Blob WebP (o JPEG si el navegador no codifica WebP) de máx. 1400 px. */
export async function resizeImage(file) {
  if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" no es una imagen.`);
  const bmp = await loadBitmap(file);
  const w0 = bmp.width, h0 = bmp.height;
  const scale = Math.min(1, MAX / Math.max(w0, h0));
  const w = Math.round(w0 * scale), h = Math.round(h0 * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // fondo blanco para PNG con transparencia
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  let blob = await toBlob(canvas, 'image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg');
  if (!blob) throw new Error('No se pudo procesar la imagen.');
  return blob;
}

/** Nombre de archivo seguro: <timestamp>-<nombre>.<ext> */
export function fileName(original, blob) {
  const base = slugify(String(original).replace(/\.[^.]+$/, '')) || 'imagen';
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${base}.${ext}`;
}

/** Redimensiona y sube; devuelve la ruta en Storage. */
export async function uploadImage(api, folder, file) {
  const blob = await resizeImage(file);
  return api.upload(`${folder}/${fileName(file.name, blob)}`, blob);
}
