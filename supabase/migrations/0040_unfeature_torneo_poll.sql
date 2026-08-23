-- El torneo ya se definió y arrancó, así que la encuesta "¿Qué tipo de
-- torneo armamos?" deja de pinearse en el home con el badge 🆕 Novedad.
-- Sigue existiendo (cerrada, con sus votos) y ahora aparece como cualquier
-- otra encuesta cerrada en /votaciones.
update polls
set featured = false
where title = '¿Qué tipo de torneo armamos?';
