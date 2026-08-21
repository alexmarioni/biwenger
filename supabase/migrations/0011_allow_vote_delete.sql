-- Ahora que "votes" ya no tiene unique(poll_id, player_id), cambiar de
-- opción (single) o destildar una opción (multi) requiere poder borrar la
-- fila anterior desde el cliente.

create policy "votes_delete_public" on votes
  for delete using (true);
