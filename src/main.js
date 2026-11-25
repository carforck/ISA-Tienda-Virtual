// Página de inicio
import { $, esc } from './store/util.js';
import { initShell } from './store/shell.js';
import { productCard, bindQuickSize } from './store/cards.js';
import { initTypewriter } from './store/typewriter.js';

initTypewriter($('[data-typewriter]'));
initHeroVideo();
bindQuickSize();

const catalog = await initShell();
const { products, categories, collections } = catalog;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const params = new URLSearchParams(location.search);
let activeCat = categories.some((c) => c.id === params.get('cat')) ? params.get('cat') : 'todos';
let activeCol = collections.some((c) => c.id === params.get('col')) ? params.get('col') : 'todas';

// ───────── Categorías ─────────
$('[data-categories]').innerHTML = categories
  .map((c) => {
    const n = products.filter((p) => p.category === c.id).length;
    return `<a href="#novedades" class="category" data-cat="${esc(c.id)}">
      ${c.img ? `<img class="category__bg" src="${esc(c.img)}" alt="" loading="lazy" />` : ''}
      <span><small>${plural(n, 'modelo', 'modelos')}</small>${esc(c.name)}</span>
    </a>`;
  })
  .join('');

// ───────── Colección de temporada ─────────
const colSection = $('[data-season]');
if (collections.length) {
  const [main, ...others] = collections;
  const count = (id) => products.filter((p) => p.collection === id).length;
  colSection.hidden = false;
  $('[data-season-body]').innerHTML = `
    <div class="season">
      <figure class="season__media">
        ${main.cover ? `<img src="${esc(main.cover)}" alt="${esc(main.name)}" loading="lazy" />` : ''}
        ${main.season ? `<figcaption class="season__badge">${esc(main.season)}</figcaption>` : ''}
      </figure>
      <div class="season__content">
        <p class="eyebrow">Colección de temporada</p>
        <h2>${esc(main.name)}</h2>
        ${main.description ? `<p class="season__desc">${esc(main.description)}</p>` : ''}
        <p class="season__meta">${plural(count(main.id), 'modelo', 'modelos')} · Bajo pedido</p>
        <a href="#novedades" class="btn btn--primary" data-col-filter="${esc(main.id)}">Ver la colección</a>
      </div>
    </div>
    ${others.length ? `<div class="season__others">
      ${others.map((c) => `<a href="#novedades" class="season-card" data-col-filter="${esc(c.id)}">
        ${c.cover ? `<img src="${esc(c.cover)}" alt="" loading="lazy" />` : ''}
        <span><small>${esc(c.season || 'Colección')}</small>${esc(c.name)}</span>
      </a>`).join('')}
    </div>` : ''}`;
}

// ───────── Filtros + productos ─────────
const chip = (attr, id, name, active) =>
  `<button type="button" class="chip ${active ? 'is-active' : ''}" ${attr}="${esc(id)}" aria-pressed="${active}">${esc(name)}</button>`;

const renderFilters = () => {
  const colRow = collections.length
    ? `<div class="filters" role="group" aria-label="Filtrar por colección">
        ${chip('data-filter-col', 'todas', 'Todas las colecciones', activeCol === 'todas')}
        ${collections.map((c) => chip('data-filter-col', c.id, c.name, activeCol === c.id)).join('')}
      </div>`
    : '';
  const catRow = `<div class="filters" role="group" aria-label="Filtrar por categoría">
      ${chip('data-filter', 'todos', 'Todos', activeCat === 'todos')}
      ${categories.map((c) => chip('data-filter', c.id, c.name, activeCat === c.id)).join('')}
    </div>`;
  $('[data-filters]').innerHTML = colRow + catRow;
};

