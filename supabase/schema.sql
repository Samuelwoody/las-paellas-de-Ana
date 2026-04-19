-- =====================================================================
-- Las Paellas de Ana · Esquema de base de datos para Supabase
-- =====================================================================
-- Ejecuta este script completo en el SQL Editor de tu proyecto Supabase.
-- Crea: tabla products, políticas RLS, bucket de Storage y triggers.
-- =====================================================================

-- 1. Tabla products -----------------------------------------------------
create table if not exists public.products (
    id           uuid primary key default gen_random_uuid(),
    name         text not null,
    category     text not null check (category in ('paella', 'ensalada', 'bebida')),
    description  text,
    price        numeric(10,2),
    image_url    text,
    tag          text,
    tag_style    text check (tag_style in ('meat','veg','sea','mix','classic','cool','wine')) default 'meat',
    is_active    boolean not null default true,
    sort_order   integer not null default 0,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists products_category_sort_idx
    on public.products (category, sort_order);

create index if not exists products_active_idx
    on public.products (is_active);

-- 2. Trigger para auto-actualizar updated_at ----------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
    before update on public.products
    for each row execute function public.set_updated_at();

-- 3. Row Level Security -------------------------------------------------
alter table public.products enable row level security;

-- Lectura pública solo de productos activos
drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
    on public.products for select
    using (is_active = true);

-- Usuarios autenticados (Ana) pueden leer todo (incluso inactivos)
drop policy if exists "Authenticated can read all products" on public.products;
create policy "Authenticated can read all products"
    on public.products for select
    to authenticated
    using (true);

-- Usuarios autenticados pueden insertar
drop policy if exists "Authenticated can insert products" on public.products;
create policy "Authenticated can insert products"
    on public.products for insert
    to authenticated
    with check (true);

-- Usuarios autenticados pueden actualizar
drop policy if exists "Authenticated can update products" on public.products;
create policy "Authenticated can update products"
    on public.products for update
    to authenticated
    using (true)
    with check (true);

-- Usuarios autenticados pueden borrar
drop policy if exists "Authenticated can delete products" on public.products;
create policy "Authenticated can delete products"
    on public.products for delete
    to authenticated
    using (true);

-- 4. Storage bucket para imágenes de productos -------------------------
-- IMPORTANTE: Ejecuta esto en el SQL Editor. El bucket se crea como
-- público para lectura (las imágenes aparecen en la web sin auth).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Políticas del bucket: lectura pública, escritura solo autenticados
drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images"
    on storage.objects for select
    using (bucket_id = 'product-images');

drop policy if exists "Authenticated can upload product images" on storage.objects;
create policy "Authenticated can upload product images"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'product-images');

drop policy if exists "Authenticated can update product images" on storage.objects;
create policy "Authenticated can update product images"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'product-images');

drop policy if exists "Authenticated can delete product images" on storage.objects;
create policy "Authenticated can delete product images"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'product-images');

-- 5. Semilla inicial del catálogo --------------------------------------
-- Inserta el catálogo actual de la web para que Ana lo pueda editar.
insert into public.products (name, category, description, tag, tag_style, sort_order) values
    ('Paella de Carne',       'paella',   'Pollo de corral, conejo, judía verde, garrofón y nuestro sofrito secreto.',           'Carne',        'meat', 10),
    ('Paella Vegetariana',    'paella',   'Alcachofa, pimientos, judía verde, tomate cherry y azafrán. 100% vegetal.',           'Vegetariana',  'veg',  20),
    ('Paella de Marisco',     'paella',   'Gambas, mejillones, calamar y almejas sobre fumet de pescado.',                        'Marisco',      'sea',  30),
    ('Paella Mixta',          'paella',   'Lo mejor del mar y la tierra: pollo, gambas, mejillones y pimientos.',                 'Mixta',        'mix',  40),
    ('Ensalada Fresca de la Casa', 'ensalada', 'Mezclum, tomate, cebolla morada, aceitunas y aliño de la casa.',                  'Fresca',       'veg',  10),
    ('Ensaladilla Rusa',      'ensalada', 'Receta de toda la vida: patata, atún, huevo, zanahoria y mayonesa casera.',            'Clásica',      'classic', 20),
    ('Refrescos',             'bebida',   'Coca-Cola, Fanta, Aquarius, agua mineral y más.',                                       'Fríos',        'cool', 10),
    ('Cervezas',              'bebida',   'Mahou, Estrella Galicia, Alhambra y opción 0,0.',                                       'Bien fría',    'cool', 20),
    ('Vinos',                 'bebida',   'Tintos de Rioja y Ribera, blancos Verdejo y Rueda, rosados.',                           'Selección',    'wine', 30)
on conflict do nothing;
