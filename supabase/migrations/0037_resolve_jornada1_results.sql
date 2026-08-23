-- Resultados de la Jornada 1, cargados a mano: los partidos de esta liga
-- no son partidos reales de la Premier League (hay equipos como Coventry
-- City o Hull City que no juegan en la 2026/27 real), así que
-- scripts/fetch-results.mjs -- que resuelve contra el scoreboard real de
-- ESPN -- nunca los va a encontrar. Newcastle vs Liverpool y Fulham vs
-- Chelsea todavía no se jugaron, quedan sin resolver hasta que se sepa el
-- resultado.
do $$
declare
  m record;
  target_poll_id uuid;
  target_option_id uuid;
begin
  for m in
    select * from (values
      ('Arsenal vs Coventry City', 'Gana Arsenal'),
      ('Everton vs Crystal Palace', 'Gana Everton'),
      ('Hull City vs Manchester United', 'Gana Hull City'),
      ('Brentford vs Tottenham Hotspur', 'Gana Brentford'),
      ('Brighton vs Aston Villa', 'Gana Brighton'),
      ('Ipswich Town vs Sunderland', 'Gana Ipswich Town'),
      ('Manchester City vs Bournemouth', 'Gana Manchester City'),
      ('Nottingham Forest vs Leeds United', 'Gana Leeds United')
    ) as t(title, winner_label)
  loop
    select id into target_poll_id from polls where title = m.title and category = 'Jornada';
    if target_poll_id is null then
      raise notice 'No se encontró la encuesta de Jornada "%"', m.title;
      continue;
    end if;

    select id into target_option_id
    from poll_options
    where poll_id = target_poll_id and label = m.winner_label;

    if target_option_id is null then
      raise notice 'No se encontró la opción "%" en "%"', m.winner_label, m.title;
      continue;
    end if;

    insert into poll_results (poll_id, correct_option_id, is_final, source)
    values (target_poll_id, target_option_id, true, 'manual-jornada1')
    on conflict (poll_id) do update
      set correct_option_id = excluded.correct_option_id, is_final = true, resolved_at = now(), source = excluded.source;
  end loop;
end $$;
