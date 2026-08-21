-- Metadata extra para encuestas de tipo "text": placeholder de ejemplo
-- propio de cada una (antes todas mostraban "Ej: 25.000€" hardcodeado),
-- rango numérico opcional para validar, y si se permite dejar la
-- respuesta vacía (y qué mostrar cuando está vacía).

alter table polls add column if not exists placeholder text;
alter table polls add column if not exists min_value numeric;
alter table polls add column if not exists max_value numeric;
alter table polls add column if not exists allow_empty boolean not null default false;
alter table polls add column if not exists empty_label text;

update polls set placeholder = 'Ej: 25.000€' where title = 'Abono por punto conseguido';
update polls set placeholder = 'Ej: 1.000.000€' where title = 'Bono por jugador en el once ideal';
update polls set placeholder = 'Ej: 2.000.000€' where title = 'Bono por alinear al MVP de un partido';
update polls set placeholder = 'Ej: 5.000.000€' where title = 'Bono por alinear al MVP de la jornada';

update polls
set placeholder = 'Ej: 3', allow_empty = true, empty_label = 'Sin límite', min_value = 0
where title = 'Límite de sobres que se pueden comprar';

insert into polls (title, description, status, category, poll_type, placeholder, min_value, max_value)
values (
  'Jugadores libres en el mercado',
  'Cuántos jugadores libres (sin dueño) aparecen simultáneamente para fichar en el mercado. En Biwenger suele ser entre 10 y 20 según el tamaño de la liga.',
  'open', 'Mercado', 'text', 'Ej: 15', 0, 20
),
(
  'Días que permanecen los jugadores en el mercado',
  'Cuántos días queda disponible un jugador libre en el mercado antes de renovarse.',
  'open', 'Mercado', 'text', 'Ej: 3', 1, 7
);
