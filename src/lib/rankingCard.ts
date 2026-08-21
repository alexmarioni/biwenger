import { supabase } from './supabase';
import { crestPath } from './crests';
import { playerAvatarHtml } from './playerAvatar';
import type { PollCardPlayer } from './pollCard';

function parseOrder(textValue: string | null | undefined, options: any[]): any[] {
  if (!textValue) return options;
  try {
    const ids: string[] = JSON.parse(textValue);
    const byId = new Map(options.map((o) => [o.id, o]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as any[];
    const missing = options.filter((o) => !ids.includes(o.id));
    return [...ordered, ...missing];
  } catch {
    return options;
  }
}

/**
 * Renders the "predicí la tabla" ranking poll: a drag-reorderable list of
 * the 20 clubs, saved as a single vote row with text_value = JSON array of
 * option_id in the chosen order. Clicking the 📊 button on a row expands an
 * inline panel showing the position distribution + who (by avatar) picked
 * that team for each position, computed from every player's stored order.
 *
 * `lockAt` (ISO timestamp, typically the first Jornada kickoff) closes
 * editing once matches start — but only for players who already had a
 * prediction in. Anyone who never submitted can still send their first one
 * late; they just can't touch it again after that.
 */
export function renderRankingCard(
  poll: any,
  allVotes: any[],
  player: PollCardPlayer,
  players: any[],
  onVote: (updatedVotes: any[]) => void,
  base: string,
  lockAt: string | null = null
): HTMLElement {
  const pollVotes = allVotes.filter((v) => v.poll_id === poll.id);
  const myVote = player ? pollVotes.find((v) => v.player_id === player.id) : undefined;
  const baseOptions = [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const isOpen = poll.status === 'open';
  const pastLock = !!lockAt && Date.now() >= new Date(lockAt).getTime();
  const lockedOut = pastLock && !!myVote;
  const canVote = !!player && isOpen && !lockedOut;

  const card = document.createElement('article');
  card.className = 'poll-card ranking-card';

  const head = document.createElement('div');
  head.className = 'poll-head';
  head.innerHTML = `
    <span class="poll-title">${poll.title}</span>
    <span class="poll-badges">
      <span class="badge ${isOpen ? '' : 'badge-closed'}">${isOpen ? 'Abierta' : 'Cerrada'}</span>
    </span>
  `;
  card.appendChild(head);

  if (poll.description) {
    const desc = document.createElement('p');
    desc.className = 'poll-desc';
    desc.textContent = poll.description;
    card.appendChild(desc);
  }

  if (!player) {
    const note = document.createElement('p');
    note.className = 'text-answer-note';
    note.textContent = 'Elegí tu nombre para armar tu pronóstico.';
    card.appendChild(note);
    return card;
  }

  const order = parseOrder(myVote?.text_value, baseOptions);

  const hint = document.createElement('p');
  hint.className = 'text-answer-note ranking-hint';
  if (!isOpen) {
    hint.textContent = `${pollVotes.length} ${pollVotes.length === 1 ? 'pronóstico cargado' : 'pronósticos cargados'}. La encuesta está cerrada.`;
  } else if (lockedOut) {
    hint.textContent = 'Ya arrancó la fecha — tu pronóstico quedó cerrado y no se puede editar más.';
  } else if (pastLock) {
    hint.textContent = 'Ya arrancó la fecha, pero todavía no habías enviado un pronóstico: podés mandar este primero y último.';
  } else {
    hint.textContent =
      'Arrastrá con el ⠿ (o usá las flechas) para ordenar del 1° al 20°. Tocá 📊 en un equipo para ver cómo lo votaron tus compañeros.';
  }
  card.appendChild(hint);

  const list = document.createElement('ol');
  list.className = 'ranking-list';
  card.appendChild(list);

  let draggingRow: HTMLElement | null = null;

  function renumber() {
    [...list.children].forEach((row, i) => {
      const posEl = (row as HTMLElement).querySelector('.rank-pos');
      if (posEl) posEl.textContent = `${i + 1}°`;
    });
  }

  function renderDetail(detail: HTMLElement, option: any) {
    const rankingVotes = pollVotes
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

    const byPosition = new Map<number, string[]>();
    for (const rv of rankingVotes) {
      const idx = rv.order.indexOf(option.id);
      if (idx === -1) continue;
      const pos = idx + 1;
      if (!byPosition.has(pos)) byPosition.set(pos, []);
      byPosition.get(pos)!.push(rv.playerId);
    }

    if (byPosition.size === 0) {
      detail.innerHTML = `<p class="rank-detail-empty">Todavía nadie más lo pronosticó.</p>`;
      return;
    }

    const maxCount = Math.max(...[...byPosition.values()].map((v) => v.length));
    const positions = [...byPosition.keys()].sort((a, b) => a - b);

    detail.innerHTML = `
      <p class="rank-detail-title">Dónde lo ubicaron (${rankingVotes.length} ${rankingVotes.length === 1 ? 'pronóstico' : 'pronósticos'})</p>
      <div class="rank-bars">
        ${positions
          .map((pos) => {
            const voterIds = byPosition.get(pos)!;
            const pct = Math.max(8, Math.round((voterIds.length / maxCount) * 100));
            const avatars = voterIds
              .map((id) => players.find((p) => p.id === id))
              .filter(Boolean)
              .map((p) => playerAvatarHtml(p, base, 'rank-voter-avatar'))
              .join('');
            return `
              <div class="rank-bar-row">
                <span class="rank-bar-pos">${pos}°</span>
                <div class="rank-bar-track"><div class="rank-bar-fill" style="width:${pct}%"></div></div>
                <span class="rank-bar-count">${voterIds.length}</span>
                <span class="rank-bar-voters">${avatars}</span>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  function buildRow(option: any): HTMLElement {
    const row = document.createElement('li');
    row.className = 'rank-row';
    row.dataset.optionId = option.id;

    const team = option.label;
    const path = crestPath(team);

    row.innerHTML = `
      <span class="rank-pos"></span>
      ${path ? `<img class="rank-crest" src="${base}${path}" alt="${team}" />` : `<span class="rank-crest rank-crest-fallback">⚽</span>`}
      <span class="rank-name">${team}</span>
      <div class="rank-actions">
        <button type="button" class="rank-btn rank-stats-btn" aria-label="Ver votos de compañeros">📊</button>
        ${
          canVote
            ? `
          <button type="button" class="rank-btn rank-up-btn" aria-label="Subir">▲</button>
          <button type="button" class="rank-btn rank-down-btn" aria-label="Bajar">▼</button>
          <span class="rank-handle" aria-label="Arrastrar">⠿</span>
        `
            : ''
        }
      </div>
    `;

    const detail = document.createElement('div');
    detail.className = 'rank-detail';
    detail.hidden = true;
    row.appendChild(detail);

    const statsBtn = row.querySelector('.rank-stats-btn')!;
    statsBtn.addEventListener('click', () => {
      const willOpen = detail.hidden;
      list.querySelectorAll('.rank-detail').forEach((d) => ((d as HTMLElement).hidden = true));
      if (willOpen) {
        renderDetail(detail, option);
        detail.hidden = false;
      }
    });

    if (canVote) {
      const upBtn = row.querySelector('.rank-up-btn')!;
      const downBtn = row.querySelector('.rank-down-btn')!;
      upBtn.addEventListener('click', () => {
        const prev = row.previousElementSibling;
        if (prev) list.insertBefore(row, prev);
        renumber();
      });
      downBtn.addEventListener('click', () => {
        const next = row.nextElementSibling;
        if (next) list.insertBefore(next, row);
        renumber();
      });

      const handle = row.querySelector('.rank-handle') as HTMLElement;
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        draggingRow = row;
        row.classList.add('dragging');
        try {
          handle.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      });
    }

    return row;
  }

  for (const option of order) {
    list.appendChild(buildRow(option));
  }
  renumber();

  if (canVote) {
    list.addEventListener('pointermove', (e) => {
      if (!draggingRow) return;
      const rows = [...list.children] as HTMLElement[];
      const target = rows.find((r) => {
        if (r === draggingRow) return false;
        const rect = r.getBoundingClientRect();
        return e.clientY >= rect.top && e.clientY <= rect.bottom;
      });
      if (target) {
        const rows2 = [...list.children];
        const draggingIdx = rows2.indexOf(draggingRow);
        const targetIdx = rows2.indexOf(target);
        if (draggingIdx < targetIdx) target.after(draggingRow);
        else target.before(draggingRow);
        renumber();
      }
    });

    const stopDrag = () => {
      if (draggingRow) draggingRow.classList.remove('dragging');
      draggingRow = null;
    };
    list.addEventListener('pointerup', stopDrag);
    list.addEventListener('pointercancel', stopDrag);

    const saveRow = document.createElement('div');
    saveRow.className = 'rank-save-row';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary btn-small';
    saveBtn.textContent = myVote ? 'Actualizar pronóstico' : 'Guardar pronóstico';
    const status = document.createElement('span');
    status.className = 'rank-save-status';
    saveRow.appendChild(saveBtn);
    saveRow.appendChild(status);
    card.appendChild(saveRow);

    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      status.textContent = 'Guardando…';
      const ids = [...list.children].map((row) => (row as HTMLElement).dataset.optionId);
      const textValue = JSON.stringify(ids);

      await supabase.from('votes').delete().eq('poll_id', poll.id).eq('player_id', player!.id);
      const { error } = await supabase
        .from('votes')
        .insert({ poll_id: poll.id, player_id: player!.id, text_value: textValue });

      if (!error) {
        const updated = [
          ...allVotes.filter((v) => !(v.poll_id === poll.id && v.player_id === player!.id)),
          { poll_id: poll.id, option_id: null, text_value: textValue, player_id: player!.id },
        ];
        onVote(updated);
        status.textContent = '✓ Guardado';
        setTimeout(() => {
          status.textContent = '';
        }, 2500);

        // A late first submission (pastLock was true when this render
        // happened, meaning myVote didn't exist yet) locks immediately —
        // no second chance to keep tweaking after the deadline.
        if (pastLock) {
          saveBtn.disabled = true;
          saveBtn.textContent = '🔒 Cerrado';
          hint.textContent = 'Ya arrancó la fecha — tu pronóstico quedó cerrado y no se puede editar más.';
          list.querySelectorAll<HTMLElement>('.rank-up-btn, .rank-down-btn, .rank-handle').forEach((el) => {
            (el as HTMLButtonElement).disabled = true;
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.4';
          });
        } else {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Actualizar pronóstico';
        }
      } else {
        saveBtn.disabled = false;
        status.textContent = 'Error al guardar, probá de nuevo.';
      }
    });
  }

  return card;
}
