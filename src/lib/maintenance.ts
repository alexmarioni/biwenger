import { supabase } from './supabase';

/**
 * Si el modo mantenimiento está prendido, redirige a /mantenimiento y
 * devuelve true (el caller debe cortar ahí su propia lógica).
 */
export async function redirectIfMaintenance(base: string): Promise<boolean> {
  const { data } = await supabase
    .from('site_settings')
    .select('maintenance')
    .eq('id', 1)
    .maybeSingle();

  if (data?.maintenance) {
    window.location.href = `${base}mantenimiento`;
    return true;
  }
  return false;
}
