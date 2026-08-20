-- Borra la encuesta de ejemplo (era solo para probar el flujo) y carga un
-- set curado de encuestas reales de configuración inicial de liga,
-- basado en las opciones reales que ofrece Biwenger, agrupadas por categoría.

delete from polls where title = 'Balance inicial de fichajes';

do $$
declare
  poll record;
  new_poll_id uuid;
begin
  for poll in
    select * from (values
      ('Liga', 'Sistema de puntuación',
        'Con qué método se calculan los puntos de cada jugador en cada jornada.',
        array['Picas de AS', 'SofaScore', 'Media entre Picas y SofaScore', 'Sistema de estadísticas (goles, asistencias, etc.)']),
      ('Liga', 'Tipo de liga',
        'El modo de juego general de la temporada.',
        array['Normal', 'Clásica', 'Fantasy']),
      ('Participantes', 'Reparto inicial para nuevos miembros',
        'Con qué plantilla y presupuesto arranca alguien que se suma a mitad de temporada.',
        array['Sin equipo + 40M para armar todo', 'Plantilla aleatoria + presupuesto', 'Plantilla aleatoria + 40M menos el valor del equipo']),
      ('Participantes', 'Expulsión por inactividad',
        'Cada cuánto se echa automáticamente a alguien que no mueve el equipo.',
        array['Nunca', '2 semanas', '3 semanas', '4 semanas']),
      ('Participantes', 'Límite de jugadores del mismo club',
        'Cuántos jugadores de un mismo equipo real podés tener en tu plantilla.',
        array['Sin límite', 'Máximo 3', 'Máximo 4', 'Máximo 5']),
      ('Alineaciones', 'Capitán (doble puntuación)',
        'Si se puede elegir un capitán que duplica sus puntos, y con qué restricción de valor.',
        array['Activado, sin restricción de valor', 'Activado, solo jugadores por debajo de 5M', 'Activado, solo jugadores por debajo de 3M', 'Desactivado']),
      ('Alineaciones', 'Ariete',
        'Bonus de +3 puntos extra por el primer gol de tu delantero en la jornada.',
        array['Activado', 'Desactivado']),
      ('Alineaciones', 'Entrenador',
        'Bonus por resultado del equipo real de tu entrenador favorito (+3 victoria, +1 empate).',
        array['Activado', 'Desactivado']),
      ('Alineaciones', 'Cambios de alineación por jornada',
        'Cuántos cambios podés hacer en tu once antes de que cierre la jornada.',
        array['Ilimitados', 'Hasta 4', 'Hasta 3', 'Hasta 2', 'Hasta 1']),
      ('Mercado', 'Cesiones entre usuarios',
        'Prestar un jugador a otro equipo por tiempo limitado.',
        array['Activadas', 'Desactivadas']),
      ('Mercado', 'Cláusula de rescisión automática',
        'Si cada jugador tiene un precio fijo para robárselo a otro equipo sin que acepte.',
        array['Activada', 'Desactivada']),
      ('Mercado', 'Ventas inmediatas entre usuarios',
        'Si se puede vender un jugador a otro al toque, sin esperar a que salga a mercado.',
        array['Sí, inmediatas', 'No, tienen que esperar a la jornada']),
      ('Primas', 'Abono fijo por jornada',
        'Plata extra que recibe cada equipo automáticamente en cada jornada.',
        array['0€ (no infla el mercado)', '500.000€', '1.000.000€']),
      ('Primas', 'Prima al MVP de la jornada',
        'Premio extra para el jugador con más puntos de la jornada.',
        array['Desactivada', '150.000€', '200.000€', '250.000€']),
      ('Premium', 'Comprar Biwenger Premium',
        'Cuesta 29,99€ en pago único para toda la temporada (compartido entre todos, no es por persona) — entre 10 sería ~3 USD cada uno. Desbloquea puntuación personalizada, más tipos de cláusulas y abonos, subastas, avatares personalizados, cambios de capitán sin gastar créditos y saca la publicidad. ¿Lo pagamos entre todos?',
        array['Sí, lo pagamos entre todos', 'No, jugamos la versión gratis'])
    ) as t(category, title, description, options)
  loop
    insert into polls (title, description, status, category)
    values (poll.title, poll.description, 'open', poll.category)
    returning id into new_poll_id;

    insert into poll_options (poll_id, label, sort_order)
    select new_poll_id, opt, ord
    from unnest(poll.options) with ordinality as o(opt, ord);
  end loop;
end $$;
