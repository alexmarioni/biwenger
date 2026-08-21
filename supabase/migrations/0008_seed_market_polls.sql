do $$
declare
  poll record;
  new_poll_id uuid;
begin
  for poll in
    select * from (values
      ('Mercado', 'Farmear sobres viendo videos',
        'En la versión gratis, Biwenger te deja ganar una moneda de oro extra por ver un video publicitario, para abrir un sobre más. Es una forma de conseguir jugadores grindeando tiempo viendo ads, no por armar bien el equipo.',
        array['Sí, se puede farmear', 'No, queda prohibido']),
      ('Mercado', 'Comprar sobres con el saldo del equipo',
        'Los sobres (Oro/Plata/Bronce) te dan un jugador al azar dentro de un rango de valor, pagando con el saldo de tu equipo, sin pasar por el mercado de pujas.',
        array['Sí, permitido', 'No, desactivado'])
    ) as t(category, title, description, options)
  loop
    insert into polls (title, description, status, category)
    values (poll.title, poll.description, 'open', poll.category)
    returning id into new_poll_id;

    insert into poll_options (poll_id, label, sort_order)
    select new_poll_id, opt, ord
    from unnest(poll.options) with ordinality as o(opt, ord);
  end loop;
end $$;
