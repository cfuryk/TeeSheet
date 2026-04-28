import type { HoleScore, Scorecard, Hole, Score } from '@/types'

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

export interface LeaderboardEntry {
  score: Score
  vsPar: number | null
  holesPlayed: number
  rank: number
  rankLabel: string
}

/**
 * Builds a sorted leaderboard with tied-rank labels.
 *
 * Rules:
 * - Players who haven't started (holesPlayed === 0) go to the bottom with no rank label.
 * - Among started players, sort by vsPar ascending (best first).
 * - Tiebreak: further through the round (more holes played) sorts higher.
 * - Tied players share the same rank (same vsPar = same rank).
 * - Rank label is "T3" when multiple players share a rank, plain "3" otherwise.
 * - Unstarted players show an empty rank label.
 */
export function buildLeaderboard(scores: Score[], holes: Hole[], useNet = false): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = scores.map((sc) => {
    const holesPlayed = sc.scores.length
    const vsPar = holesPlayed > 0
      ? sc.scores.reduce((sum, hs) => {
          const h = holes.find((hole) => hole.number === hs.hole)
          if (!h) return sum
          return sum + (useNet ? hs.netScore - h.par : hs.grossScore - h.par)
        }, 0)
      : null
    return { score: sc, vsPar, holesPlayed, rank: 0, rankLabel: '' }
  })

  entries.sort((a, b) => {
    if (a.vsPar === null && b.vsPar === null) return 0
    if (a.vsPar === null) return 1
    if (b.vsPar === null) return -1
    if (a.vsPar !== b.vsPar) return a.vsPar - b.vsPar
    return b.holesPlayed - a.holesPlayed
  })

  // Assign ranks only to started players; unstarted stay at rank 0
  const started = entries.filter((e) => e.vsPar !== null)
  for (let i = 0; i < started.length; i++) {
    if (i === 0) {
      started[i].rank = 1
    } else {
      const prev = started[i - 1]
      const curr = started[i]
      // Same vsPar = tied = same rank
      curr.rank = curr.vsPar === prev.vsPar ? prev.rank : i + 1
    }
  }

  // Count how many started players share each rank
  const rankCounts: Record<number, number> = {}
  for (const e of started) rankCounts[e.rank] = (rankCounts[e.rank] ?? 0) + 1

  // Apply labels
  for (const e of entries) {
    if (e.vsPar === null) {
      e.rankLabel = '-'
    } else {
      e.rankLabel = rankCounts[e.rank] > 1 ? `T${e.rank}` : `${e.rank}`
    }
  }

  return entries
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
 * Aggregate stroke match leaderboard for two teams.
 * Returns each team's total score and the running difference through holes played.
 * "up" means lower total (better in stroke play).
 */
export function aggregateStrokeMatchStatus(
  teamAIds: string[],
  teamBIds: string[],
  allScores: Score[],
  useNet: boolean,
): { scoreA: number; scoreB: number; holesPlayed: number } {
  const scoresA = allScores.filter((s) => teamAIds.includes(s.golferId))
  const scoresB = allScores.filter((s) => teamBIds.includes(s.golferId))

  const sumScores = (scores: Score[]) =>
    scores.reduce((sum, sc) => {
      const total = useNet
        ? sc.scores.reduce((s, h) => s + h.netScore, 0)
        : sc.scores.reduce((s, h) => s + h.grossScore, 0)
      return sum + total
    }, 0)

  const holesPlayed = scoresA.length > 0
    ? Math.max(...scoresA.map((s) => s.scores.length), 0)
    : 0

  return {
    scoreA: sumScores(scoresA),
    scoreB: sumScores(scoresB),
    holesPlayed,
  }
}

/**
 * Per-foursome best-ball match play status (hole-by-hole, net or gross).
 * Returns how many holes Team A is up (negative = B is up) and holes played.
 * A hole is only counted when both teams have scored it.
 */
export function bbMatchPlayHoleStatus(
  teamAIds: string[],
  teamBIds: string[],
  scores: Score[],
  holes: Hole[],
  useNet: boolean,
): { aUp: number; holesPlayed: number } {
  const teamAScores = scores.filter((sc) => teamAIds.includes(sc.golferId))
  const teamBScores = scores.filter((sc) => teamBIds.includes(sc.golferId))

  let aUp = 0
  let holesPlayed = 0

  for (const hole of holes) {
    const aBest = bestBallHoleScore(teamAScores, hole.number, useNet)
    const bBest = bestBallHoleScore(teamBScores, hole.number, useNet)
    if (aBest === null || bBest === null) continue
    holesPlayed++
    if (aBest < bBest) aUp++
    else if (bBest < aBest) aUp--
  }

  return { aUp, holesPlayed }
}

/**
 * Human-readable match status label from Team A's perspective.
 * e.g. "3 Up", "2 Down", "AS", "Won 4&3", "Lost 2&1", "Tied (AS)"
 */
export function matchStatusLabel(aUp: number, holesPlayed: number, totalHoles: number): string {
  if (holesPlayed === 0) return '-'
  const holesRemaining = totalHoles - holesPlayed
  const absUp = Math.abs(aUp)
  if (aUp === 0) {
    return holesRemaining === 0 ? 'Tied (AS)' : 'AS'
  }
  // Match is clinched when lead > holes remaining
  if (absUp > holesRemaining) {
    const suffix = holesRemaining > 0 ? `${absUp}&${holesRemaining}` : `${absUp}`
    return aUp > 0 ? `Won ${suffix}` : `Lost ${suffix}`
  }
  // Dormie: lead equals holes remaining — leading side can't lose
  if (absUp === holesRemaining) {
    return aUp > 0 ? 'Dormie' : `${absUp} Down`
  }
  return aUp > 0 ? `${absUp} Up` : `${absUp} Down`
}

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

