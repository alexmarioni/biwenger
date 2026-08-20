-- Esquema base para las votaciones de configuración de la liga Biwenger

create extension if not exists "pgcrypto";

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  emoji text not null default '⚽',
  created_at timestamptz not null default now()
);

create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, player_id)
);

create index if not exists votes_poll_id_idx on votes (poll_id);
create index if not exists poll_options_poll_id_idx on poll_options (poll_id);

-- Row Level Security
-- Grupo cerrado de ~8 amigos de confianza, sin auth real: la identidad es
-- solo un selector de nombre guardado en localStorage. Estas políticas
-- permiten lectura pública de todo y voto público, pero NO permiten crear
-- o editar jugadores/encuestas desde el cliente (eso se hace a mano desde
-- el dashboard de Supabase).

alter table players enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table votes enable row level security;

create policy "players_select_public" on players
  for select using (true);

create policy "polls_select_public" on polls
  for select using (true);

create policy "poll_options_select_public" on poll_options
  for select using (true);

create policy "votes_select_public" on votes
  for select using (true);

create policy "votes_insert_public" on votes
  for insert with check (true);

create policy "votes_update_public" on votes
  for update using (true) with check (true);
