import './admin.css';
import { supabase, hasSupabase } from '../lib/supabase.js';
import { createSupabaseApi } from './api.js';
import { esc, icon, toast, toastError, errorMessage, withBusy, $ } from './ui.js';
import { renderCollections } from './collections.js';
import { renderCategories } from './categories.js';
import { renderProducts } from './products.js';
import { renderOrders } from './orders.js';
import { renderSettings } from './settings.js';

const app = document.getElementById('app');

const SECTIONS = [
  { id: 'colecciones', label: 'Colecciones', short: 'Colecciones', icon: 'collections', render: renderCollections },
  { id: 'categorias', label: 'Categorías', short: 'Categorías', icon: 'categories', render: renderCategories },
  { id: 'productos', label: 'Productos', short: 'Productos', icon: 'products', render: renderProducts },
  { id: 'pedidos', label: 'Pedidos', short: 'Pedidos', icon: 'orders', render: renderOrders },
  { id: 'ajustes', label: 'Envíos y ajustes', short: 'Ajustes', icon: 'settings', render: renderSettings },
];

let api = null;
let user = null;

// ───────── Arranque ─────────
async function boot() {
  const wantsDemo = import.meta.env.DEV && new URLSearchParams(location.search).has('demo');
  if (wantsDemo) {
    const { createDemoApi } = await import('./demo.js');
    api = createDemoApi();
  } else if (hasSupabase) {
    api = createSupabaseApi(supabase);
  } else {
    renderSetup();
    return;
  }

  api.onAuthChange((event, u) => {
    // setTimeout: evita llamar a Supabase dentro del callback de auth (bloqueo interno)
    setTimeout(() => {
      if (event === 'SIGNED_OUT') { if (user) { user = null; renderLogin(); } }
      else if (event === 'SIGNED_IN' && u && u.id !== user?.id) { user = u; checkAdmin(); }
    }, 0);
  });

  try {
    user = await api.getUser();
  } catch (err) {
    console.error(err);
  }
  if (user) checkAdmin();
  else renderLogin();
}

async function checkAdmin() {
  app.innerHTML = `<div class="adm-boot"><img src="brand/logo-isa.svg" alt="isa" /><p>Verificando permisos…</p></div>`;
  let ok = false;
  try {
    ok = await api.isAdmin(user.id);
  } catch (err) {
    console.error(err);
  }
  if (ok) renderShell();
  else renderNoAccess();
}

// ───────── Pantalla de configuración (sin credenciales) ─────────
function renderSetup() {
  const demoLink = import.meta.env.DEV
    ? `<p class="setup__demo">¿Solo quieres ver cómo luce el panel? <a href="?demo=1">Abrir modo demo con datos de ejemplo</a> <small>(solo en desarrollo)</small></p>`
    : '';
  app.innerHTML = `
    <main class="auth auth--setup">
      <section class="auth__card setup">
        <img class="auth__logo" src="brand/logo-isa.svg" alt="isa" />
        <p class="eyebrow">Panel de administración</p>
        <h1>Conectemos tu tienda</h1>
        <p class="muted">El panel necesita una base de datos en Supabase para guardar colecciones, productos y pedidos. Solo se configura una vez:</p>
        <ol class="setup__steps">
          <li><strong>Crea un proyecto</strong> gratis en <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>.</li>
          <li>En <em>SQL Editor</em>, pega y ejecuta todo el archivo <code>supabase/schema.sql</code> del proyecto.</li>
          <li>En <em>Authentication → Users</em>, crea tu usuario con correo y contraseña.</li>
          <li>Dale permisos de administradora ejecutando en el SQL Editor:<pre><code>insert into public.admins (user_id)
select id from auth.users where email = 'tu-correo@ejemplo.com';</code></pre></li>
          <li>En <em>Project Settings → API</em> copia la URL y la clave <em>anon public</em>, y crea un archivo <code>.env</code> en la raíz del proyecto:<pre><code>VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...</code></pre></li>
          <li>Reinicia el servidor de desarrollo (<code>npm run dev</code>) y recarga esta página.</li>
        </ol>
        ${demoLink}
        <a class="btn btn--ghost" href="./">Volver a la tienda</a>
      </section>
    </main>`;
}

