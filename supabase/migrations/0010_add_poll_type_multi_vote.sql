-- Soporte para encuestas de selección múltiple.
--
-- Hasta ahora "votes" tenía unique(poll_id, player_id): un jugador solo
-- podía tener un voto por encuesta. Lo cambiamos a
-- unique(poll_id, option_id, player_id) para permitir varias filas por
-- jugador+encuesta (una por opción elegida) en encuestas "multi", mientras
-- se sigue evitando el voto duplicado a la misma opción.

alter table polls add column if not exists poll_type text not null default 'single'
  check (poll_type in ('single', 'multi'));

alter table votes drop constraint if exists votes_poll_id_player_id_key;
alter table votes add constraint votes_poll_id_option_id_player_id_key unique (poll_id, option_id, player_id);

update polls set poll_type = 'multi'
where title = '¿Sobre qué competencia armamos la liga?';
