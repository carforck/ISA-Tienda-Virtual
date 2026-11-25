import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // En GitHub Pages el sitio vive en /ISA-Tienda-Virtual/ (lo define el workflow con VITE_BASE)
  base: process.env.VITE_BASE || '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        producto: resolve(import.meta.dirname, 'producto.html'),
      },
    },
  },
});
