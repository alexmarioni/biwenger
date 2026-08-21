alter table polls add column if not exists venue text;
alter table polls add column if not exists kickoff_at timestamptz;

-- Horarios en hora de Reino Unido (BST, UTC+1 en agosto). El frontend los
-- muestra convertidos a hora argentina automáticamente.
update polls set venue = 'Emirates Stadium', kickoff_at = '2026-08-21 20:00+01' where title = 'Arsenal vs Coventry City';
update polls set venue = 'MKM Stadium', kickoff_at = '2026-08-22 12:30+01' where title = 'Hull City vs Manchester United';
update polls set venue = 'Hill Dickinson Stadium', kickoff_at = '2026-08-22 15:00+01' where title = 'Everton vs Crystal Palace';
update polls set venue = 'Portman Road', kickoff_at = '2026-08-22 15:00+01' where title = 'Ipswich Town vs Sunderland';
update polls set venue = 'The City Ground', kickoff_at = '2026-08-22 15:00+01' where title = 'Nottingham Forest vs Leeds United';
update polls set venue = 'Gtech Community Stadium', kickoff_at = '2026-08-22 17:30+01' where title = 'Brentford vs Tottenham Hotspur';
update polls set venue = 'Falmer Stadium', kickoff_at = '2026-08-23 14:00+01' where title = 'Brighton vs Aston Villa';
update polls set venue = 'Etihad Stadium', kickoff_at = '2026-08-23 14:00+01' where title = 'Manchester City vs Bournemouth';
update polls set venue = 'St James'' Park', kickoff_at = '2026-08-23 16:30+01' where title = 'Newcastle United vs Liverpool';
update polls set venue = 'Craven Cottage', kickoff_at = '2026-08-24 20:00+01' where title = 'Fulham vs Chelsea';
