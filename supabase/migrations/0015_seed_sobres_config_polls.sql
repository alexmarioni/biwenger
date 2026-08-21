-- Configuración de "Jugadores sorpresa" (sobres): ya se decidió que se
-- compran con saldo (queda reflejado cerrando esa encuesta), faltan
-- definir el límite de compra y qué tipos de sobre están permitidos.

update polls set status = 'closed', closed_at = now()
where title = 'Comprar sobres con el saldo del equipo';

do $$
declare
  poll record;
  new_poll_id uuid;
begin
  insert into polls (title, description, status, category, poll_type)
  values (
    'Cada cuánto se resetea el límite de sobres',
    'Si le ponés un tope al límite de sobres comprables, ¿cada cuánto se resetea? Solo aplica si abajo pusiste un número y no "sin límite".',
    'open', 'Mercado', 'single'
  )
  returning id into new_poll_id;

  insert into poll_options (poll_id, label, sort_order)
  select new_poll_id, opt, ord
  from unnest(array['Por día', 'Por semana', 'Por mes', 'Por temporada']) with ordinality as o(opt, ord);

  insert into polls (title, description, status, category, poll_type)
  values (
    'Límite de sobres que se pueden comprar',
    'Biwenger deja poner un tope de cantidad de sobres comprables (o dejarlo "Sin límite"). Escribí el número que te parece, o "Sin límite".',
    'open', 'Mercado', 'text'
  );

  insert into polls (title, description, status, category, poll_type)
  values (
    '¿Qué tipos de sobres se pueden comprar?',
    'Bronce (jugadores de 0-5M), Plata (5-10M) y Oro (10-30M). Podés marcar más de uno.',
    'open', 'Mercado', 'multi'
  )
  returning id into new_poll_id;

  insert into poll_options (poll_id, label, sort_order)
  select new_poll_id, opt, ord
  from unnest(array['Bronce', 'Plata', 'Oro']) with ordinality as o(opt, ord);
end $$;
