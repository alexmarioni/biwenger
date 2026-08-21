// Resolves real outcomes for scored predictions and writes them into
// poll_results, which src/lib/scoring.ts reads to compute the /puntaje
// leaderboard. Three things get resolved here, all from ESPN's free,
// unauthenticated site API (same source already validated for squads):
//
//  1. Jornada match winners — once a match's kickoff is well in the past
//     and ESPN reports it STATUS_FINAL, mark the correct "Gana X"/"Empate"
//     option.
//  2. Clasificación — scored against the *live* current league standings
//     (is_final stays false; this snapshot updates every run and only
//     gets manually frozen once the real season actually ends).
//  3. "Último equipo en ganar un partido" — derived from (1) rather than
//     a new data source: once exactly one of the 20 clubs still has zero
//     recorded wins across every tracked Jornada result, that's the answer.
//
// Needs a direct Postgres connection (SUPABASE_DB_URL) since poll_results
// has no public INSERT policy. Run by
// .github/workflows/update-results.yml every few hours (also runnable
// locally: SUPABASE_DB_URL=... node scripts/fetch-results.mjs).

import pg from 'pg';

const { Client } = pg;
const USER_AGENT = 'biwenger-liga-bot/1.0 (https://github.com/alexmarioni/biwenger)';

async function espnGet(path) {
  const res = await fetch(`https://site.web.api.espn.com${path}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`ESPN ${path} responded ${res.status}`);
  return res.json();
}

function dateKey(iso) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ESPN's displayName sometimes differs slightly from ours (e.g. "AFC
// Bournemouth" vs "Bournemouth") — loose substring match after
// normalizing case/punctuation/the "AFC" prefix.
function teamsMatch(espnName, ourName) {
  if (!espnName || !ourName) return false;
  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/^afc\s+|\s+afc$/g, '')
      .replace(/[^a-z]/g, '');
  const a = norm(espnName);
  const b = norm(ourName);
  return a.includes(b) || b.includes(a);
}

async function resolveJornadaResults(client) {
  const { rows } = await client.query(`
    select p.id, p.title, p.kickoff_at, o.id as option_id, o.label
    from polls p
    join poll_options o on o.poll_id = p.id
    where p.category = 'Jornada'
      and p.kickoff_at < now() - interval '150 minutes'
      and not exists (select 1 from poll_results r where r.poll_id = p.id)
  `);

  const byPoll = new Map();
  for (const row of rows) {
    if (!byPoll.has(row.id)) byPoll.set(row.id, { title: row.title, kickoff_at: row.kickoff_at, options: [] });
    byPoll.get(row.id).options.push({ id: row.option_id, label: row.label });
  }

  if (byPoll.size === 0) {
    console.log('No pending Jornada results to resolve.');
    return;
  }

  const scoreboardCache = new Map();
  for (const [pollId, poll] of byPoll) {
    const [home, away] = poll.title.split(' vs ');
    const key = dateKey(poll.kickoff_at);
    if (!scoreboardCache.has(key)) {
      scoreboardCache.set(key, espnGet(`/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${key}`));
    }

    let data;
    try {
      data = await scoreboardCache.get(key);
    } catch (err) {
      console.warn(`ESPN scoreboard fetch failed for ${key}: ${err.message}`);
      continue;
    }

    const events = data.events ?? [];
    const match = events.find((e) => {
      const comp = e.competitions[0];
      const h = comp.competitors.find((c) => c.homeAway === 'home')?.team?.displayName;
      const a = comp.competitors.find((c) => c.homeAway === 'away')?.team?.displayName;
      return teamsMatch(h, home) && teamsMatch(a, away);
    });

    if (!match) {
      console.log(`No ESPN match found yet for ${poll.title}`);
      continue;
    }

    const comp = match.competitions[0];
    if (comp.status.type.name !== 'STATUS_FINAL') {
      console.log(`${poll.title} not final yet (${comp.status.type.name})`);
      continue;
    }

    const homeC = comp.competitors.find((c) => c.homeAway === 'home');
    const awayC = comp.competitors.find((c) => c.homeAway === 'away');
    const homeScore = Number(homeC.score);
    const awayScore = Number(awayC.score);

    let winnerLabel;
    if (homeScore > awayScore) winnerLabel = `Gana ${home}`;
    else if (awayScore > homeScore) winnerLabel = `Gana ${away}`;
    else winnerLabel = 'Empate';

    const option = poll.options.find((o) => o.label === winnerLabel);
    if (!option) {
      console.warn(`Could not match winner label "${winnerLabel}" to an option for ${poll.title}`);
      continue;
    }

    await client.query(
      `insert into poll_results (poll_id, correct_option_id, is_final, source)
       values ($1, $2, true, 'espn-scoreboard')
       on conflict (poll_id) do update
         set correct_option_id = excluded.correct_option_id, is_final = true, resolved_at = now(), source = excluded.source`,
      [pollId, option.id]
    );
    console.log(`Resolved ${poll.title} -> ${winnerLabel} (${homeScore}-${awayScore})`);
  }
}

async function resolveClasificacionStandings(client) {
  const { rows: pollRows } = await client.query(
    `select id from polls where category = 'Clasificación' and poll_type = 'ranking' limit 1`
  );
  const poll = pollRows[0];
  if (!poll) {
    console.log('No Clasificación poll found.');
    return;
  }

  const { rows: options } = await client.query('select id, label from poll_options where poll_id = $1', [poll.id]);

  let data;
  try {
    data = await espnGet('/apis/v2/sports/soccer/eng.1/standings');
  } catch (err) {
    console.warn(`ESPN standings fetch failed: ${err.message}`);
    return;
  }

  const entries = data.children?.[0]?.standings?.entries ?? [];
  const ranked = entries
    .map((e) => {
      const rankStat = e.stats.find((s) => s.name === 'rank');
      return { name: e.team.displayName, rank: rankStat ? Number(rankStat.value) : null };
    })
    .filter((e) => e.rank != null)
    .sort((a, b) => a.rank - b.rank);

  const orderedIds = [];
  for (const entry of ranked) {
    const option = options.find((o) => teamsMatch(entry.name, o.label));
    if (option) orderedIds.push(option.id);
  }

  if (orderedIds.length < 15) {
    console.warn(`Only matched ${orderedIds.length}/20 teams from ESPN standings — skipping to avoid a bad scoring snapshot.`);
    return;
  }

  await client.query(
    `insert into poll_results (poll_id, correct_order, is_final, source)
     values ($1, $2, false, 'espn-standings')
     on conflict (poll_id) do update
       set correct_order = excluded.correct_order, resolved_at = now(), source = excluded.source`,
    [poll.id, JSON.stringify(orderedIds)]
  );
  console.log(`Updated Clasificación live standings snapshot (${orderedIds.length}/20 teams matched).`);
}

async function resolveLastTeamToWin(client) {
  const { rows: pollRows } = await client.query(
    `select id from polls where title = 'Último equipo en ganar un partido' limit 1`
  );
  const poll = pollRows[0];
  if (!poll) return;

  const { rows: already } = await client.query('select 1 from poll_results where poll_id = $1', [poll.id]);
  if (already.length > 0) return;

  const { rows: options } = await client.query('select id, label from poll_options where poll_id = $1', [poll.id]);

  const { rows: jornadaWins } = await client.query(`
    select o.label
    from poll_results r
    join poll_options o on o.id = r.correct_option_id
    join polls p on p.id = r.poll_id
    where p.category = 'Jornada' and o.label like 'Gana %'
  `);

  const teamsWithWin = new Set(jornadaWins.map((r) => r.label.replace(/^Gana /, '')));
  const teamsWithoutWin = options.filter((o) => !teamsWithWin.has(o.label));

  if (teamsWithoutWin.length !== 1) {
    console.log(`${teamsWithoutWin.length} teams still without a recorded win — "último equipo" not resolved yet.`);
    return;
  }

  await client.query(
    `insert into poll_results (poll_id, correct_option_id, is_final, source)
     values ($1, $2, true, 'derived-from-jornada')
     on conflict (poll_id) do nothing`,
    [poll.id, teamsWithoutWin[0].id]
  );
  console.log(`Resolved "último equipo en ganar" -> ${teamsWithoutWin[0].label}`);
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await resolveJornadaResults(client);
    await resolveClasificacionStandings(client);
    await resolveLastTeamToWin(client);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('fetch-results failed:', err.message);
  process.exitCode = 1;
});
