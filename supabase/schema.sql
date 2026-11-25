-- isa · Tienda Virtual — esquema Supabase
-- Ejecutar en Supabase → SQL Editor. Idempotente en lo posible.

-- ───────────── Administradores ─────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ───────────── Colecciones (por temporada) ─────────────
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- "Otoño 2026", "Navidad", "Verano"
  slug text not null unique,
  season text,                           -- texto libre: temporada / campaña
  description text,
  cover_path text,                       -- imagen de portada (Storage)
  starts_on date,
  ends_on date,
  is_active boolean not null default false,  -- visible en la tienda
  is_featured boolean not null default false, -- colección destacada en el hero/home
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ───────────── Categorías (tipo de calzado) ─────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- "Tacones", "Slingbacks", "Plataformas", "Planos"
  slug text not null unique,
  image_path text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ───────────── Productos ─────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  material text,
  price integer not null check (price >= 0),           -- COP, sin decimales
  compare_at_price integer check (compare_at_price >= 0),
  sizes text[] not null default '{35,36,37,38,39,40}',  -- tallas que se fabrican/consiguen
  colors text[] not null default '{}',
  tag text,                                             -- "Nuevo", "Top", "Últimos"
  category_id uuid references public.categories (id) on delete set null,
  collection_id uuid references public.collections (id) on delete set null,
  lead_time_days int,                                   -- días de preparación bajo pedido (null = sin definir)
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null,                    -- ruta en Storage (bucket products) o URL /products/...
  alt text,
  sort_order int not null default 0
);

-- ───────────── Envíos (transportadoras colombianas) ─────────────
create table if not exists public.carriers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,             -- Servientrega, Coordinadora, Interrapidísimo, Envía, TCC
  tracking_url text,                     -- plantilla con {guia}
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.store_settings (
  id int primary key default 1 check (id = 1),
  whatsapp text not null default '573015928067',
  free_shipping_from integer,                            -- null = sin envío gratis
  default_shipping_cost integer,                        -- null = se cotiza por WhatsApp
  default_lead_time_days int,                           -- null = sin definir
  order_note text default 'Todos nuestros productos se elaboran o consiguen bajo pedido. Te confirmamos talla, disponibilidad y costo de envío por WhatsApp.'
);
insert into public.store_settings (id) values (1) on conflict do nothing;

-- ───────────── Pedidos (bajo pedido) ─────────────
do $$ begin
  create type order_status as enum ('nuevo','confirmado','en_produccion','listo','enviado','entregado','cancelado');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  status order_status not null default 'nuevo',
  customer_name text not null,
  customer_id_number text,               -- cédula (lo piden las transportadoras)
  customer_phone text not null,
  customer_email text,
  department text not null,              -- departamento
  city text not null,
  address text not null,
  address_notes text,
  carrier_id uuid references public.carriers (id),
  tracking_number text,
  subtotal integer not null default 0,
  shipping_cost integer,
  total integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,            -- copia por si el producto cambia
  size text not null,
  color text,
  quantity int not null check (quantity > 0),
  unit_price integer not null
);

-- ───────────── updated_at ─────────────
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists trg_orders_touch on public.orders;
create trigger trg_orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- ───────────── RLS ─────────────
alter table public.admins enable row level security;
alter table public.collections enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.carriers enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Lectura pública del catálogo activo
drop policy if exists "public read collections" on public.collections;
create policy "public read collections" on public.collections for select using (is_active or public.is_admin());
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (is_active or public.is_admin());
drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (is_active or public.is_admin());
drop policy if exists "public read images" on public.product_images;
create policy "public read images" on public.product_images for select using (true);
drop policy if exists "public read carriers" on public.carriers;
create policy "public read carriers" on public.carriers for select using (is_active or public.is_admin());
drop policy if exists "public read settings" on public.store_settings;
create policy "public read settings" on public.store_settings for select using (true);