// ───────── Login ─────────
function renderLogin() {
  app.innerHTML = `
    <main class="auth">
      <form class="auth__card" id="login-form" novalidate>
        <img class="auth__logo" src="brand/logo-isa.svg" alt="isa" />
        <p class="eyebrow">Panel de administración</p>
        <h1>Bienvenida</h1>
        ${api.demo ? '<p class="note">Modo demo: cualquier correo y contraseña sirven.</p>' : ''}
        <label class="field"><span>Correo electrónico</span>
          <input type="email" name="email" autocomplete="username" required placeholder="tu@correo.com" /></label>
        <label class="field"><span>Contraseña</span>
          <input type="password" name="password" autocomplete="current-password" required /></label>
        <p class="form-error" data-error hidden></p>
        <button class="btn btn--primary btn--block" data-busy="Ingresando…">Ingresar</button>
        <a class="auth__back" href="./">← Volver a la tienda</a>
      </form>
    </main>`;
  const form = $('#login-form');
  form.email.focus();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = form.querySelector('[data-error]');
    errBox.hidden = true;
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) {
      errBox.textContent = 'Escribe tu correo y contraseña.';
      errBox.hidden = false;
      return;
    }
    await withBusy(form.querySelector('button'), async () => {
      try {
        const u = await api.signIn(email, password);
        if (u && u.id !== user?.id) { user = u; checkAdmin(); }
      } catch (err) {
        errBox.textContent = errorMessage(err);
        errBox.hidden = false;
      }
    });
  });
}

function renderNoAccess() {
  app.innerHTML = `
    <main class="auth">
      <section class="auth__card">
        <img class="auth__logo" src="brand/logo-isa.svg" alt="isa" />
        <h1>Acceso restringido</h1>
        <p class="muted">Tu usuario no tiene permisos de administrador.</p>
        <p class="muted small">Sesión iniciada como <strong>${esc(user?.email)}</strong>.</p>
        <button class="btn btn--primary btn--block" data-logout>Cerrar sesión</button>
      </section>
    </main>`;
  app.querySelector('[data-logout]').addEventListener('click', logout);
}

async function logout() {
  try {
    await api.signOut();
  } catch (err) {
    toastError(err);
  }
  user = null;
  renderLogin();
}

// ───────── Estructura principal ─────────
function currentSection() {
  const id = location.hash.replace(/^#\/?/, '').split('?')[0];
  return SECTIONS.find((s) => s.id === id) || SECTIONS[0];
}

function renderShell() {
  const nav = SECTIONS.map(
    (s) => `<a href="#/${s.id}" data-nav="${s.id}">${icon(s.icon)}<span class="nav-long">${esc(s.label)}</span><span class="nav-short">${esc(s.short)}</span></a>`,
  ).join('');
  app.innerHTML = `
    <div class="shell">
      <aside class="side">
        <a class="side__logo" href="#/colecciones"><img src="brand/logo-isa-white.svg" alt="isa" /></a>
        <p class="side__tag">Panel</p>
        <nav class="side__nav" aria-label="Secciones">${nav}</nav>
        <div class="side__foot">
          ${api.demo ? '<span class="badge badge--gold">Modo demo</span>' : ''}
          <p class="side__user" title="${esc(user?.email)}">${esc(user?.email)}</p>
          <a class="side__link" href="./" target="_blank" rel="noopener">${icon('eye')}Ver tienda</a>
          <button class="side__link" data-logout>${icon('logout')}Cerrar sesión</button>
        </div>
      </aside>
      <header class="topbar">
        <img src="brand/logo-isa.svg" alt="isa" />
        ${api.demo ? '<span class="badge badge--gold">Demo</span>' : ''}
        <button class="icon-btn" data-logout aria-label="Cerrar sesión">${icon('logout')}</button>
      </header>
      <main class="main" id="main"></main>
    </div>`;
  app.querySelectorAll('[data-logout]').forEach((b) => b.addEventListener('click', logout));
  route();
}

let renderToken = 0;
function route() {
  const main = document.getElementById('main');
  if (!main) return;
  // Cierra paneles/diálogos abiertos si se cambia de sección (p. ej. botón atrás)
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  const section = currentSection();
  app.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === section.id));
  document.title = `${section.label} · isa admin`;
  const token = ++renderToken;
  main.scrollTop = 0;
  window.scrollTo(0, 0);
  // Cada sección pinta su propio contenido dentro de #main
  Promise.resolve(section.render({ api, root: main, isCurrent: () => token === renderToken })).catch((err) => {
    if (token !== renderToken) return;
    console.error(err);
    main.innerHTML = `<div class="state state--empty"><h3>No se pudo cargar esta sección</h3><p>${esc(errorMessage(err))}</p></div>`;
  });
}

window.addEventListener('hashchange', route);

boot().catch((err) => {
  console.error(err);
  app.innerHTML = `<main class="auth"><section class="auth__card"><h1>Algo salió mal</h1><p class="muted">${esc(errorMessage(err))}</p></section></main>`;
  toast('Error al iniciar el panel', 'error');
});
