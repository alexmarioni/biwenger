-- Las 4 encuestas de la migración anterior (Mercado/Premium/Capitán/Ariete)
-- pasan a cerrar solas a las 24hs de creadas, en vez de quedar indefinidas.
update polls
set closes_at = now() + interval '1 day'
where title in (
  'Bajar los días de jugadores libres en el mercado',
  '¿Aportás para pagar Biwenger Premium?',
  '¿Sacamos el Capitán (doble puntuación)?',
  '¿Sacamos el Ariete (bonus del delantero)?'
);

-- Cierra ya toda encuesta "featured" (la que se pinea en el home con el
-- badge 🆕 Novedad) que siga abierta.
update polls
set status = 'closed', closed_at = now()
where featured = true and status = 'open';
