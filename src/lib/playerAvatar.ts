export interface AvatarLike {
  emoji: string;
  avatar_url?: string | null;
}

/** Returns an <img> with the player's crest if they have one, else their emoji. */
export function playerAvatarHtml(player: AvatarLike, base: string, className = ''): string {
  if (player.avatar_url) {
    return `<img class="player-avatar-img ${className}" src="${base}${player.avatar_url}" alt="" />`;
  }
  return `<span class="player-avatar-emoji ${className}">${player.emoji}</span>`;
}
