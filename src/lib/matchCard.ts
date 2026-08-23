import { renderPollCard, isPollExpired, collapseClosedCard, type PollCardPlayer } from './pollCard';
import { crestImgHtml } from './crests';

export type MatchResult = { homeScore: number | null; awayScore: number | null } | null;

/** Whether a Jornada match is done accepting votes — same rule renderMatchCard
 * uses internally, exported so pages can sort not-yet-played matches first
 * without duplicating the kickoff/expiry check. */
export function isMatchFinished(poll: any): boolean {
  const kickoffPassed = !!poll.kickoff_at && new Date(poll.kickoff_at).getTime() <= Date.now();
  return kickoffPassed || isPollExpired(poll);
}

/** Renders a Jornada poll (title "Home vs Away") as a rich match card:
 * crests, home/away, venue, kickoff time in Argentina time, then reuses
 * renderPollCard's option buttons/voting logic underneath. `result` (from
 * poll_results.home_score/away_score) shows the real scoreline instead of
 * "VS" once the match has been resolved by hand. */
export function renderMatchCard(
  poll: any,
  allVotes: any[],
  player: PollCardPlayer,
  onVote: (updatedVotes: any[]) => void,
  base: string,
  result: MatchResult = null
): HTMLElement {
  const [home, away] = poll.title.split(' vs ');
  // Voting closes the instant kickoff hits — status stays 'open' in the DB
  // (nobody flips it match by match), so this is purely a client-side
  // clock check each render.
  const kickoffPassed = !!poll.kickoff_at && new Date(poll.kickoff_at).getTime() <= Date.now();
  const effectivePoll =
    (kickoffPassed || isPollExpired(poll)) && poll.status === 'open' ? { ...poll, status: 'closed' } : poll;
  const hasScore = !!result && result.homeScore != null && result.awayScore != null;

  const card = document.createElement('article');
  card.className = 'match-card';

  const head = document.createElement('div');
  head.className = 'match-head';
  card.appendChild(head);

  const teams = document.createElement('div');
  teams.className = 'match-teams';
  teams.innerHTML = `
    <div class="match-team">
      ${crestImgHtml(home, base)}
      <span class="match-team-name">${home}</span>
    </div>
    ${
      hasScore
        ? `<span class="match-score">${result!.homeScore} - ${result!.awayScore}</span>`
        : '<span class="match-vs">VS</span>'
    }
    <div class="match-team">
      ${crestImgHtml(away, base)}
      <span class="match-team-name">${away}</span>
    </div>
  `;
  head.appendChild(teams);

  if (poll.venue || poll.kickoff_at) {
    const meta = document.createElement('div');
    meta.className = 'match-meta';
    meta.innerHTML = `
      ${poll.venue ? `<span class="match-venue">🏟️ ${poll.venue}</span>` : ''}
      ${poll.kickoff_at ? `<span class="match-time">🕒 ${formatArgentinaTime(poll.kickoff_at)}</span>` : ''}
      ${kickoffPassed ? `<span class="match-locked">🔒 Finalizado</span>` : ''}
    `;
    head.appendChild(meta);
  }

  // selfUpdate:false because renderPollCard's own in-place replaceWith
  // would target the inner (discarded) card, not this one — we replace
  // the whole match-card ourselves instead.
  const inner = renderPollCard(
    effectivePoll,
    allVotes,
    player,
    (updated) => {
      onVote(updated);
      card.replaceWith(renderMatchCard(poll, updated, player, onVote, base, result));
    },
    { selfUpdate: false }
  );
  const options = inner.querySelector('.options');
  if (options) card.appendChild(options);

  return collapseClosedCard(card, effectivePoll.status === 'open', '.match-head');
}

function formatArgentinaTime(iso: string): string {
  const date = new Date(iso);
  const dateStr = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
  const timeStr = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date);
  return `${dateStr}, ${timeStr} arg.`;
}