-- Escritura solo administradores
do $$ declare t text; begin
  foreach t in array array['collections','categories','products','product_images','carriers','store_settings'] loop
    execute format('drop policy if exists "admin write %1$s" on public.%1$s', t);
    execute format('create policy "admin write %1$s" on public.%1$s for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "admins self" on public.admins;
create policy "admins self" on public.admins for select using (user_id = auth.uid());

-- Pedidos: el público solo puede crearlos (vía función), los admins todo
drop policy if exists "admin orders" on public.orders;
create policy "admin orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin order items" on public.order_items;
create policy "admin order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());

-- Crear pedido desde la tienda (sin exponer lectura de pedidos)
-- p_items: [{ "product_id": uuid|null, "product_name": text, "size": text, "color": text|null, "quantity": int }]
create or replace function public.create_order(
  p_customer jsonb, p_items jsonb, p_carrier_id uuid default null, p_notes text default null
) returns table (order_id uuid, order_code text, order_subtotal integer)
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text; v_sub integer := 0; it jsonb; v_price integer;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then raise exception 'El pedido no tiene productos'; end if;
  insert into orders (customer_name, customer_id_number, customer_phone, customer_email, department, city, address, address_notes, carrier_id, notes)
  values (p_customer->>'name', p_customer->>'id_number', p_customer->>'phone', p_customer->>'email',
          p_customer->>'department', p_customer->>'city', p_customer->>'address', p_customer->>'address_notes', p_carrier_id, p_notes)
  returning id, code into v_id, v_code;
  for it in select * from jsonb_array_elements(p_items) loop
    -- el precio siempre sale de la base de datos, nunca del navegador
    select price into v_price from products where id = (it->>'product_id')::uuid and is_active;
    if v_price is null then raise exception 'Producto no disponible: %', it->>'product_name'; end if;
    insert into order_items (order_id, product_id, product_name, size, color, quantity, unit_price)
    values (v_id, (it->>'product_id')::uuid, it->>'product_name', it->>'size', it->>'color', greatest((it->>'quantity')::int, 1), v_price);
    v_sub := v_sub + v_price * greatest((it->>'quantity')::int, 1);
  end loop;
  update orders set subtotal = v_sub where id = v_id;
  return query select v_id, v_code, v_sub;
end $$;
grant execute on function public.create_order(jsonb, jsonb, uuid, text) to anon, authenticated;

-- ───────────── Storage ─────────────
insert into storage.buckets (id, name, public) values ('products', 'products', true) on conflict do nothing;
drop policy if exists "public read product files" on storage.objects;
create policy "public read product files" on storage.objects for select using (bucket_id = 'products');
drop policy if exists "admin write product files" on storage.objects;
create policy "admin write product files" on storage.objects for all
  using (bucket_id = 'products' and public.is_admin()) with check (bucket_id = 'products' and public.is_admin());

-- ───────────── Datos iniciales ─────────────
insert into public.carriers (name, tracking_url, sort_order) values
  ('Servientrega', 'https://www.servientrega.com/wps/portal/rastreo-envio?guia={guia}', 1),
  ('Coordinadora', 'https://coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia={guia}', 2),
  ('Interrapidísimo', 'https://www.interrapidisimo.com/sigue-tu-envio/?guia={guia}', 3),
  ('Envía', 'https://envia.co/rastreo?guia={guia}', 4),
  ('TCC', 'https://tcc.com.co/rastreo/?guia={guia}', 5)
on conflict (name) do nothing;

insert into public.categories (name, slug, image_path, sort_order) values
  ('Tacones', 'tacones', '/products/08-pump-negro-charol.jpg', 1),
  ('Slingbacks', 'slingbacks', '/products/09-tacon-noche.jpg', 2),
  ('Plataformas', 'plataformas', '/products/12-alpargata-plata.jpg', 3),
  ('Planos', 'planos', '/products/05-baleta-gemas.jpg', 4)
on conflict (slug) do nothing;

-- Para dar acceso de administrador (después de crear el usuario en Authentication):
-- insert into public.admins (user_id) select id from auth.users where email = 'correo@ejemplo.com';

-- ───────────── Cambios panel admin ─────────────
-- Especificaciones técnicas por producto: [{"label": "Suela", "value": "Caucho"}, ...]
alter table public.products add column if not exists specs jsonb not null default '[]'::jsonb;

-- Tiempo de preparación sin valor por defecto (aún no definido por la tienda)
alter table public.products alter column lead_time_days drop not null;
alter table public.products alter column lead_time_days drop default;
alter table public.store_settings alter column default_lead_time_days drop default;
