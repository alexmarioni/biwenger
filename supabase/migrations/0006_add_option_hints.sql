alter table poll_options add column if not exists hint text;

-- Mini explicaciones para las opciones que usan jerga de Biwenger y no se
-- entienden solo por el nombre.

update poll_options set hint = 'Puntos que reparten a mano los periodistas del diario AS después de cada partido. Es más subjetivo y da menos puntos en total que SofaScore.'
where label = 'Picas de AS' and poll_id in (select id from polls where title = 'Sistema de puntuación');

update poll_options set hint = 'Puntuación automática y estadística según lo que hizo cada jugador en la cancha (goles, pases, tackles...). Da hasta ~22% más puntos en promedio que Picas de AS.'
where label = 'SofaScore' and poll_id in (select id from polls where title = 'Sistema de puntuación');

update poll_options set hint = 'Promedia Picas de AS y SofaScore, para equilibrar lo editorial de AS con lo estadístico de SofaScore.'
where label = 'Media entre Picas y SofaScore' and poll_id in (select id from polls where title = 'Sistema de puntuación');

update poll_options set hint = 'Puntos calculados solo con estadísticas puras del partido (goles, asistencias, tarjetas...), sin la parte editorial de AS.'
where label = 'Sistema de estadísticas (goles, asistencias, etc.)' and poll_id in (select id from polls where title = 'Sistema de puntuación');

update poll_options set hint = 'Cada jugador de fútbol real es exclusivo de un equipo en la liga: si lo fichás, nadie más te lo puede sacar salvo que se lo vendas.'
where label = 'Normal' and poll_id in (select id from polls where title = 'Tipo de liga');

update poll_options set hint = 'Hay un mercado diario común: varios managers pueden pujar y quedarse con el mismo jugador por su valor de mercado, no son exclusivos.'
where label = 'Clásica' and poll_id in (select id from polls where title = 'Tipo de liga');

update poll_options set hint = 'No hay mercado de fichajes: cada jornada armás tu once eligiendo entre todos los jugadores disponibles, limitado solo por tu presupuesto.'
where label = 'Fantasy' and poll_id in (select id from polls where title = 'Tipo de liga');
