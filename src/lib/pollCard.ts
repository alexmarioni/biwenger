import { supabase } from './supabase';
import { crestPath } from './crests';

export type PollCardPlayer = { id: string; name: string; emoji: string } | null;

const base = import.meta.env.BASE_URL;

/** `poll.closes_at` (nullable) is an optional voting deadline set by hand
 * in SQL — null means the poll stays open indefinitely. Purely a
 * client-side clock check, same pattern as matchCard's kickoff cutoff:
 * nobody flips `status` to 'closed' in the DB when a deadline passes. */
export function isPollExpired(poll: any): boolean {
  return !!poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now();
}

export function isPollEffectivelyOpen(poll: any): boolean {
  return poll.status === 'open' && !isPollExpired(poll);
}

/** Closed polls used to render at full size, identical to open ones apart
 * from a small badge — with several stacked on a page they were impossible
 * to tell apart and wasted a lot of space. When `isOpen` is false, this
 * pulls the already-appended `headSelector` node (title+badges, or a
 * match's crests+teams) out of `card` and into a `<summary>`, then reuses
 * `card` itself — minus that head — as the collapsible body. Open cards
 * are returned untouched, so nothing changes for the interactive path
 * (self-updating `card.replaceWith(...)` calls elsewhere keep referencing
 * the same live element either way). */
export function collapseClosedCard(card: HTMLElement, isOpen: boolean, headSelector: string): HTMLElement {
  if (isOpen) return card;

  const head = card.querySelector(`:scope > ${headSelector}`);
  const details = document.createElement('details');
  details.className = `${card.className} poll-card-closed`;

  const summary = document.createElement('summary');
  summary.className = 'poll-summary';
  if (head) summary.appendChild(head);
  details.appendChild(summary);

  card.className = 'poll-body';
  details.appendChild(card);

  return details;
}

/** Short Spanish "closes in..." label for the deadline badge. Only shown
 * while the poll is still open and has a closes_at set. */
