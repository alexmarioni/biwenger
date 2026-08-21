-- Soporte para encuestas de tipo "ranking": un pronóstico de la tabla
-- completa (los jugadores ordenan los 20 equipos de 1° a 20°). Se guarda
-- como una sola fila en votes con text_value = JSON de los option_id en
-- el orden elegido (reusa el mismo mecanismo que "text"/"autocomplete":
-- option_id null + índice único (poll_id, player_id) where option_id is null).

alter table polls drop constraint polls_poll_type_check;
alter table polls add constraint polls_poll_type_check check (poll_type in ('single', 'multi', 'text', 'autocomplete', 'ranking'));

do $$
declare
  new_poll_id uuid;
begin
  insert into polls (title, description, status, category, poll_type)
  values (
    'Clasificación final de la Premier League 2026/27',
    'Arrastrá los 20 equipos para armar tu pronóstico completo de la tabla, del 1° al 20°.',
    'open', 'Clasificación', 'ranking'
  )
  returning id into new_poll_id;

  insert into poll_options (poll_id, label, sort_order)
  select new_poll_id, opt, ord
  from unnest(array[
    'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton',
    'Chelsea', 'Coventry City', 'Crystal Palace', 'Everton', 'Fulham',
    'Hull City', 'Ipswich Town', 'Leeds United', 'Liverpool', 'Manchester City',
    'Manchester United', 'Newcastle United', 'Nottingham Forest', 'Sunderland', 'Tottenham Hotspur'
  ]) with ordinality as o(opt, ord);
end $$;
