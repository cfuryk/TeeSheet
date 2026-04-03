import type { HoleScore, Scorecard, Hole } from '@/types'

export function calculateNetScore(grossScore: number, strokes: number): number {
  return grossScore - strokes
}

export function scoreVsPar(score: number, par: number): number {
  return score - par
}

export function formatVsPar(diff: number): string {
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

export function calculateTotalGross(scores: HoleScore[]): number {
  return scores.reduce((sum, s) => sum + s.grossScore, 0)
}

export function calculateTotalNet(scores: HoleScore[]): number {
  return scores.reduce((sum, s) => sum + s.netScore, 0)
}

export function calculateTotalVsPar(scores: HoleScore[], holes: Hole[]): number {
  return scores.reduce((sum, s) => {
    const hole = holes.find((h) => h.number === s.hole)
    return sum + (hole ? s.grossScore - hole.par : 0)
  }, 0)
}

export function calculateTotalNetVsPar(scores: HoleScore[], holes: Hole[]): number {
  return scores.reduce((sum, s) => {
    const hole = holes.find((h) => h.number === s.hole)
    return sum + (hole ? s.netScore - hole.par : 0)
  }, 0)
}

/**
 * For best ball: returns the best (lowest) gross score among a set of scorecards for a given hole.
 * Returns null if no player has scored the hole yet.
 */
export function bestBallHoleScore(scorecards: Scorecard[], holeNumber: number, useNet: boolean): number | null {
  const scores = scorecards
    .map((sc) => sc.scores.find((s) => s.hole === holeNumber))
    .filter((s): s is HoleScore => s !== undefined)

  if (scores.length === 0) return null
  return Math.min(...scores.map((s) => (useNet ? s.netScore : s.grossScore)))
}

/**
 * Returns sorted leaderboard entries for stroke play.
 * Sorts by net total for NET rounds, gross total for GROSS rounds.
 */
export function strokePlayLeaderboard(
  scorecards: Scorecard[],
  useNet: boolean,
): Array<{ scorecard: Scorecard; total: number; vsParTotal: number }> {
  return scorecards
    .map((sc) => ({
      scorecard: sc,
      total: useNet ? (sc.totalNet ?? 999) : (sc.totalGross ?? 999),
      vsParTotal: 0, // caller can compute vs par separately using tee holes
    }))
    .sort((a, b) => a.total - b.total)
}
