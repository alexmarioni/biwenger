-- Isak (Liverpool) y Gyökeres (Arsenal) fueron fichajes del mercado de
-- 2025, no de este (2026) — error de la investigación anterior. Se sacan
-- de "mejor/peor fichaje" (en goleador/mejor jugador quedan, ahí sí son
-- válidos como jugadores actuales). Lista recortada a lo verificado
-- cruzado en más de una fuente: se borran todas las opciones viejas de
-- estas dos encuestas y se cargan de nuevo.

do $$
declare
  fichaje_poll record;
begin
  for fichaje_poll in
    select id from polls where title in ('Mejor fichaje del mercado', 'Peor fichaje del mercado')
  loop
    delete from poll_options where poll_id = fichaje_poll.id;

    insert into poll_options (poll_id, label, sort_order)
    values
      (fichaje_poll.id, 'Elliot Anderson → Manchester City (fichaje récord del club, desde Nottingham Forest)', 1),
      (fichaje_poll.id, 'Morgan Rogers → Chelsea (fichaje récord del club, desde Aston Villa)', 2),
      (fichaje_poll.id, 'Piero Hincapié → Arsenal (£34.5M, desde Bayer Leverkusen)', 3),
      (fichaje_poll.id, 'Christos Tzolis → Arsenal (£34.1M, desde Club Brugge)', 4),
      (fichaje_poll.id, 'Illan Meslier → Arsenal (libre, desde Leeds United)', 5);
  end loop;
end $$;
