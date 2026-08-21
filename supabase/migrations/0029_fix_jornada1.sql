-- Error de mi parte: cargué el fixture de la semana del 28-31/08 pensando
-- que la Jornada 1 ya había arrancado, pero en realidad se juega mañana
-- (22/08). Se borran esas 10 encuestas y se cargan las correctas.

delete from polls where category = 'Jornada';

do $$
declare
  m record;
  new_poll_id uuid;
begin
  for m in
    select * from (values
      ('Arsenal', 'Coventry City', 'Viernes 21/08, 20:00'),
      ('Hull City', 'Manchester United', 'Sábado 22/08, 12:30'),
      ('Everton', 'Crystal Palace', 'Sábado 22/08'),
      ('Ipswich Town', 'Sunderland', 'Sábado 22/08'),
      ('Nottingham Forest', 'Leeds United', 'Sábado 22/08'),
      ('Brentford', 'Tottenham Hotspur', 'Sábado 22/08, 17:30'),
      ('Brighton', 'Aston Villa', 'Domingo 23/08, 14:00'),
      ('Manchester City', 'Bournemouth', 'Domingo 23/08, 14:00'),
      ('Newcastle United', 'Liverpool', 'Domingo 23/08, 16:30'),
      ('Fulham', 'Chelsea', 'Lunes 24/08, 20:00')
    ) as t(home, away, kickoff)
  loop
    insert into polls (title, description, status, category, poll_type)
    values (
      m.home || ' vs ' || m.away,
      'Jornada 1 de la Premier League. ' || m.kickoff || '.',
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