function formatClosesIn(closesAt: string): string {
  const diffMs = new Date(closesAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Cierra ya';
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `Cierra en ${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `Cierra en ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `Cierra en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
}

/** Team-related autocomplete options are either a bare team name ("Arsenal")
 * or end with "(Team Name)" (e.g. a coach's option "Mikel Arteta (Arsenal)").
 * Returns the resolvable crest team name, or null if this option isn't
 * team-related. */
function resolveTeamName(label: string): string | null {
  if (crestPath(label)) return label;
  const match = label.match(/\(([^)]+)\)\s*$/);
  if (match && crestPath(match[1])) return match[1];
  return null;
}

type PlayerListEntry = { name: string; team: string; position?: string | null };

let playersListCache: PlayerListEntry[] | null = null;
let playersListPromise: Promise<PlayerListEntry[]> | null = null;

/** Lazily fetches and caches public/data/players.json (real squads, kept
 * fresh weekly by .github/workflows/update-squads.yml) — the suggestion
 * source for 'player_autocomplete' polls, so voters pick from real players
 * instead of a hand-curated shortlist that inevitably goes stale. */
function loadPlayersList(): Promise<PlayerListEntry[]> {
  if (playersListCache) return Promise.resolve(playersListCache);
  if (!playersListPromise) {
    playersListPromise = fetch(`${base}data/players.json`)
      .then((r) => (r.ok ? r.json() : { players: [] }))
      .then((d) => {
        playersListCache = d.players ?? [];
        return playersListCache!;
      })
      .catch(() => {
        playersListCache = [];
        return playersListCache!;
      });
  }
  return playersListPromise;
}

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
  const isOpen = isPollEffectivelyOpen(poll);
  const canVote = !!player && isOpen;
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
      ${isOpen && poll.closes_at ? `<span class="badge badge-deadline">${formatClosesIn(poll.closes_at)}</span>` : ''}
      <span class="badge ${isOpen ? '' : 'badge-closed'}">${isOpen ? 'Abierta' : `Cerrada · ${totalVotes} ${totalVotes === 1 ? 'voto' : 'votos'}`}</span>
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
    return collapseClosedCard(card, isOpen, '.poll-head');
  }

  if (poll.poll_type === 'autocomplete') {
    renderAutocomplete(card, poll, allVotes, canVote, player, onVote, options);
    return collapseClosedCard(card, isOpen, '.poll-head');
  }

  if (poll.poll_type === 'player_autocomplete') {
    renderPlayerAutocomplete(card, poll, allVotes, canVote, player, onVote, options);
    return collapseClosedCard(card, isOpen, '.poll-head');
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
        btn.classList.add('pending');

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
        btn.classList.remove('pending');
      });
    }

    optionsEl.appendChild(btn);

    requestAnimationFrame(() => {
      const bar = btn.querySelector('.option-bar') as HTMLElement;
      if (bar) bar.style.width = `${pct}%`;
    });
  }

  card.appendChild(optionsEl);
  return collapseClosedCard(card, isOpen, '.poll-head');
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
      input.classList.add('pending');
      submit.classList.add('pending');

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
        input.classList.remove('pending');
        submit.classList.remove('pending');
      }
    });
  }
}

function renderAutocomplete(
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
  const allOptions = [...(poll.poll_options ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const myOption = myVote ? allOptions.find((o) => o.id === myVote.option_id) : undefined;
  const isTeamRelated = allOptions.some((o) => resolveTeamName(o.label));

  const wrap = document.createElement('div');
  wrap.className = 'autocomplete-wrap';

  const crestBadge = document.createElement('span');
  crestBadge.className = 'autocomplete-crest-badge';

  function updateCrestBadge(label: string | null) {
    if (!isTeamRelated) return;
    const team = label ? resolveTeamName(label) : null;
    const path = team ? crestPath(team) : null;
    crestBadge.innerHTML = path
      ? `<img src="${base}${path}" alt="${team}" />`
      : `<span class="autocomplete-crest-fallback">⚽</span>`;
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.className = `autocomplete-input text-answer-input${isTeamRelated ? ' has-crest' : ''}`;
  input.placeholder = 'Escribí para buscar…';
  input.autocomplete = 'off';
  input.value = myOption?.label ?? '';
  input.disabled = !canVote;

  const list = document.createElement('div');
  list.className = 'autocomplete-list';
  list.hidden = true;

  if (isTeamRelated) {
    updateCrestBadge(myOption?.label ?? null);
    wrap.appendChild(crestBadge);
  }
  wrap.appendChild(input);
  wrap.appendChild(list);
  card.appendChild(wrap);

  function positionList() {
    const rect = input.getBoundingClientRect();
    list.style.position = 'fixed';
    list.style.left = `${rect.left}px`;
    list.style.top = `${rect.bottom + 6}px`;
    list.style.width = `${rect.width}px`;
    list.style.right = 'auto';
  }

  // Home widgets animate in via a CSS transform (.stagger keyframes), and
  // any ancestor with a transform becomes the containing block for
  // position:fixed descendants — that silently breaks the dropdown there
  // even though it works fine on pages without that animation. Moving the
  // list to be a direct child of <body> while open sidesteps this
  // regardless of which ancestor (if any) has a transform.
  function openList() {
    document.body.appendChild(list);
    positionList();
    list.hidden = false;
  }

  const note = document.createElement('p');
  note.className = 'text-answer-note';
  note.textContent = `${pollVotes.length} ${pollVotes.length === 1 ? 'persona respondió' : 'personas respondieron'} hasta ahora.`;
  card.appendChild(note);

  if (!canVote) return;

  function closeList() {
    list.hidden = true;
    list.innerHTML = '';
    if (list.parentElement === document.body) wrap.appendChild(list);
  }

  async function selectOption(option: any) {
    input.value = option.label;
    updateCrestBadge(option.label);
    closeList();
    input.disabled = true;
    input.classList.add('pending');

    await supabase.from('votes').delete().eq('poll_id', poll.id).eq('player_id', player!.id);
    const { error } = await supabase
      .from('votes')
      .insert({ poll_id: poll.id, option_id: option.id, player_id: player!.id });

    if (!error) {
      const updated = [
        ...allVotes.filter((v) => !(v.poll_id === poll.id && v.player_id === player!.id)),
        { poll_id: poll.id, option_id: option.id, player_id: player!.id },
      ];
      onVote(updated);
      if (selfUpdate) card.replaceWith(renderPollCard(poll, updated, player, onVote, options));
    } else {
      input.disabled = false;
      input.classList.remove('pending');
    }
  }

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      closeList();
      return;
    }

    const matches = allOptions.filter((o) => o.label.toLowerCase().includes(query)).slice(0, 8);
    if (matches.length === 0) {
      list.innerHTML = `<div class="autocomplete-empty">Sin resultados</div>`;
      openList();
      return;
    }

    list.innerHTML = '';
    for (const option of matches) {
      const team = resolveTeamName(option.label);
      const path = team ? crestPath(team) : null;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'autocomplete-item';
      item.innerHTML = `
        <span class="autocomplete-item-row">
          ${
            path
              ? `<img class="autocomplete-item-crest" src="${base}${path}" alt="${team}" />`
              : isTeamRelated
                ? '<span class="autocomplete-item-crest-fallback">⚽</span>'
                : ''
          }
          <span>${option.label}</span>
        </span>
      `;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectOption(option);
      });
      list.appendChild(item);
    }
    openList();
  });

  input.addEventListener('focus', () => {
    // Clicking into a field that already has a saved answer used to just
    // place the cursor, so typing appended to the old value instead of
    // replacing it — the resulting garbled query never matched anything,
    // making the dropdown look broken. Selecting the text on focus makes
    // the first keystroke naturally replace it, like editing any other
    // pre-filled field.
    input.select();
    if (input.value.trim()) input.dispatchEvent(new Event('input'));
  });

  window.addEventListener(
    'scroll',
    () => {
      if (!list.hidden) closeList();
    },
    { capture: true, passive: true }
  );

  input.addEventListener('blur', () => {
    setTimeout(closeList, 150);
  });
}

/** Same UX as renderAutocomplete (type-ahead, crest badge, viewport-portaled
 * dropdown) but the suggestion source is public/data/players.json (real
 * squads) instead of poll.poll_options, and the vote is stored as free text
 * (text_value = "Player Name (Team)") like a 'text' poll — no DB-seeded
 * options needed, so the pool of names never goes stale or misses a
 * transfer. */
function renderPlayerAutocomplete(
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

  const wrap = document.createElement('div');
  wrap.className = 'autocomplete-wrap';

  const crestBadge = document.createElement('span');
  crestBadge.className = 'autocomplete-crest-badge';

  function updateCrestBadge(team: string | null) {
    const path = team ? crestPath(team) : null;
    crestBadge.innerHTML = path
      ? `<img src="${base}${path}" alt="${team}" />`
      : `<span class="autocomplete-crest-fallback">⚽</span>`;
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'autocomplete-input text-answer-input has-crest';
  input.placeholder = poll.placeholder ?? 'Escribí un jugador…';
  input.autocomplete = 'off';
  input.value = myVote?.text_value ?? '';
  input.disabled = !canVote;

  const list = document.createElement('div');
  list.className = 'autocomplete-list';
  list.hidden = true;

  updateCrestBadge(myVote?.text_value ? resolveTeamName(myVote.text_value) : null);
  wrap.appendChild(crestBadge);
  wrap.appendChild(input);
  wrap.appendChild(list);
  card.appendChild(wrap);

  function positionList() {
    const rect = input.getBoundingClientRect();
    list.style.position = 'fixed';
    list.style.left = `${rect.left}px`;
    list.style.top = `${rect.bottom + 6}px`;
    list.style.width = `${rect.width}px`;
    list.style.right = 'auto';
  }

  function openList() {
    document.body.appendChild(list);
    positionList();
    list.hidden = false;
  }

  function closeList() {
    list.hidden = true;
    list.innerHTML = '';
    if (list.parentElement === document.body) wrap.appendChild(list);
  }

  const note = document.createElement('p');
  note.className = 'text-answer-note';
  note.textContent = `${pollVotes.length} ${pollVotes.length === 1 ? 'persona respondió' : 'personas respondieron'} hasta ahora.`;
  card.appendChild(note);

  if (!canVote) return;

  let playersList: PlayerListEntry[] = [];
  let ready = false;
  loadPlayersList().then((list) => {
    playersList = list;
    ready = true;
  });

  async function selectPlayer(p: PlayerListEntry) {
    const label = `${p.name} (${p.team})`;
    input.value = label;
    updateCrestBadge(p.team);
    closeList();
    input.disabled = true;
    input.classList.add('pending');

    await supabase.from('votes').delete().eq('poll_id', poll.id).eq('player_id', player!.id);
    const { error } = await supabase
      .from('votes')
      .insert({ poll_id: poll.id, player_id: player!.id, text_value: label });

    if (!error) {
      const updated = [
        ...allVotes.filter((v) => !(v.poll_id === poll.id && v.player_id === player!.id)),
        { poll_id: poll.id, option_id: null, text_value: label, player_id: player!.id },
      ];
      onVote(updated);
      if (selfUpdate) card.replaceWith(renderPollCard(poll, updated, player, onVote, options));
    } else {
      input.disabled = false;
      input.classList.remove('pending');
    }
  }

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      closeList();
      return;
    }

    if (!ready) {
      list.innerHTML = `<div class="autocomplete-empty">Cargando jugadores…</div>`;
      openList();
      return;
    }

    const matches = playersList.filter((p) => p.name.toLowerCase().includes(query)).slice(0, 8);
    if (matches.length === 0) {
      list.innerHTML = `<div class="autocomplete-empty">Sin resultados</div>`;
      openList();
      return;
    }

    list.innerHTML = '';
    for (const p of matches) {
      const path = crestPath(p.team);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'autocomplete-item';
      item.innerHTML = `
        <span class="autocomplete-item-row">
          ${
            path
              ? `<img class="autocomplete-item-crest" src="${base}${path}" alt="${p.team}" />`
              : '<span class="autocomplete-item-crest-fallback">⚽</span>'
          }
          <span>${p.name} <span class="autocomplete-item-hint">${p.team}</span></span>
        </span>
      `;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectPlayer(p);
      });
      list.appendChild(item);
    }
    openList();
  });

  input.addEventListener('focus', () => {
    // Clicking into a field that already has a saved answer used to just
    // place the cursor, so typing appended to the old value instead of
    // replacing it — the resulting garbled query never matched anything,
    // making the dropdown look broken. Selecting the text on focus makes
    // the first keystroke naturally replace it, like editing any other
    // pre-filled field.
    input.select();
    if (input.value.trim()) input.dispatchEvent(new Event('input'));
  });

  window.addEventListener(
    'scroll',
    () => {
      if (!list.hidden) closeList();
    },
    { capture: true, passive: true }
  );

  input.addEventListener('blur', () => {
    setTimeout(closeList, 150);
  });
}
