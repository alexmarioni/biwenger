export interface ScoreDetail {
  category: string;
  label: string;
  points: number;
  note: string;
}

export interface PlayerScore {
  playerId: string;
  total: number;
  byCategory: Record<string, number>;
  details: ScoreDetail[];
}

const MATCH_POINTS = 3;
const EXACT_ANSWER_POINTS = 10;
const RANKING_MAX_PER_TEAM = 5;

function answerLabel(poll: any, vote: any): string | null {
  if (vote.text_value != null) return vote.text_value;
  if (vote.option_id != null) {
    const opt = (poll.poll_options ?? []).find((o: any) => o.id === vote.option_id);
    return opt?.label ?? null;
  }
  return null;
}

function ordinal(n: number): string {
  return `${n}°`;
}

/**
 * Computes each player's points from poll_results (the real/current
 * answer, written by scripts/fetch-results.mjs) compared against their
 * votes:
 *  - Jornada match winner guessed right: MATCH_POINTS.
 *  - Any other option/text answer matched exactly: EXACT_ANSWER_POINTS.
 *  - Clasificación (ranking): per team, max(0, RANKING_MAX_PER_TEAM -
 *    |predicted position - actual position|), summed across all 20 —
 *    rewards close guesses, not just exact ones.
 * Polls with no poll_results row yet (nothing resolved) contribute 0.
 * `details` carries one line per scoring event (per match, per poll, or —
 * for the ranking poll — per team) so the UI can explain exactly where
 * every point came from instead of just a category total.
 */
export function computeScores(polls: any[], results: any[], votes: any[], players: any[]): PlayerScore[] {
  const resultsByPoll = new Map(results.map((r) => [r.poll_id, r]));
  const scores = new Map<string, PlayerScore>();
  for (const p of players) scores.set(p.id, { playerId: p.id, total: 0, byCategory: {}, details: [] });

  function addPoints(playerId: string, category: string, points: number, label: string, note: string) {
    const s = scores.get(playerId);
    if (!s) return;
    s.details.push({ category, label, points, note });
    if (points <= 0) return;
    s.total += points;
    s.byCategory[category] = (s.byCategory[category] ?? 0) + points;
  }

  for (const poll of polls) {
    const result = resultsByPoll.get(poll.id);
    if (!result) continue;

    const pollVotes = votes.filter((v) => v.poll_id === poll.id);
    const category = poll.category ?? 'Otras';

    if (poll.poll_type === 'ranking' && result.correct_order) {
      const correctOrder: string[] = result.correct_order;
      const optionsById = new Map((poll.poll_options ?? []).map((o: any) => [o.id, o]));

      for (const vote of pollVotes) {
        if (!vote.text_value) continue;
        let order: string[];
        try {
          order = JSON.parse(vote.text_value);
        } catch {
          continue;
        }
        correctOrder.forEach((optionId, actualIdx) => {
          const predictedIdx = order.indexOf(optionId);
          if (predictedIdx === -1) return;
          const diff = Math.abs(actualIdx - predictedIdx);
          const points = Math.max(0, RANKING_MAX_PER_TEAM - diff);
          const teamLabel = (optionsById.get(optionId) as any)?.label ?? '?';
          const note =
            diff === 0
              ? `predijiste ${ordinal(predictedIdx + 1)}, justo ahí`
              : `predijiste ${ordinal(predictedIdx + 1)}, está ${ordinal(actualIdx + 1)} (${diff} de diferencia)`;
          addPoints(vote.player_id, category, points, teamLabel, note);
        });
      }
      continue;
    }

    let correctLabel: string | null = null;
    if (result.correct_option_id) {
      const opt = (poll.poll_options ?? []).find((o: any) => o.id === result.correct_option_id);
      correctLabel = opt?.label ?? null;
    } else if (result.correct_text) {
      correctLabel = result.correct_text;
    }
    if (correctLabel == null) continue;

    const points = category === 'Jornada' ? MATCH_POINTS : EXACT_ANSWER_POINTS;
    for (const vote of pollVotes) {
      const mine = answerLabel(poll, vote);
      if (mine == null) continue;
      const hit = mine === correctLabel;
      addPoints(
        vote.player_id,
        category,
        hit ? points : 0,
        poll.title,
        hit ? `acertaste (${correctLabel})` : `votaste "${mine}", era "${correctLabel}"`
      );
    }
  }

  return [...scores.values()].sort((a, b) => b.total - a.total);
}
