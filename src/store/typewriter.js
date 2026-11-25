// Titular del hero con efecto máquina de escribir.
// Cada frase es [línea 1, línea 2 en cursiva]. El h1 conserva la primera frase como texto real
// (oculto visualmente) para lectores de pantalla y SEO; las capas animadas van con aria-hidden.
import { esc } from './util.js';

export const HERO_PHRASES = [
  ['Tu esencia,', 'tu poder'],
  ['Femenina,', 'firme, tuya'],
  ['Elegancia que', 'se siente tuya'],
  ['Serena,', 'moderna, imparable'],
  ['Viste tu esencia,', 'vive tu poder'],
  ['Eres tú,', 'en tu mejor luz'],
];

const TYPE_MS = 75;
const DELETE_MS = 38;
const HOLD_MS = 2200;
const GAP_MS = 450;

export function initTypewriter(h1, phrases = HERO_PHRASES) {
  if (!h1) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // queda la primera frase estática

  const [a0, b0] = phrases[0];
  // Las "fantasmas" (invisibles) ocupan la misma celda de la grilla: reservan el alto de la frase más larga
  h1.innerHTML = `<span class="sr-only">${esc(a0)} ${esc(b0)}</span>
    <span class="tw" aria-hidden="true">
      ${phrases.map(([a, b]) => `<span class="tw__ghost">${esc(a)}<br /><em>${esc(b)}</em></span>`).join('')}
      <span class="tw__live" data-tw-live></span>
    </span>`;
  const live = h1.querySelector('[data-tw-live]');
  const caret = '<span class="tw__caret"></span>';

  let i = 0;              // frase actual
  let n = 0;              // caracteres visibles
  let mode = 'type';      // type | hold | delete | gap
  let timer = null;

  const full = () => phrases[i][0].length + phrases[i][1].length;
  const paint = () => {
    const [a, b] = phrases[i];
    const ta = a.slice(0, n);
    const tb = n > a.length ? b.slice(0, n - a.length) : '';
    const onB = n > a.length;
    live.innerHTML = `${esc(ta)}${onB ? '' : caret}<br /><em>${esc(tb)}${onB ? caret : ''}</em>`;
    live.classList.toggle('is-idle', mode === 'hold' || mode === 'gap');
  };

  const step = () => {
    let wait;
    if (mode === 'type') {
      n++;
      if (n >= full()) { mode = 'hold'; wait = HOLD_MS; }
      else wait = TYPE_MS + Math.random() * 45;
    } else if (mode === 'hold') {
      mode = 'delete'; wait = DELETE_MS;
    } else if (mode === 'delete') {
      n--;
      if (n <= 0) { n = 0; mode = 'gap'; wait = GAP_MS; }
      else wait = DELETE_MS;
    } else {
      i = (i + 1) % phrases.length;
      mode = 'type'; wait = TYPE_MS;
    }
    paint();
    timer = setTimeout(step, wait);
  };

  // Empieza con la primera frase ya escrita y luego rota
  n = full(); mode = 'hold'; paint();
  const start = (delay) => { clearTimeout(timer); timer = setTimeout(step, delay); };
  start(HOLD_MS);

  // Pausa cuando la pestaña no está visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(timer);
    else start(mode === 'hold' ? HOLD_MS : 300);
  });
}
