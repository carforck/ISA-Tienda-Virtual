import { WHATSAPP } from '../data.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// Escapa texto antes de insertarlo con innerHTML (también sirve para atributos)
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const money = (n) => '$' + Number(n || 0).toLocaleString('es-CO');

export const slugify = (s) =>
  String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Número de WhatsApp: data.js por defecto; store_settings.whatsapp lo reemplaza si existe
let waNumber = WHATSAPP;
export const setWhatsapp = (n) => {
  const d = String(n || '').replace(/\D/g, '');
  if (d.length >= 10) waNumber = d.length === 10 ? '57' + d : d;
};
export const waLink = (text) => `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;

export const productUrl = (p) => `/producto.html?p=${encodeURIComponent(p.slug)}`;

// "35–40" si las tallas son consecutivas; si no, "35, 36, 38"
export const sizesLabel = (sizes = []) => {
  if (!sizes.length) return '';
  const nums = sizes.map(Number);
  const consecutive = nums.every((n, i) => Number.isFinite(n) && (i === 0 || n === nums[i - 1] + 1));
  return consecutive && sizes.length > 2 ? `${sizes[0]}–${sizes[sizes.length - 1]}` : sizes.join(', ');
};

export const storage = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* modo privado o almacenamiento lleno */ }
  },
};

export const waIcon = `<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3Zm0 23.4c-2.1 0-4.1-.6-5.8-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9C5.1 10 10 5.2 16 5.2S26.9 10 26.9 15.8 22 26.4 16 26.4Zm6-7.9c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z"/></svg>`;
