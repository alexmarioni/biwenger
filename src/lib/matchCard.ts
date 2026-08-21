import { renderPollCard, type PollCardPlayer } from './pollCard';
import { crestImgHtml } from './crests';

/** Renders a Jornada poll (title "Home vs Away") as a rich match card:
 * crests, home/away, venue, kickoff time in Argentina time, then reuses
 * renderPollCard's option buttons/voting logic underneath. */
export function renderMatchCard(
  poll: any,
  allVotes: any[],
  player: PollCardPlayer,
  onVote: (updatedVotes: any[]) => void,
  base: string
): HTMLElement {
  const [home, away] = poll.title.split(' vs ');

  const card = document.createElement('article');
  card.className = 'match-card';

  const teams = document.createElement('div');
  teams.className = 'match-teams';
  teams.innerHTML = `
    <div class="match-team">
      ${crestImgHtml(home, base)}
      <span class="match-team-name">${home}</span>
    </div>
    <span class="match-vs">VS</span>
    <div class="match-team">
      ${crestImgHtml(away, base)}
      <span class="match-team-name">${away}</span>
    </div>
  `;
  card.appendChild(teams);

  if (poll.venue || poll.kickoff_at) {
    const meta = document.createElement('div');
    meta.className = 'match-meta';
    meta.innerHTML = `
      ${poll.venue ? `<span class="match-venue">🏟️ ${poll.venue}</span>` : ''}
      ${poll.kickoff_at ? `<span class="match-time">🕒 ${formatArgentinaTime(poll.kickoff_at)}</span>` : ''}
    `;
    card.appendChild(meta);
  }

  // selfUpdate:false because renderPollCard's own in-place replaceWith
  // would target the inner (discarded) card, not this one — we replace
  // the whole match-card ourselves instead.
  const inner = renderPollCard(
    poll,
    allVotes,
    player,
    (updated) => {
      onVote(updated);
      card.replaceWith(renderMatchCard(poll, updated, player, onVote, base));
    },
    { selfUpdate: false }
  );
  const options = inner.querySelector('.options');
  if (options) card.appendChild(options);

  return card;
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
