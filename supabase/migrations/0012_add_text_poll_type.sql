-- Soporte para encuestas de texto libre (para valores tipo "25.000€" que
-- no tiene sentido forzar a un dropdown de opciones preestablecidas).

alter table polls drop constraint polls_poll_type_check;
alter table polls add constraint polls_poll_type_check check (poll_type in ('single', 'multi', 'text'));

alter table votes alter column option_id drop not null;
alter table votes add column if not exists text_value text;

alter table votes add constraint votes_option_xor_text check (
  (option_id is not null and text_value is null) or
  (option_id is null and text_value is not null)
);

-- Un jugador solo puede tener una respuesta de texto por encuesta (a
-- diferencia de las opciones "multi", que sí permiten varias filas).
create unique index votes_poll_player_text_key on votes (poll_id, player_id) where option_id is null;
