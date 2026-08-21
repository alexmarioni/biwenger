-- Minijuegos: predicciones sobre la Premier League real (temporada
-- 2026/27), con candidatos reales investigados (managers, fichajes,
-- goleadores/asistidores probables) a fecha 21/08/2026.

do $$
declare
  poll record;
  new_poll_id uuid;
begin
  -- Encuestas con lista corta de candidatos curados.
  for poll in
    select * from (values
      ('Goleador de la temporada',
        'Quién termina siendo el máximo goleador de la Premier League 2026/27.',
        array[
          'Erling Haaland (Manchester City)',
          'Alexander Isak (Liverpool)',
          'João Pedro (Chelsea)',
          'Viktor Gyökeres (Arsenal)',
          'Igor Thiago (Brentford)',
          'Bukayo Saka (Arsenal)'
        ]),
      ('Máximo asistidor de la temporada',
        'Quién termina dando más asistencias en toda la Premier League 2026/27.',
        array[
          'Bruno Fernandes (Manchester United)',
          'Rayan Cherki (Manchester City)',
          'Bukayo Saka (Arsenal)',
          'Declan Rice (Arsenal)',
          'Morgan Rogers (Chelsea)',
          'Sandro Tonali (Tottenham Hotspur)'
        ]),
      ('Mejor jugador de la temporada',
        'El MVP de toda la Premier League 2026/27.',
        array[
          'Erling Haaland (Manchester City)',
          'Bruno Fernandes (Manchester United)',
          'Declan Rice (Arsenal)',
          'Bukayo Saka (Arsenal)',
          'Alexander Isak (Liverpool)',
          'João Pedro (Chelsea)'
        ]),
      ('Mejor fichaje del mercado',
        'El fichaje de este mercado de pases que mejor va a rendir en la Premier League.',
        array[
          'Alexander Isak → Liverpool (récord británico, £125M)',
          'Morgan Rogers → Chelsea (£117M)',
          'Elliot Anderson → Manchester City (£116M)',
          'Sandro Tonali → Tottenham Hotspur (£92.5M)',
          'Mateus Fernandes → Tottenham Hotspur (£85M)',
          'Bruno Guimarães → Arsenal (£75M)',
          'Viktor Gyökeres → Arsenal (desde el Sporting CP)',
          'Marco Palestra → Chelsea (£47M, ex-Defensor del Año de la Serie A)'
        ]),
      ('Peor fichaje del mercado',
        'El fichaje de este mercado que menos va a rendir o más va a decepcionar.',
        array[
          'Alexander Isak → Liverpool (récord británico, £125M)',
          'Morgan Rogers → Chelsea (£117M)',
          'Elliot Anderson → Manchester City (£116M)',
          'Sandro Tonali → Tottenham Hotspur (£92.5M)',
          'Mateus Fernandes → Tottenham Hotspur (£85M)',
          'Bruno Guimarães → Arsenal (£75M)',
          'Viktor Gyökeres → Arsenal (desde el Sporting CP)',
          'Marco Palestra → Chelsea (£47M, ex-Defensor del Año de la Serie A)'
        ]),
      ('Último equipo en ganar un partido',
        'Cuál de los 20 equipos tarda más en conseguir su primera victoria de la temporada.',
        array[
          'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton',
          'Chelsea', 'Coventry City', 'Crystal Palace', 'Everton', 'Fulham',
          'Hull City', 'Ipswich Town', 'Leeds United', 'Liverpool', 'Manchester City',
          'Manchester United', 'Newcastle United', 'Nottingham Forest', 'Sunderland', 'Tottenham Hotspur'
        ])
    ) as t(title, description, options)
  loop
    insert into polls (title, description, status, category, poll_type)
    values (poll.title, poll.description, 'open', 'Minijuegos', 'single')
    returning id into new_poll_id;

    insert into poll_options (poll_id, label, sort_order)
    select new_poll_id, opt, ord
    from unnest(poll.options) with ordinality as o(opt, ord);
  end loop;

  -- Primer técnico en ser echado: los 20 clubes con su DT actual.
  insert into polls (title, description, status, category, poll_type)
  values (
    'Primer técnico en ser echado',
    'Qué entrenador de los 20 de la Premier League es el primero en salir despedido esta temporada.',
    'open', 'Minijuegos', 'single'
  )
  returning id into new_poll_id;

  insert into poll_options (poll_id, label, sort_order)
  select new_poll_id, opt, ord
  from unnest(array[
    'Mikel Arteta (Arsenal)', 'Unai Emery (Aston Villa)', 'Marco Rose (Bournemouth)',
    'Keith Andrews (Brentford)', 'Fabian Hürzeler (Brighton)', 'Xabi Alonso (Chelsea)',
    'Frank Lampard (Coventry City)', 'Pierre Sage (Crystal Palace)', 'David Moyes (Everton)',
    'Álvaro Arbeloa (Fulham)', 'Sergej Jakirović (Hull City)', 'Gary O''Neil (Ipswich Town)',
    'Daniel Farke (Leeds United)', 'Andoni Iraola (Liverpool)', 'Enzo Maresca (Manchester City)',
    'Michael Carrick (Manchester United)', 'Matthias Jaissle (Newcastle United)',
    'Oliver Glasner (Nottingham Forest)', 'Régis Le Bris (Sunderland)', 'Roberto De Zerbi (Tottenham Hotspur)'
  ]) with ordinality as o(opt, ord);
end $$;
