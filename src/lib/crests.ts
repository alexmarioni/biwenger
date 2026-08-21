const CREST_SLUGS: Record<string, string> = {
  Arsenal: 'arsenal',
  'Aston Villa': 'aston-villa',
  Bournemouth: 'bournemouth',
  Brentford: 'brentford',
  Brighton: 'brighton',
  Chelsea: 'chelsea',
  'Coventry City': 'coventry',
  'Crystal Palace': 'crystal-palace',
  Everton: 'everton',
  Fulham: 'fulham',
  'Hull City': 'hull',
  'Ipswich Town': 'ipswich',
  'Leeds United': 'leeds',
  Liverpool: 'liverpool',
  'Manchester City': 'man-city',
  'Manchester United': 'man-utd',
  'Newcastle United': 'newcastle',
  'Nottingham Forest': 'forest',
  Sunderland: 'sunderland',
  'Tottenham Hotspur': 'tottenham',
};

/** Returns the crest <img> src path (relative to base) for a PL club name, or null if unknown. */
export function crestPath(teamName: string): string | null {
  const slug = CREST_SLUGS[teamName];
  return slug ? `crests/${slug}.webp` : null;
}

export function crestImgHtml(teamName: string, base: string, className = 'team-crest'): string {
  const path = crestPath(teamName);
  return path
    ? `<img class="${className}" src="${base}${path}" alt="${teamName}" />`
    : `<span class="${className} team-crest-fallback">⚽</span>`;
}
