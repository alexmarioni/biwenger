-- Palmarés histórico de la liga (no se vota, es un registro de hechos que
-- se carga a mano, igual que "players").

create table if not exists palmares (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  position smallint not null check (position between 1 and 3),
  name text not null,
  image_url text,
  created_at timestamptz not null default now(),
  unique (season, position)
);

alter table palmares enable row level security;

create policy "palmares_select_public" on palmares
  for select using (true);

insert into palmares (season, position, name) values
  ('Temporada pasada', 1, 'Elche Guevara'),
  ('Temporada pasada', 2, 'Tonkawarriors'),
  ('Temporada pasada', 3, 'Arsenalllll');
