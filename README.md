# isa · Tienda Virtual

Tienda virtual de calzado femenino **isa** — *Tu esencia, tu poder*.

## Desarrollo

```bash
npm install
npm run dev      # servidor con recarga automática, expuesto en la red local
npm run build    # compila a /dist
```

## Estructura

- `index.html` — página principal
- `src/main.js` — lógica (catálogo, filtros, carrito, pedido por WhatsApp, video del hero)
- `src/data.js` — catálogo y categorías (temporal, hasta tener el panel de administración)
- `src/style.css` — estilos
- `public/brand/` — logo vectorizado (dorado, blanco, oscuro, mono)
- `public/media/` — videos del hero (Pexels, licencia libre)
- `public/products/` — fotos de producto
- `scripts/vectorize.cjs` — vectoriza un PNG del logo a SVG

Hecho por [Vanttage](https://vanttagetech.com).
