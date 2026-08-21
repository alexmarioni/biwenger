import { crestPath } from './crests';
import { playerAvatarHtml } from './playerAvatar';

/** A collapsible "compare everyone's picks" table for the Clasificación
 * ranking poll: rows are teams (sorted by average predicted position),
 * columns are each player who submitted, cells are that player's
 * predicted position for that team. Purely additive/read-only — doesn't
 * touch the drag-and-drop ranking card itself. */
export function renderRankingComparison(poll: any, allVotes: any[], players: any[], base: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'rank-compare';

  const pollVotes = allVotes.filter((v) => v.poll_id === poll.id);
  const parsed = pollVotes
    .map((v) => {
      if (!v.text_value) return null;
      try {
        const order = JSON.parse(v.text_value);
        return Array.isArray(order) ? { playerId: v.player_id, order: order as string[] } : null;
      } catch {
        return null;
      }
    })
    .filter((v): v is { playerId: string; order: string[] } => !!v);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'btn btn-ghost btn-small rank-compare-toggle';
  toggle.textContent = `📋 Comparar pronósticos de todos (${parsed.length})`;
  wrap.appendChild(toggle);

  const body = document.createElement('div');
  body.className = 'rank-compare-body';
  body.hidden = true;
  wrap.appendChild(body);

  toggle.addEventListener('click', () => {
    body.hidden = !body.hidden;
    if (!body.hidden && !body.dataset.rendered) {
      renderTable();
      body.dataset.rendered = '1';
    }
  });

  function renderTable() {
    if (parsed.length === 0) {
      body.innerHTML = `<p class="rank-detail-empty">Todavía nadie envió su pronóstico completo.</p>`;
      return;
    }

    const options = [...(poll.poll_options ?? [])];
    const voters = parsed
      .map((p) => ({ ...p, player: players.find((pl) => pl.id === p.playerId) }))
      .filter((v): v is { playerId: string; order: string[]; player: any } => !!v.player);

    if (voters.length === 0) {
      body.innerHTML = `<p class="rank-detail-empty">Todavía nadie envió su pronóstico completo.</p>`;
      return;
    }

    const rows = options
      .map((opt) => {
        const positions = voters.map((v) => {
          const idx = v.order.indexOf(opt.id);
          return idx === -1 ? null : idx + 1;
        });
        const valid = positions.filter((p): p is number => p != null);
        const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 99;
        return { option: opt, positions, avg };
      })
      .sort((a, b) => a.avg - b.avg);

    body.innerHTML = `
      <div class="rank-compare-scroll">
        <table class="rank-compare-table">
          <thead>
            <tr>
              <th class="rank-compare-team-head">Equipo</th>
              ${voters.map((v) => `<th title="${v.player.name}">${playerAvatarHtml(v.player, base, 'rank-compare-avatar')}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((r) => {
                const path = crestPath(r.option.label);
                return `
              <tr>
                <td class="rank-compare-team">
                  ${path ? `<img class="rank-compare-crest" src="${base}${path}" alt="${r.option.label}" />` : ''}
                  ${r.option.label}
                </td>
                ${r.positions.map((p) => `<td class="rank-compare-cell">${p ?? '—'}</td>`).join('')}
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  return wrap;
}
