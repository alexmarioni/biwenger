-- Encuesta de ejemplo para probar el flujo de votación en local.
-- Podés borrarla tranquilamente desde Supabase Studio una vez que cargues
-- tus propias encuestas reales.

with new_poll as (
  insert into polls (title, description, status)
  values (
    'Balance inicial de fichajes',
    '¿Con cuánto presupuesto arrancamos la temporada?',
    'open'
  )
  returning id
)
insert into poll_options (poll_id, label, sort_order)
select id, label, sort_order
from new_poll
cross join (
  values
    ('150M', 1),
    ('200M', 2),
    ('250M', 3)
) as opts(label, sort_order);
