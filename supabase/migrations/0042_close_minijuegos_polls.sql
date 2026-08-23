-- Cierra las 7 predicciones de la categoría "Minijuegos" (goleador,
-- asistidor, MVP, fichajes, primer técnico echado, último equipo en
-- ganar). Ya no se aceptan más pronósticos para estas.
update polls
set status = 'closed', closed_at = now()
where category = 'Minijuegos' and status = 'open';
