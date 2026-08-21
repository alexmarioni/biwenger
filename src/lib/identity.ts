const STORAGE_KEY = 'biwenger_player';

export interface StoredPlayer {
  id: string;
  name: string;
  emoji: string;
  avatar_url?: string | null;
}

function isValidStoredPlayer(value: unknown): value is StoredPlayer {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as StoredPlayer).id === 'string' &&
    (value as StoredPlayer).id.length > 0 &&
    typeof (value as StoredPlayer).name === 'string' &&
    (value as StoredPlayer).name.length > 0
  );
}

/** Any malformed stored value (missing id/name, wrong shape) used to get
 * trusted as a real logged-in player everywhere — since every page redirects
 * to /identidad only when there's NO player at all, a corrupted-but-truthy
 * value could redirect someone away from the picker into pages that then
 * silently failed to vote (player_id undefined), with no visible way back.
 * Now it's treated as no-player and self-heals by clearing the bad value. */
export function getStoredPlayer(): StoredPlayer | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (isValidStoredPlayer(parsed)) return parsed;
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function setStoredPlayer(player: StoredPlayer): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

export function clearStoredPlayer(): void {
  localStorage.removeItem(STORAGE_KEY);
}
