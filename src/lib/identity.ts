const STORAGE_KEY = 'biwenger_player';

export interface StoredPlayer {
  id: string;
  name: string;
  emoji: string;
}

export function getStoredPlayer(): StoredPlayer | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPlayer;
  } catch {
    return null;
  }
}

export function setStoredPlayer(player: StoredPlayer): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

export function clearStoredPlayer(): void {
  localStorage.removeItem(STORAGE_KEY);
}
