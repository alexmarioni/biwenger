-- Nueva tanda de decisiones para la liga: bajar los días de mercado de
-- libres, quién aporta para Premium, y si sacamos Capitán/Ariete dado el
-- farmeo de créditos que hace falta para cambiarlos sin Premium.

do $$
declare
  poll record;
  new_poll_id uuid;
begin
  for poll in
    select * from (values
      ('Premium', 'single', '¿Aportás para pagar Biwenger Premium?',
        'Retomamos la votación de Premium (29,99€ en pago único para toda la temporada — desbloquea puntuación personalizada, más tipos de cláusulas y abonos, subastas, avatares personalizados, cambios de Capitán/Ariete sin gastar créditos, y saca la publicidad). Por ahora somos 2 los que estarían dispuestos a poner plata: cuantos más aportemos, menos le toca pagar a cada uno.',
        array['No, no quiero aportar', 'No estoy de acuerdo en que se pague', 'Sí, aporto', 'Aporto si somos varios']),
      ('Alineaciones', 'single', '¿Sacamos el Capitán (doble puntuación)?',
        'El Capitán duplica los puntos del jugador que elijas cada jornada, pero cambiarlo cuesta créditos que hay que farmear jugando (con Premium sale gratis). Sacarlo simplifica la liga y evita esa fricción de tener que grindear para ajustar el equipo; mantenerlo conserva una decisión estratégica extra cada jornada.',
        array['Sí, sacarlo', 'No, dejarlo como está', 'Dejarlo, pero solo si pagamos Premium (así cambiarlo sale gratis)']),
      ('Alineaciones', 'single', '¿Sacamos el Ariete (bonus del delantero)?',
        'El Ariete suma +3 puntos extra por el primer gol de tu delantero en la jornada, pero -igual que el Capitán- cambiar de ariete cuesta créditos para farmear salvo que se pague Premium. Sacarlo simplifica armar la alineación semana a semana; mantenerlo suma otra capa táctica a costa de esa misma fricción.',
        array['Sí, sacarlo', 'No, dejarlo como está', 'Dejarlo, pero solo si pagamos Premium (así cambiarlo sale gratis)'])
    ) as t(category, poll_type, title, description, options)
  loop
    insert into polls (title, description, status, category, poll_type)
    values (poll.title, poll.description, 'open', poll.category, poll.poll_type)
    returning id into new_poll_id;

    insert into poll_options (poll_id, label, sort_order)
    select new_poll_id, opt, ord
    from unnest(poll.options) with ordinality as o(opt, ord);
  end loop;

  insert into polls (title, description, status, category, poll_type, placeholder, min_value, max_value)
  values (
    'Bajar los días de jugadores libres en el mercado',
    'Ahora mismo un jugador libre queda 4 días disponible en el mercado antes de renovarse. Bajar ese número hace que el mercado rote más rápido y aparezcan fichajes nuevos más seguido, pero obliga a estar más encima todos los días para no perderte una buena oportunidad — puede terminar premiando a quien está más pendiente del celular. Dejarlo como está (o subirlo) relaja esa presión y permite conectarte cada tanto sin quedar afuera, a costa de un mercado más lento y con menos variedad de opciones disponibles. Escribí a cuántos días te parece que debería quedar (podés poner 4 si preferís no tocarlo).',
    'open', 'Mercado', 'text', 'Ej: 3', 1, 7
  );
end $$;
