import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si no hay credenciales, la tienda funciona con el catálogo local (src/data.js)
export const supabase = url && key ? createClient(url, key) : null;
export const hasSupabase = Boolean(supabase);

export const PRODUCT_BUCKET = 'products';
export const publicImageUrl = (path) =>
  !path || path.startsWith('/') || path.startsWith('http')
    ? path
    : supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl;