const renderProducts = () => {
  const list = products.filter(
    (p) => (activeCat === 'todos' || p.category === activeCat) && (activeCol === 'todas' || p.collection === activeCol)
  );
  $('[data-products]').innerHTML = list.length
    ? list.map((p) => productCard(p)).join('')
    : `<div class="products__empty"><p>No hay modelos con estos filtros por ahora.</p>
        <button type="button" class="btn btn--ghost" data-filter-reset>Ver todos los modelos</button></div>`;
  const col = collections.find((c) => c.id === activeCol);
  const cat = categories.find((c) => c.id === activeCat);
  $('[data-products-status]').textContent =
    `${plural(list.length, 'modelo', 'modelos')}${cat ? ` · ${cat.name}` : ''}${col ? ` · ${col.name}` : ''}`;
};

const update = () => { renderFilters(); renderProducts(); };

document.addEventListener('click', (e) => {
  const t = e.target;
  const f = t.closest('[data-filter]');
  if (f) { activeCat = f.dataset.filter; return update(); }
  const fc = t.closest('[data-filter-col]');
  if (fc) { activeCol = fc.dataset.filterCol; return update(); }
  const col = t.closest('[data-col-filter]');
  if (col) { activeCol = col.dataset.colFilter; activeCat = 'todos'; return update(); }
  const c = t.closest('[data-cat], [data-cat-link]');
  if (c) { activeCat = c.dataset.cat || c.dataset.catLink; activeCol = 'todas'; return update(); }
  if (t.closest('[data-filter-reset]')) { activeCat = 'todos'; activeCol = 'todas'; update(); }
});
update();

// Llegada desde otra página con filtro (?cat= / ?col=): baja al listado
if ((params.has('cat') || params.has('col')) && location.hash === '#novedades') {
  requestAnimationFrame(() => $('#novedades').scrollIntoView());
}

// ───────── Hero: varios videos en rotación con fundido; móvil usa versiones verticales ─────────
function initHeroVideo() {
  const PLAYLIST = {
    desktop: [
      { src: 'media/hero-tacon-negro.mp4', pos: 'center 70%' },
      { src: 'media/hero-tacon-coral.mp4', pos: 'center 80%' },
    ],
    mobile: [
      { src: 'media/m-hero-tenis.mp4', pos: 'center 60%' },
      { src: 'media/m-hero-botas.mp4', pos: 'center 70%' },
      { src: 'media/m-hero-tacon-negro.mp4', pos: 'center' },
    ],
  };
  const heroVideos = [...document.querySelectorAll('[data-hero-video]')];
  const heroToggle = $('[data-hero-toggle]');
  if (!heroVideos.length) return;
  const list = window.matchMedia('(max-width: 760px)').matches ? PLAYLIST.mobile : PLAYLIST.desktop;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let idx = 0, cur = 0, paused = reduced;

  const load = (v, item) => { v.src = item.src; v.style.objectPosition = item.pos; };
  const setIcon = () => {
    heroToggle.setAttribute('aria-label', paused ? 'Reproducir video' : 'Pausar video');
    heroToggle.innerHTML = paused
      ? '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7V5Z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>';
  };
  const next = () => {
    if (list.length < 2) { heroVideos[cur].currentTime = 0; heroVideos[cur].play(); return; }
    idx = (idx + 1) % list.length;
    const incoming = heroVideos[1 - cur];
    incoming.play().catch(() => {});
    incoming.classList.add('is-active');
    heroVideos[cur].classList.remove('is-active');
    cur = 1 - cur;
    // precarga el siguiente en el video que quedó oculto
    setTimeout(() => load(heroVideos[1 - cur], list[(idx + 1) % list.length]), 1200);
  };

  load(heroVideos[0], list[0]);
  if (list[1]) load(heroVideos[1], list[1]);
  heroVideos[0].classList.add('is-active');
  heroVideos.forEach((v) => v.addEventListener('ended', () => v === heroVideos[cur] && next()));
  if (!reduced) heroVideos[0].play().catch(() => { paused = true; setIcon(); });
  setIcon();

  heroToggle.addEventListener('click', () => {
    paused = !paused;
    paused ? heroVideos[cur].pause() : heroVideos[cur].play();
    setIcon();
  });
}
