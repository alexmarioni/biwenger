export interface PollLeader {
  label: string;
  className: string;
  pctText: string;
}

/** Computes the currently-leading answer for a poll, text or option-based alike. */
export function computePollLeader(poll: any, allVotes: any[]): PollLeader {
  const pollVotes = allVotes.filter((v) => v.poll_id === poll.id);
  // 'text' and 'player_autocomplete' both store the answer as free text
  // (text_value); everything else (single/multi/autocomplete) is option_id
  // based. 'ranking' also uses text_value but as a JSON array, not a
  // human-readable answer, so callers should skip it before reaching here.
  const isText = poll.poll_type === 'text' || poll.poll_type === 'player_autocomplete';

  let counts: { label: string; count: number }[];
  if (isText) {
    const map = new Map<string, number>();
    for (const v of pollVotes) {
      const key = (v.text_value ?? '').trim();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    counts = [...map.entries()].map(([value, count]) => ({
      label: value === '' ? poll.empty_label ?? 'Sin especificar' : value,
      count,
    }));
  } else {
    const options = poll.poll_options ?? [];
    counts = options.map((opt: any) => ({
      label: opt.label,
      count: pollVotes.filter((v: any) => v.option_id === opt.id).length,
    }));
  }

  const max = Math.max(0, ...counts.map((c) => c.count));
  const leaders = counts.filter((c) => c.count === max && max > 0);

  if (max === 0) {
    return { label: 'Sin respuestas aún', className: 'is-empty', pctText: '' };
  }

  if (leaders.length > 1) {
    const shown = leaders.slice(0, 3).map((l) => l.label);
    const extra = leaders.length > 3 ? ` +${leaders.length - 3} más` : '';
    const label = isText ? `Varias respuestas (${shown.join(' / ')}${extra})` : `Empate (${shown.join(' / ')}${extra})`;
    return { label, className: '', pctText: '' };
  }

  const pct = Math.round((max / pollVotes.length) * 100);
  return { label: leaders[0].label, className: '', pctText: `${pct}%` };
}
