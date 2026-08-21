-- Jornada 2 de la Premier League real (28-31 de agosto 2026). La Jornada 1
-- arranca hoy mismo (21/08), así que no tiene sentido pronosticarla.

do $$
declare
  m record;
  new_poll_id uuid;
begin
  for m in
    select * from (values
      ('Crystal Palace', 'Manchester City', 'Viernes 28/08'),
      ('Liverpool', 'Nottingham Forest', 'Sábado 29/08, 12:30'),
      ('Bournemouth', 'Everton', 'Sábado 29/08'),
      ('Coventry City', 'Hull City', 'Sábado 29/08'),
      ('Tottenham Hotspur', 'Newcastle United', 'Sábado 29/08, 17:30'),
      ('Chelsea', 'Brighton', 'Domingo 30/08, 14:00'),
      ('Leeds United', 'Brentford', 'Domingo 30/08, 14:00'),
      ('Sunderland', 'Fulham', 'Domingo 30/08, 14:00'),
      ('Manchester United', 'Ipswich Town', 'Domingo 30/08, 16:30'),
      ('Aston Villa', 'Arsenal', 'Fin de semana del 30-31/08 (fecha a confirmar)')
    ) as t(home, away, kickoff)
  loop
    insert into polls (title, description, status, category, poll_type)
    values (
      m.home || ' vs ' || m.away,
      'Jornada 2 de la Premier League. ' || m.kickoff || '.',
      'open', 'Jornada', 'single'
    )
    returning id into new_poll_id;

    insert into poll_options (poll_id, label, sort_order)
    values
      (new_poll_id, 'Gana ' || m.home, 1),
      (new_poll_id, 'Empate', 2),
      (new_poll_id, 'Gana ' || m.away, 3);
  end loop;
end $$;
