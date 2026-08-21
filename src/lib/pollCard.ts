import { supabase } from './supabase';

export type PollCardPlayer = { id: string; name: string; emoji: string } | null;

export interface PollCardOptions {
  /** When true (default) the card swaps itself in place after a vote. Set
   * false to let the caller fully control what happens post-vote (e.g. a
   * carousel that slides the card out and advances instead). */
  selfUpdate?: boolean;
}

/**
 * Renders a single poll as a self-contained card: options (single/multi) or
 * a text-answer form, live percentages, and voting wired up. If `player` is
 * null the card renders read-only (no identity yet to vote with).
 *
 * `onVote` is called with the updated full votes array right after a
 * successful vote, so the caller can keep its own state in sync.
 */
export function renderPollCard(
  poll: any,
  allVotes: any[],
  player: PollCardPlayer,
  onVote: (updatedVotes: any[]) => void,
  options: PollCardOptions = {}
): HTMLElement {
  const selfUpdate = options.selfUpdate ?? true;
  const pollVotes = allVotes.filter((v) => v.poll_id === poll.id);
  const totalVotes = pollVotes.length;
  const isMulti = poll.poll_type === 'multi';
  const canVote = !!player && poll.status === 'open';
  const isOpen = poll.status === 'open';
  const myOptionIds = new Set(
    player ? pollVotes.filter((v) => v.player_id === player.id).map((v) => v.option_id) : []
  );

  const card = document.createElement('article');
  card.className = 'poll-card';

  const head = document.createElement('div');
  head.className = 'poll-head';
  head.innerHTML = `
    <span class="poll-title">${poll.title}</span>
    <span class="poll-badges">
      ${isMulti ? '<span class="badge">Elegí varias</span>' : ''}
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

  if (poll.poll_type === 'text') {
    renderTextAnswer(card, poll, allVotes, canVote, player, onVote, options);
    return card;
  }

  const optionsEl = document.createElement('div');
  optionsEl.className = 'options';

  const optionsSorted = [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  for (const option of optionsSorted) {
    const count = pollVotes.filter((v) => v.option_id === option.id).length;
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const isMine = myOptionIds.has(option.id);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `option-btn${isMine ? ' selected' : ''}`;
    btn.disabled = !canVote;
    btn.innerHTML = `
      <span class="option-bar"></span>
      <span class="option-row">
        <span class="option-label">${isMine ? '<span class="check">✓</span>' : ''}${option.label}</span>
        <span class="option-pct">${pct}% · ${count}</span>
      </span>
      ${option.hint ? `<span class="option-hint">${option.hint}</span>` : ''}
    `;

    if (canVote && player) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;

        if (isMulti) {
          if (isMine) {
            const { error } = await supabase
              .from('votes')
              .delete()
              .eq('poll_id', poll.id)
              .eq('option_id', option.id)
              .eq('player_id', player.id);
            if (!error) {
              const updated = allVotes.filter(
                (v) => !(v.poll_id === poll.id && v.option_id === option.id && v.player_id === player.id)
              );
              onVote(updated);
              if (selfUpdate) card.replaceWith(renderPollCard(poll, updated, player, onVote, options));
              return;
            }
          } else {
            const { error } = await supabase
              .from('votes')
              .insert({ poll_id: poll.id, option_id: option.id, player_id: player.id });
            if (!error) {
              const updated = [...allVotes, { poll_id: poll.id, option_id: option.id, player_id: player.id }];
              onVote(updated);
              if (selfUpdate) card.replaceWith(renderPollCard(poll, updated, player, onVote, options));
              return;
            }
          }
        } else {
          await supabase.from('votes').delete().eq('poll_id', poll.id).eq('player_id', player.id);
          const { error } = await supabase
            .from('votes')
            .insert({ poll_id: poll.id, option_id: option.id, player_id: player.id });
          if (!error) {
            const updated = [
              ...allVotes.filter((v) => !(v.poll_id === poll.id && v.player_id === player.id)),
              { poll_id: poll.id, option_id: option.id, player_id: player.id },
            ];
            onVote(updated);
            if (selfUpdate) card.replaceWith(renderPollCard(poll, updated, player, onVote, options));
            return;
          }
        }

        btn.disabled = false;
      });
    }

    optionsEl.appendChild(btn);

    requestAnimationFrame(() => {
      const bar = btn.querySelector('.option-bar') as HTMLElement;
      if (bar) bar.style.width = `${pct}%`;
    });
  }

  card.appendChild(optionsEl);
  return card;
}

function renderTextAnswer(
  card: HTMLElement,
  poll: any,
  allVotes: any[],
  canVote: boolean,
  player: PollCardPlayer,
  onVote: (updatedVotes: any[]) => void,
  options: PollCardOptions
) {
  const selfUpdate = options.selfUpdate ?? true;
  const pollVotes = allVotes.filter((v) => v.poll_id === poll.id);
  const myVote = player ? pollVotes.find((v) => v.player_id === player.id) : undefined;
  const answeredCount = pollVotes.length;

  const form = document.createElement('form');
  form.className = 'text-answer-form';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'text-answer-input';
  input.placeholder =
    poll.placeholder ?? (poll.allow_empty ? `Dejalo vacío para "${poll.empty_label ?? 'sin especificar'}"` : 'Escribí tu respuesta');
  input.value = myVote?.text_value ?? '';
  input.disabled = !canVote;

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'btn btn-primary btn-small';
  submit.textContent = myVote ? 'Actualizar' : 'Guardar';
  submit.disabled = !canVote;

  form.appendChild(input);
  form.appendChild(submit);
  card.appendChild(form);

  const errorMsg = document.createElement('p');
  errorMsg.className = 'text-answer-error';
  errorMsg.hidden = true;
  card.appendChild(errorMsg);

  const hints: string[] = [];
  if (poll.min_value != null || poll.max_value != null) {
    if (poll.min_value != null && poll.max_value != null) {
      hints.push(`Un número entre ${poll.min_value} y ${poll.max_value}.`);
    } else if (poll.min_value != null) {
      hints.push(`Un número desde ${poll.min_value}.`);
    } else {
      hints.push(`Un número hasta ${poll.max_value}.`);
    }
  }
  if (poll.allow_empty) {
    hints.push(`Vacío cuenta como "${poll.empty_label ?? 'sin especificar'}".`);
  }
  hints.push(`${answeredCount} ${answeredCount === 1 ? 'persona respondió' : 'personas respondieron'} hasta ahora.`);

  const note = document.createElement('p');
  note.className = 'text-answer-note';
  note.textContent = hints.join(' ');
  card.appendChild(note);

  if (canVote && player) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.hidden = true;
      const value = input.value.trim();

      if (!value) {
        if (!poll.allow_empty) {
          errorMsg.textContent = 'Este campo no puede quedar vacío.';
          errorMsg.hidden = false;
          return;
        }
      } else if (poll.min_value != null || poll.max_value != null) {
        const num = Number(value);
        if (
          Number.isNaN(num) ||
          (poll.min_value != null && num < poll.min_value) ||
          (poll.max_value != null && num > poll.max_value)
        ) {
          errorMsg.textContent =
            poll.min_value != null && poll.max_value != null
              ? `Tiene que ser un número entre ${poll.min_value} y ${poll.max_value}.`
              : 'Tiene que ser un número válido.';
          errorMsg.hidden = false;
          return;
        }
      }

      input.disabled = true;
      submit.disabled = true;

      await supabase.from('votes').delete().eq('poll_id', poll.id).eq('player_id', player.id);
      const { error } = await supabase.from('votes').insert({ poll_id: poll.id, player_id: player.id, text_value: value });

      if (!error) {
        const updated = [
          ...allVotes.filter((v) => !(v.poll_id === poll.id && v.player_id === player.id)),
          { poll_id: poll.id, option_id: null, text_value: value, player_id: player.id },
        ];
        onVote(updated);
        if (selfUpdate) card.replaceWith(renderPollCard(poll, updated, player, onVote, options));
      } else {
        input.disabled = false;
        submit.disabled = false;
      }
    });
  }
}
