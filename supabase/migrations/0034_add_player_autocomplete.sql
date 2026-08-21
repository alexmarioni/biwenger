-- Goleador/asistidor/MVP/mejor-fichaje/peor-fichaje used a hand-curated
-- shortlist of ~6-8 players each, which inevitably goes stale (missed
-- transfers, only lets everyone vote the same obvious name). Converts them
-- to poll_type 'player_autocomplete': a free-text vote (text_value, same
-- storage as 'text' polls) with suggestions sourced client-side from
-- public/data/players.json (~500+ real players, kept fresh weekly by
-- .github/workflows/update-squads.yml) instead of DB-seeded poll_options.
--
-- Checked before writing this: all 5 polls have 0 existing votes, so no
-- vote-migration step is needed — just drop their old options and flip the
-- type.

alter table polls drop constraint polls_poll_type_check;
alter table polls add constraint polls_poll_type_check check (poll_type in ('single', 'multi', 'text', 'autocomplete', 'ranking', 'player_autocomplete'));

do $$
declare
  target_poll_ids uuid[];
begin
  select array_agg(id) into target_poll_ids
  from polls
  where title in (
    'Goleador de la temporada',
    'Máximo asistidor de la temporada',
    'Mejor jugador de la temporada',
    'Mejor fichaje del mercado',
    'Peor fichaje del mercado'
  );

  delete from poll_options where poll_id = any(target_poll_ids);

  update polls
  set poll_type = 'player_autocomplete',
      placeholder = 'Escribí un jugador…'
  where id = any(target_poll_ids);
end $$;
