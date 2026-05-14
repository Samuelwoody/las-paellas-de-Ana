-- =====================================================================
-- Migración: tabla site_settings para que Ana pueda editar logo,
-- contacto, slogan, etc. desde el panel.
-- Ejecuta este script en el SQL Editor de Supabase (una vez).
-- =====================================================================

create table if not exists public.site_settings (
    id               integer primary key default 1,
    brand_name       text not null default 'Las Paellas de Ana',
    brand_subtitle   text          default 'by Restaurante Terraza Cerro',
    logo_url         text,
    hero_eyebrow     text          default 'Paellas para llevar · Valdemorillo',
    hero_title       text          default 'El sabor de la *paella auténtica* recién hecha para ti',
    hero_lead        text          default 'Arroz bomba, sofrito a fuego lento y los mejores ingredientes. Eliges, llamas, y en minutos la recoges lista para disfrutar.',
    phone_display    text          default '918 97 44 33',
    phone_tel        text          default '+34918974433',
    address_line1    text          default 'Calle Río Sil, 2',
    address_line2    text          default 'Cerro Alarcón, Valdemorillo',
    hero_area        text          default 'Cerro Alarcón',
    restaurant_name  text          default 'Restaurante Terraza Cerro',
    updated_at       timestamptz   not null default now(),
    constraint site_settings_single_row check (id = 1)
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
    before update on public.site_settings
    for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
    on public.site_settings for select using (true);

drop policy if exists "Authenticated can insert site settings" on public.site_settings;
create policy "Authenticated can insert site settings"
    on public.site_settings for insert
    to authenticated
    with check (true);

drop policy if exists "Authenticated can update site settings" on public.site_settings;
create policy "Authenticated can update site settings"
    on public.site_settings for update
    to authenticated
    using (true)
    with check (true);

-- Crea la única fila (id=1) si no existe todavía.
insert into public.site_settings (id) values (1)
on conflict (id) do nothing;