// ─── Match Play (side bet) helpers ────────────────────────────────────────────

/**
 * Determines the winner of a single hole for a Match Play side bet.
 * For 2v2, uses best-ball (lowest score) from each side.
 * Returns null if either side has no score for this hole yet.
 */
export function computeMatchHole(
  hole: number,
  sideA: string[],
  sideB: string[],
  scores: Record<string, Score>,
  useNet: boolean,
): 'A' | 'B' | 'tie' | null {
  const getScore = (uid: string): number | null => {
    const hs = scores[uid]?.scores.find((h) => h.hole === hole)
    if (!hs) return null
    return useNet ? hs.netScore : hs.grossScore
  }
  const aScores = sideA.map(getScore).filter((s): s is number => s !== null)
  const bScores = sideB.map(getScore).filter((s): s is number => s !== null)
  if (aScores.length === 0 || bScores.length === 0) return null
  const aMin = Math.min(...aScores)
  const bMin = Math.min(...bScores)
  if (aMin < bMin) return 'A'
  if (bMin < aMin) return 'B'
  return 'tie'
}

/**
 * Computes the running match score from all available holes.
 * Returns hole-by-hole results, running tally, and match status string.
 */
export function computeMatchScore(
  sideA: string[],
  sideB: string[],
  scores: Record<string, Score>,
  useNet: boolean,
): {
  holeByHole: { hole: number; winner: 'A' | 'B' | 'tie'; aScore: number | null; bScore: number | null }[]
  aWins: number
  bWins: number
  ties: number
  holesPlayed: number
  matchStatus: string
} {
  const holeByHole: { hole: number; winner: 'A' | 'B' | 'tie'; aScore: number | null; bScore: number | null }[] = []

  const getScore = (uid: string, hole: number): number | null => {
    const hs = scores[uid]?.scores.find((h) => h.hole === hole)
    if (!hs) return null
    return useNet ? hs.netScore : hs.grossScore
  }

  for (let hole = 1; hole <= 18; hole++) {
    const aScores = sideA.map((uid) => getScore(uid, hole)).filter((s): s is number => s !== null)
    const bScores = sideB.map((uid) => getScore(uid, hole)).filter((s): s is number => s !== null)
    if (aScores.length === 0 || bScores.length === 0) continue
    const aMin = Math.min(...aScores)
    const bMin = Math.min(...bScores)
    const winner: 'A' | 'B' | 'tie' = aMin < bMin ? 'A' : bMin < aMin ? 'B' : 'tie'
    holeByHole.push({ hole, winner, aScore: aMin, bScore: bMin })
  }

  let aWins = 0, bWins = 0, ties = 0
  for (const r of holeByHole) {
    if (r.winner === 'A') aWins++
    else if (r.winner === 'B') bWins++
    else ties++
  }
  const holesPlayed = holeByHole.length
  const holesRemaining = 18 - holesPlayed
  const aUp = aWins - bWins

  let matchStatus: string
  if (holesPlayed === 0) {
    matchStatus = 'No holes played'
  } else if (aUp === 0) {
    matchStatus = holesRemaining === 0 ? 'Halved' : `All Square thru ${holesPlayed}`
  } else {
    const absUp = Math.abs(aUp)
    const leadingSide = aUp > 0 ? 'A' : 'B'
    if (absUp > holesRemaining) {
      matchStatus = `${leadingSide === 'A' ? 'A' : 'B'} won ${absUp}&${holesRemaining}`
    } else if (absUp === holesRemaining) {
      matchStatus = `Dormie ${absUp}`
    } else {
      matchStatus = `${leadingSide} ${absUp} UP thru ${holesPlayed}`
    }
  }

  return { holeByHole, aWins, bWins, ties, holesPlayed, matchStatus }
}

// ─── Nassau helpers ────────────────────────────────────────────────────────────

/**
 * Score for a Nassau segment. Returns null if the player hasn't completed all
 * holes in that segment yet (front: 1-9, back: 10-18, total: 1-18).
 */
export function nassauSegmentScore(
  holeScores: HoleScore[],
  segment: 'front' | 'back' | 'total',
  useNet: boolean,
): number | null {
  const [min, max, required] =
    segment === 'front' ? [1, 9, 9] :
    segment === 'back'  ? [10, 18, 9] :
                          [1, 18, 18]
  const relevant = holeScores.filter((h) => h.hole >= min && h.hole <= max)
  if (relevant.length < required) return null
  return relevant.reduce((s, h) => s + (useNet ? h.netScore : h.grossScore), 0)
}

/**
 * Live segment status for a Nassau bet: who's leading, each player's score,
 * and whether the segment is complete for all participants.
 */
export function nassauSegmentStatus(
  participantIds: string[],
  scoreMap: Record<string, Score>,
  segment: 'front' | 'back' | 'total',
  useNet: boolean,
): { leaders: string[]; playerScores: Record<string, number | null>; complete: boolean } {
  const playerScores: Record<string, number | null> = {}
  for (const uid of participantIds) {
    const sc = scoreMap[uid]
    playerScores[uid] = sc ? nassauSegmentScore(sc.scores, segment, useNet) : null
  }
  const complete = participantIds.every((uid) => playerScores[uid] !== null)
  const scored = participantIds.filter((uid) => playerScores[uid] !== null)
  if (scored.length === 0 || !complete) return { leaders: [], playerScores, complete }
  const min = Math.min(...scored.map((uid) => playerScores[uid] as number))
  const leaders = scored.filter((uid) => playerScores[uid] === min)
  return { leaders, playerScores, complete }
}
