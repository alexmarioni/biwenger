do $$
declare
  new_poll_id uuid;
begin
  insert into polls (title, description, status, category)
  values (
    '¿Sobre qué competencia armamos la liga?',
    'Biwenger deja crear la liga sobre distintas competiciones reales, no solo LaLiga.',
    'open',
    'Liga'
  )
  returning id into new_poll_id;

  insert into poll_options (poll_id, label, sort_order)
  select new_poll_id, opt, ord
  from unnest(array[
    'LaLiga (España)',
    'Segunda División (España)',
    'Premier League (Inglaterra)',
    'Serie A (Italia)',
    'Ligue 1 (Francia)',
    'Liga de Portugal',
    'Liga MX (México)',
    'Champions League'
  ]) with ordinality as o(opt, ord);
end $$;
