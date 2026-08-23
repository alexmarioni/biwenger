-- Guarda el resultado exacto (no solo quién ganó) para las encuestas de
-- Jornada, así el front puede mostrar el marcador real en vez de solo
-- "cerrada". Backfillea los 8 partidos ya resueltos de la Jornada 1.
alter table poll_results add column if not exists home_score integer;
alter table poll_results add column if not exists away_score integer;

update poll_results r
set home_score = m.home_score, away_score = m.away_score
from (
  select p.id as poll_id, v.home_score, v.away_score
  from (values
    ('Arsenal vs Coventry City', 3, 0),
    ('Everton vs Crystal Palace', 2, 0),
    ('Hull City vs Manchester United', 2, 0),
    ('Brentford vs Tottenham Hotspur', 3, 0),
    ('Brighton vs Aston Villa', 4, 0),
    ('Ipswich Town vs Sunderland', 2, 1),
    ('Manchester City vs Bournemouth', 2, 1),
    ('Nottingham Forest vs Leeds United', 0, 1)
  ) as v(title, home_score, away_score)
  join polls p on p.title = v.title and p.category = 'Jornada'
) as m
where r.poll_id = m.poll_id;
