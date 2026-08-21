-- Ajustes reales tomados directo de la pantalla de configuración de
-- Biwenger (secciones "Puntos" y "Jugadores"), que no estaban cargados
-- todavía. Los montos van como texto libre porque son campos numéricos
-- abiertos en Biwenger, no un dropdown de opciones fijas.

do $$
declare
  poll record;
  new_poll_id uuid;
begin
  for poll in
    select * from (values
      ('Puntos', 'single', 'Abono por puntos en orden inverso a la clasificación',
        'Si está activado, el abono por punto conseguido paga más a los equipos que están peor en la tabla, para achicar la brecha. En Biwenger viene desactivado por defecto.',
        array['Sí, activado', 'No, desactivado']),
      ('Puntos', 'single', 'Restar saldo si la puntuación es negativa',
        'Si un jugador puntúa negativo en la jornada, te resta saldo en vez de solo no sumarte nada. En Biwenger viene activado por defecto.',
        array['Sí, activado', 'No, desactivado'])
    ) as t(category, poll_type, title, description, options)
  loop
    insert into polls (title, description, status, category, poll_type)
    values (poll.title, poll.description, 'open', poll.category, poll.poll_type)
    returning id into new_poll_id;

    insert into poll_options (poll_id, label, sort_order)
    select new_poll_id, opt, ord
    from unnest(poll.options) with ordinality as o(opt, ord);
  end loop;

  for poll in
    select * from (values
      ('Puntos', 'Abono por punto conseguido',
        'Plata que recibe cada equipo por cada punto que suma en la jornada. El valor por defecto en Biwenger es 25.000€. Escribí el monto que te parece (ej: "25.000€" o "0€" para desactivarlo).'),
      ('Primas', 'Bono por jugador en el once ideal',
        'Plata extra si uno de tus jugadores queda en el once ideal de la jornada. El valor por defecto en Biwenger es 1.000.000€.'),
      ('Primas', 'Bono por alinear al MVP de un partido',
        'Plata extra si alineaste al mejor jugador de un partido puntual. El valor por defecto en Biwenger es 2.000.000€.'),
      ('Primas', 'Bono por alinear al MVP de la jornada',
        'Plata extra si alineaste al mejor jugador de toda la jornada. El valor por defecto en Biwenger es 5.000.000€.')
    ) as t(category, title, description)
  loop
    insert into polls (title, description, status, category, poll_type)
    values (poll.title, poll.description, 'open', poll.category, 'text');
  end loop;
end $$;
