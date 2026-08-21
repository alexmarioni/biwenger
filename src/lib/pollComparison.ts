import { playerAvatarHtml } from './playerAvatar';

/** Collapsible "who answered what" comparison for a group of polls (e.g.
 * every Minijuegos prediction): each poll gets its own breakdown, grouping
 * votes by their answer (option label, or text_value for autocomplete/
 * player_autocomplete/text polls) with the voters' avatars next to each
 * answer — so it reads the same way regardless of poll_type. */
export function renderPollGroupComparison(
  polls: any[],
  allVotes: any[],
  players: any[],
  base: string,
  opts: { title: string }
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'poll-compare';

  const totalVotes = polls.reduce((sum, p) => sum + allVotes.filter((v) => v.poll_id === p.id).length, 0);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'btn btn-ghost btn-small poll-compare-toggle';
  toggle.textContent = `📋 ${opts.title} (${totalVotes})`;
  wrap.appendChild(toggle);

  const body = document.createElement('div');
  body.className = 'poll-compare-body';
  body.hidden = true;
  wrap.appendChild(body);

  toggle.addEventListener('click', () => {
    body.hidden = !body.hidden;
    if (!body.hidden && !body.dataset.rendered) {
      renderBody();
      body.dataset.rendered = '1';
    }
  });

  function labelFor(poll: any, vote: any): string {
    if (vote.text_value != null) return vote.text_value;
    const opt = (poll.poll_options ?? []).find((o: any) => o.id === vote.option_id);
    return opt?.label ?? '—';
  }

  function renderBody() {
    body.innerHTML = polls
      .map((poll) => {
        const pollVotes = allVotes.filter((v) => v.poll_id === poll.id);
        if (pollVotes.length === 0) {
          return `
            <div class="poll-compare-section">
              <p class="poll-compare-title">${poll.title}</p>
              <p class="rank-detail-empty">Todavía nadie respondió.</p>
            </div>
          `;
        }

        const groups = new Map<string, string[]>();
        for (const v of pollVotes) {
          const label = labelFor(poll, v);
          if (!groups.has(label)) groups.set(label, []);
          groups.get(label)!.push(v.player_id);
        }

        const rows = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
        const maxCount = Math.max(...rows.map(([, ids]) => ids.length));

        return `
          <div class="poll-compare-section">
            <p class="poll-compare-title">${poll.title}</p>
            <div class="rank-bars">
              ${rows
                .map(([label, ids]) => {
                  const pct = Math.max(8, Math.round((ids.length / maxCount) * 100));
                  const avatars = ids
                    .map((id) => players.find((p) => p.id === id))
                    .filter(Boolean)
                    .map((p) => playerAvatarHtml(p, base, 'rank-voter-avatar'))
                    .join('');
                  return `
                    <div class="rank-bar-row">
                      <span class="poll-compare-label" title="${label}">${label}</span>
                      <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${pct}%"></div></div>
                      <span class="rank-bar-count">${ids.length}</span>
                      <span class="rank-bar-voters">${avatars}</span>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        `;
      })
      .join('');
  }

  return wrap;
}
