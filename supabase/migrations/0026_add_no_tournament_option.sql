-- El torneo en sí se crea desde adentro de Biwenger (es una función nativa
-- de la app, esta encuesta solo decide qué tipo elegir ahí). Se agrega la
-- opción de no hacer torneo.

update polls
set description = 'El torneo se crea directo desde Biwenger (Ajustes de Liga → Torneos), esta encuesta es solo para decidir qué tipo elegir ahí. Esta decisión condiciona todo lo demás (cuánto dura, cómo se arma el cuadro), así que arrancamos por acá.'
where title = '¿Qué tipo de torneo armamos?';

insert into poll_options (poll_id, label, hint, sort_order)
select id, 'No hacer torneo', 'Nos quedamos solo con la liga normal, sin competencia paralela.', 4
from polls where title = '¿Qué tipo de torneo armamos?';
