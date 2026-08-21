// Pulls full squad lists for the league's 20 Premier League clubs from
// ESPN's unofficial site API (no key, open CORS, confirmed live) and writes
// a flat players.json the site uses to power the goleador/asistidor/MVP/
// fichaje autocomplete predictions — so voters pick from ~500 real players
// instead of a hand-curated shortlist that inevitably misses names or goes
// stale. Run weekly by .github/workflows/update-squads.yml (also runnable
// locally: `node scripts/fetch-squads.mjs`).

import { writeFile } from 'node:fs/promises';

const OUT_PATH = new URL('../public/data/players.json', import.meta.url);
const USER_AGENT = 'biwenger-liga-bot/1.0 (https://github.com/alexmarioni/biwenger)';

// ESPN's eng.1 (Premier League) team IDs, mapped to the same canonical team
// names used across the app (src/lib/crests.ts) so crestPath() resolves.
const CLUBS = [
  ['359', 'Arsenal'],
  ['362', 'Aston Villa'],
  ['349', 'Bournemouth'],
  ['337', 'Brentford'],
  ['331', 'Brighton'],
  ['363', 'Chelsea'],
  ['388', 'Coventry City'],
  ['384', 'Crystal Palace'],
  ['368', 'Everton'],
  ['370', 'Fulham'],
  ['306', 'Hull City'],
  ['373', 'Ipswich Town'],
  ['357', 'Leeds United'],
  ['364', 'Liverpool'],
  ['382', 'Manchester City'],
  ['360', 'Manchester United'],
  ['361', 'Newcastle United'],
  ['393', 'Nottingham Forest'],
  ['366', 'Sunderland'],
  ['367', 'Tottenham Hotspur'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRoster(teamId) {
  const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/${teamId}/roster`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`ESPN roster ${teamId} responded ${res.status}`);
  const data = await res.json();
  return data.athletes ?? [];
}

async function main() {
  const players = [];
  let failures = 0;

  for (const [teamId, teamName] of CLUBS) {
    try {
      const athletes = await fetchRoster(teamId);
      for (const a of athletes) {
        if (!a.displayName) continue;
        players.push({
          name: a.displayName,
          team: teamName,
          position: a.position?.abbreviation ?? null,
        });
      }
      console.log(`${teamName}: ${athletes.length} players`);
    } catch (err) {
      failures += 1;
      console.warn(`Failed to fetch ${teamName} (${teamId}): ${err.message}`);
    }
    await sleep(300); // be polite, avoid tripping any rate limit
  }

  if (players.length === 0) {
    console.error('Fetched 0 players across every club — leaving existing players.json untouched.');
    process.exitCode = 1;
    return;
  }

  players.sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name));

  const payload = {
    generated_at: new Date().toISOString(),
    source: 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/eng.1/',
    count: players.length,
    failed_clubs: failures,
    players,
  };

  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${players.length} players (${failures} club fetch failures) to ${OUT_PATH.pathname}`);
}

main().catch((err) => {
  console.error('fetch-squads failed:', err.message);
  process.exitCode = 1;
});
