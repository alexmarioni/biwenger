-- Stores the "correct answer" per poll once it's known, feeding the
-- /puntaje leaderboard (src/lib/scoring.ts). Only ever written by
-- scripts/fetch-results.mjs via a direct Postgres connection (a real DB
-- credential, never the public anon key) — no INSERT/UPDATE policy for
-- anon, since letting any browser client write its own "correct" answers
-- would let anyone hand themselves points.
--
-- correct_option_id: for option-based polls (Jornada match winner,
--   'Último equipo en ganar').
-- correct_text: for free-text/player_autocomplete polls, if ever resolved.
-- correct_order: for 'ranking' (Clasificación) — an ordered JSON array of
--   option_id, either the live current standings (is_final = false,
--   refreshed regularly) or the true final table once the season ends.
create table poll_results (
  poll_id uuid primary key references polls(id) on delete cascade,
  correct_option_id uuid references poll_options(id) on delete set null,
  correct_text text,
  correct_order jsonb,
  is_final boolean not null default false,
  resolved_at timestamptz not null default now(),
  source text
);

alter table poll_results enable row level security;

create policy "poll_results public read" on poll_results
  for select using (true);
