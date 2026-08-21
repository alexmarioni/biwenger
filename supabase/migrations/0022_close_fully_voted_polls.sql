-- Cierra las encuestas que ya tienen el voto de los 9 jugadores.
update polls set status = 'closed', closed_at = now()
where status = 'open'
and id in (
  select p.id
  from polls p
  join votes v on v.poll_id = p.id
  group by p.id
  having count(distinct v.player_id) >= (select count(*) from players)
);
