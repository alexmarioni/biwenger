-- Las opciones anteriores eran una aproximación mía; estas son los 3 tipos
-- de torneo reales que ofrece Biwenger (borra las opciones viejas y sus
-- votos en cascada).

delete from poll_options
where poll_id = (select id from polls where title = '¿Qué tipo de torneo armamos?');

do $$
declare
  torneo_poll_id uuid;
begin
  select id into torneo_poll_id from polls where title = '¿Qué tipo de torneo armamos?';

  insert into poll_options (poll_id, label, hint, sort_order)
  values
    (torneo_poll_id, 'Torneo (grupos + eliminatoria)', 'Empieza con una fase de grupos en formato liguilla. Los que lideran cada grupo pasan a una eliminatoria 1 contra 1 hasta la final.', 1),
    (torneo_poll_id, 'Eliminatoria', 'Cruces de eliminación directa desde el arranque, sin fase de grupos, hasta llegar a la final.', 2),
    (torneo_poll_id, 'Liga', 'Cada jornada todos se enfrentan 1 contra 1 contra el resto. Gana el cruce = 3 puntos, empate = 1, pierde = 0. Gana el torneo el que más puntos junta después de jugar contra todos.', 3);
end $$;
