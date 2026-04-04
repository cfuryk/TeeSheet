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
      vsParTotal: 0,
    }))
    .sort((a, b) => a.total - b.total)
}

/**
 * Best ball total for a 2-man team across all 18 holes.
 * Returns null if any hole is unscored.
 */
export function bestBallGroupScore(
  teamIds: string[],
  scores: Scorecard[],
  holes: Hole[],
  useNet: boolean,
): number | null {
  const teamScores = scores.filter((sc) => teamIds.includes(sc.golferId))
  if (teamScores.length === 0) return null

  let total = 0
  for (const hole of holes) {
    const best = bestBallHoleScore(teamScores, hole.number, useNet)
    if (best === null) return null
    total += best
  }
  return total
}

/**
 * Match play points for a group: compares Team A best ball vs Team B best ball hole by hole.
 * Tied holes award 0 points to either side.
 * Returns points won in this group; caller converts to round-level team points (1 / 0.5).
 */
export function matchPlayPoints(
  teamAIds: string[],
  teamBIds: string[],
  scores: Scorecard[],
  holes: Hole[],
  useNet: boolean,
): { aPoints: number; bPoints: number } {
  const teamAScores = scores.filter((sc) => teamAIds.includes(sc.golferId))
  const teamBScores = scores.filter((sc) => teamBIds.includes(sc.golferId))

  let aPoints = 0
  let bPoints = 0

  for (const hole of holes) {
    const aBest = bestBallHoleScore(teamAScores, hole.number, useNet)
    const bBest = bestBallHoleScore(teamBScores, hole.number, useNet)
    if (aBest === null || bBest === null) continue
    if (aBest < bBest) aPoints++
    else if (bBest < aBest) bPoints++
    // tie: no points
  }

  return { aPoints, bPoints }
}

/**
 * Aggregate stroke score for one side of a Two Team round (gross or net).
 */
export function twoTeamAggregateScore(
  teamLetter: 'A' | 'B',
  teamAssignments: Record<string, 'A' | 'B'>,
  allScores: Scorecard[],
  useNet: boolean,
): number {
  return allScores
    .filter((sc) => teamAssignments[sc.golferId] === teamLetter)
    .reduce((sum, sc) => sum + ((useNet ? sc.totalNet : sc.totalGross) ?? 0), 0)
}

/**
 * Aggregate best ball stroke score for one side of a Two Team Best Ball Stroke round.
 * For each group, finds the two players from each team and sums their best ball total.
 */
export function twoTeamBestBallAggregateScore(
  teamLetter: 'A' | 'B',
  teamAssignments: Record<string, 'A' | 'B'>,
  groupGolferIds: string[][],  // array of golferIds per group
  allScores: Scorecard[],
  holes: Hole[],
  useNet: boolean,
): number {
  let total = 0
  for (const golferIds of groupGolferIds) {
    const teamIds = golferIds.filter((uid) => teamAssignments[uid] === teamLetter)
    if (teamIds.length === 0) continue
    const groupScores = allScores.filter((sc) => teamIds.includes(sc.golferId))
    const bbScore = bestBallGroupScore(teamIds, groupScores, holes, useNet)
    if (bbScore !== null) total += bbScore
  }
  return total
}
