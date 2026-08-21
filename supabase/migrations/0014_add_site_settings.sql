-- Fila única de configuración global del sitio. Se usa para activar un modo
-- mantenimiento mientras se tocan encuestas/migraciones, sin tener que
-- rebuildear ni deployar nada — se prende y apaga con un UPDATE directo.
-- A propósito NO hay políticas de insert/update/delete públicas: solo se
-- puede tocar con la conexión directa a la base (no desde el sitio).

create table if not exists site_settings (
  id smallint primary key default 1,
  maintenance boolean not null default false,
  message text,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);

alter table site_settings enable row level security;

create policy "site_settings_select_public" on site_settings
  for select using (true);

insert into site_settings (id, maintenance) values (1, false)
on conflict (id) do nothing;
