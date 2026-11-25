// Capa de datos del panel. Envuelve Supabase con una interfaz pequeña
// (la misma que implementa el modo demo en desarrollo).
import { PRODUCT_BUCKET, publicImageUrl } from '../lib/supabase.js';

const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export function createSupabaseApi(sb) {
  return {
    demo: false,

    // ───── Autenticación ─────
    async getUser() {
      const { data } = await sb.auth.getSession();
      return data.session?.user ?? null;
    },
    onAuthChange(cb) {
      sb.auth.onAuthStateChange((event, session) => cb(event, session?.user ?? null));
    },
    async signIn(email, password) {
      return unwrap(await sb.auth.signInWithPassword({ email, password })).user;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async isAdmin(userId) {
      const data = unwrap(await sb.from('admins').select('user_id').eq('user_id', userId).maybeSingle());
      return Boolean(data);
    },

    // ───── Tablas ─────
    /**
     * @param {string} table
     * @param {{ select?: string, eq?: object, in?: [string, any[]], order?: [string, boolean][] }} opts
     */
    async list(table, opts = {}) {
      let q = sb.from(table).select(opts.select || '*');
      for (const [k, v] of Object.entries(opts.eq || {})) q = q.eq(k, v);
      if (opts.in) q = q.in(opts.in[0], opts.in[1]);
      for (const [col, asc] of opts.order || []) q = q.order(col, { ascending: asc });
      return unwrap(await q);
    },
    async get(table, id) {
      return unwrap(await sb.from(table).select('*').eq('id', id).maybeSingle());
    },
    async insert(table, row) {
      return unwrap(await sb.from(table).insert(row).select().single());
    },
    async insertMany(table, rows) {
      if (!rows.length) return [];
      return unwrap(await sb.from(table).insert(rows).select());
    },
    async update(table, id, patch) {
      return unwrap(await sb.from(table).update(patch).eq('id', id).select().single());
    },
    async remove(table, id) {
      unwrap(await sb.from(table).delete().eq('id', id));
    },
    async count(table, eq = {}) {
      let q = sb.from(table).select('id', { count: 'exact', head: true });
      for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },

    // ───── Storage (bucket "products") ─────
    async upload(path, blob) {
      unwrap(await sb.storage.from(PRODUCT_BUCKET).upload(path, blob, {
        contentType: blob.type || 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      }));
      return path;
    },
    async copyFile(from, to) {
      unwrap(await sb.storage.from(PRODUCT_BUCKET).copy(from, to));
      return to;
    },
    async removeFiles(paths) {
      const own = paths.filter(isStoragePath);
      if (own.length) unwrap(await sb.storage.from(PRODUCT_BUCKET).remove(own));
    },
    imageUrl: (path) => (path ? publicImageUrl(path) : ''),
  };
}

/** Rutas propias del bucket (no las imágenes estáticas /products/... ni URLs externas). */
export const isStoragePath = (p) => Boolean(p) && !p.startsWith('/') && !/^https?:/.test(p) && !p.startsWith('blob:');
