-- Biwenger no tiene un sistema de torneos propio: lo que hacen las ligas
-- que corren "copas" o torneos paralelos es armarlo a mano, encima de la
-- liga normal. Esta es la primera encuesta para decidir eso: el tipo de
-- torneo condiciona todo lo demás (cuántas jornadas dura, cómo se arma el
-- fixture, etc.), así que va destacada como novedad.

do $$
declare
  new_poll_id uuid;
begin
  insert into polls (title, description, status, category, poll_type, featured)
  values (
    '¿Qué tipo de torneo armamos?',
    'Biwenger no tiene un modo "torneo" propio, así que lo armaríamos nosotros por afuera, en paralelo a la liga de siempre. Esta decisión condiciona todo lo demás (cuánto dura, cómo se arma el cuadro), así que arrancamos por acá.',
    'open', 'Torneo', 'single', true
  )
  returning id into new_poll_id;

  insert into poll_options (poll_id, label, hint, sort_order)
  values
    (new_poll_id, 'Liga (todos contra todos)', 'Tabla aparte con los puntos de cada uno durante un tramo de jornadas fijo. El que suma más al final, gana. La más simple de llevar.', 1),
    (new_poll_id, 'Copa (eliminación directa)', 'Cruces 1 contra 1 cada semana: el que saca menos puntos esa jornada queda afuera. Con 9 no cierra el cuadro perfecto, así que a alguien le toca pasar gratis una ronda.', 2),
    (new_poll_id, 'Grupos + playoffs', 'Grupos chicos que juegan todos contra todos, y los mejores de cada grupo pasan a eliminación directa al final. Más largo y con más onda, pero más laburo llevarlo.', 3),
    (new_poll_id, 'Enfrentamientos semanales (head-to-head)', 'Cada semana te toca un rival distinto, como en el fantasy americano: ganás o perdés según quién sacó más puntos esa jornada. Hay que armar el fixture a mano.', 4);
end $$;
