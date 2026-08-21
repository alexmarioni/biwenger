// Scrapes Wikipedia's "List of English football transfers summer 2026"
// wikitext for confirmed transfers involving our 20 Premier League clubs,
// and writes a compact JSON file the site reads client-side. Run weekly by
// .github/workflows/update-transfers.yml (also runnable locally: `node
// scripts/fetch-transfers.mjs`). Best-effort: if Wikipedia's table layout
// changes and parsing yields nothing, the previous JSON file is left as-is
// rather than being overwritten with an empty result.

import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const WIKI_PAGE = 'List of English football transfers summer 2026';
const OUT_PATH = new URL('../public/data/transfers.json', import.meta.url);
const USER_AGENT = 'biwenger-liga-bot/1.0 (https://github.com/alexmarioni/biwenger)';

// Same 20 clubs used across the app (src/lib/crests.ts) for this league's
// Premier League. Kept as a separate literal here since this script runs
// standalone in CI, outside the Astro/Vite build.
const PL_CLUBS = [
  'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton',
  'Chelsea', 'Coventry City', 'Crystal Palace', 'Everton', 'Fulham',
  'Hull City', 'Ipswich Town', 'Leeds United', 'Liverpool', 'Manchester City',
  'Manchester United', 'Newcastle United', 'Nottingham Forest', 'Sunderland', 'Tottenham Hotspur',
];

function stripCellAttrs(cell) {
  const m = cell.match(/^\s*(?:rowspan|colspan|style)\s*=\s*["'][^"']*["']\s*\|(.*)$/i);
  return m ? m[1] : cell;
}

/** Refs/comments can span multiple wikitext lines (a multi-line {{cite
 * web|...}} inside <ref>...</ref> is common). Must strip these from the raw
 * text before splitting into per-line cells, or the ref's internal `|`
 * separated lines get mistaken for new table cells. */
function stripRefsAndComments(text) {
  let t = text;
  t = t.replace(/<!--[\s\S]*?-->/g, '');
  t = t.replace(/<ref[^>]*\/>/gi, '');
  t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  return t;
}

function cleanWikitext(text) {
  if (!text) return '';
  let t = text;
  t = t.replace(/\{\{ntsh\|[^}]*\}\}/gi, '');
  t = t.replace(/\{\{sortname\|([^|}]*)\|([^|}]*)(?:\|[^}]*)?\}\}/gi, (_m, a, b) => `${a} ${b}`.trim());
  t = t.replace(/\{\{flagg?\|[^}]*\}\}/gi, '');
  // Any other leftover template call — drop rather than risk leaking raw markup.
  t = t.replace(/\{\{[^{}]*\}\}/g, '');
  t = t.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2');
  t = t.replace(/\[\[([^\]]*)\]\]/g, '$1');
  t = t.replace(/'''?/g, '');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/** Parses every {| ... |} wikitable in the given wikitext into
 * { headers, rows } blocks, using the header row to name columns so it
 * survives tables with different column sets (transfers vs. loans, etc). */
function parseWikiTables(rawWikitext) {
  const wikitext = stripRefsAndComments(rawWikitext);
  const tables = [];
  let inTable = false;
  let headers = [];
  let rows = [];
  let currentRow = [];
  let lastRow = [];

  function flushRow() {
    if (currentRow.length === 0) return;
    let row = currentRow;
    if (headers.length && row.length < headers.length && lastRow.length === headers.length) {
      const missing = headers.length - row.length;
      row = [...lastRow.slice(0, missing), ...row];
    }
    if (headers.length && row.length === headers.length) {
      rows.push(row);
      lastRow = row;
    }
    currentRow = [];
  }

  for (const raw of wikitext.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('{|')) {
      inTable = true;
      headers = [];
      rows = [];
      currentRow = [];
      lastRow = [];
      continue;
    }
    if (line.startsWith('|}')) {
      flushRow();
      if (headers.length && rows.length) tables.push({ headers, rows });
      inTable = false;
      continue;
    }
    if (!inTable) continue;
    if (line.startsWith('|-')) {
      flushRow();
      continue;
    }
    if (line.startsWith('!')) {
      const parts = line.replace(/^!+/, '').split('!!');
      for (const p of parts) headers.push(cleanWikitext(stripCellAttrs(p)).toLowerCase());
      continue;
    }
    if (line.startsWith('|')) {
      const parts = line.slice(1).split('||');
      for (const p of parts) currentRow.push(cleanWikitext(stripCellAttrs(p)));
      continue;
    }
  }
  return tables;
}

function extractPlTransfers(tables) {
  const out = [];
  for (const { headers, rows } of tables) {
    const colIndex = (needle) => headers.findIndex((h) => h.includes(needle));
    const dateCol = colIndex('date');
    const playerCol = colIndex('player');
    const fromCol = colIndex('moving from') !== -1 ? colIndex('moving from') : colIndex('from');
    const toCol = colIndex('moving to') !== -1 ? colIndex('moving to') : colIndex('to');
    const feeCol = colIndex('fee');
    if (playerCol === -1 || fromCol === -1 || toCol === -1) continue;

    for (const row of rows) {
      const from = row[fromCol] ?? '';
      const to = row[toCol] ?? '';
      if (!PL_CLUBS.includes(from) && !PL_CLUBS.includes(to)) continue;
      const record = {
        date: dateCol !== -1 ? row[dateCol] : null,
        player: row[playerCol],
        from,
        to,
        fee: feeCol !== -1 ? row[feeCol] : null,
      };
      // A rare wiki-editor quirk (a template call itself wrapped across two
      // lines, outside of any <ref>) can leave raw markup in a cell — skip
      // rather than publish a garbled row.
      if (Object.values(record).some((v) => typeof v === 'string' && /[{}[\]]/.test(v))) continue;
      out.push(record);
    }
  }
  return out;
}

async function main() {
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(WIKI_PAGE)}&prop=wikitext&format=json&formatversion=2`;
  const res = await fetch(apiUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Wikipedia API responded ${res.status}`);
  const data = await res.json();
  const wikitext = data?.parse?.wikitext;
  if (!wikitext) throw new Error('No wikitext in Wikipedia API response');

  const tables = parseWikiTables(wikitext);
  const transfers = extractPlTransfers(tables).reverse(); // most recent first (source table is chronological ascending)

  if (transfers.length === 0) {
    console.warn('Parsed 0 PL transfers — leaving existing transfers.json untouched (Wikipedia layout may have changed).');
    return;
  }

  const payload = {
    generated_at: new Date().toISOString(),
    source: `https://en.wikipedia.org/wiki/${encodeURIComponent(WIKI_PAGE.replace(/ /g, '_'))}`,
    count: transfers.length,
    transfers: transfers.slice(0, 60),
  };

  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${payload.transfers.length} transfers to ${OUT_PATH.pathname}`);
}

main().catch((err) => {
  console.error('fetch-transfers failed:', err.message);
  // Don't fail the whole CI run over a scrape hiccup — keep last good data.
  process.exitCode = existsSync(OUT_PATH) ? 0 : 1;
});
