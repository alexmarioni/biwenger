-- Fecha límite de voto opcional. NULL (default) significa "sin límite",
-- igual que antes. Se setea a mano por SQL cuando una encuesta puntual
-- necesita cerrar en un plazo corto (ej: una decisión que hay que resolver
-- ya). Es un chequeo puramente client-side (misma idea que el cierre por
-- kickoff_at de las encuestas de Jornada): nadie flipea `status` a mano
-- cuando se cumple el plazo, el front la trata como cerrada apenas pasa
-- closes_at.
alter table polls add column if not exists closes_at timestamptz;
