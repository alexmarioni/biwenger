export interface PlayerScore {
  playerId: string;
  total: number;
  byCategory: Record<string, number>;
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
 */
export function computeScores(polls: any[], results: any[], votes: any[], players: any[]): PlayerScore[] {
  const resultsByPoll = new Map(results.map((r) => [r.poll_id, r]));
  const scores = new Map<string, PlayerScore>();
  for (const p of players) scores.set(p.id, { playerId: p.id, total: 0, byCategory: {} });

  function addPoints(playerId: string, category: string, points: number) {
    const s = scores.get(playerId);
    if (!s || points <= 0) return;
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
      for (const vote of pollVotes) {
        if (!vote.text_value) continue;
        let order: string[];
        try {
          order = JSON.parse(vote.text_value);
        } catch {
          continue;
        }
        let points = 0;
        correctOrder.forEach((optionId, actualIdx) => {
          const predictedIdx = order.indexOf(optionId);
          if (predictedIdx === -1) return;
          points += Math.max(0, RANKING_MAX_PER_TEAM - Math.abs(actualIdx - predictedIdx));
        });
        addPoints(vote.player_id, category, points);
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
      if (answerLabel(poll, vote) === correctLabel) {
        addPoints(vote.player_id, category, points);
      }
    }
  }

  return [...scores.values()].sort((a, b) => b.total - a.total);
}
