import type { Hole } from '@/types'

/**
 * Calculates the course-specific handicap for a golfer.
 * Formula: round(handicapIndex * (slope / 113) + (rating - par))
 */
export function calculateCourseHandicap(
  handicapIndex: number,
  slope: number,
  rating: number,
  par: number,
): number {
  return Math.round(handicapIndex * (slope / 113) + (rating - par))
}

/**
 * Builds a stroke allocation array of length 18.
 * Index 0 = hole 1, index 17 = hole 18.
 * Value = number of strokes received on that hole (0, 1, or 2; negative for plus handicaps).
 *
 * Rules:
 *   courseHandicap 0:      all zeros
 *   courseHandicap 1–18:   holes with strokeIndex <= courseHandicap get 1 stroke
 *   courseHandicap > 18:   all holes get 1; holes with strokeIndex <= (courseHandicap - 18) get 2
 *   courseHandicap < 0:    holes with strokeIndex <= abs(courseHandicap) get -1 (plus handicap)
 */
/**
 * Calculates a score differential for a single round.
 * Formula: (grossScore - courseRating) * (113 / slope)
 */
export function calculateDifferential(grossScore: number, courseRating: number, slope: number): number {
  return (grossScore - courseRating) * (113 / slope)
}

/**
 * Calculates a handicap index from an array of differentials using USGA rules.
 * Requires at least 3 differentials. Returns null if fewer than 3.
 *
 *   3–4 rounds:  best 1  (adjustment: -2.0 for 3, -1.0 for 4)
 *   5–6:         best 2  (adjustment: -1.0 for 5)
 *   7–8:         best 2
 *   9–11:        best 3
 *   12–14:       best 4
 *   15–16:       best 5
 *   17–18:       best 6
 *   19:          best 7
 *   20:          best 8
 */
export function calculateHandicapIndex(differentials: number[]): number | null {
  const recent = differentials.slice(-20)
  const count = recent.length
  if (count < 3) return null

  const sorted = [...recent].sort((a, b) => a - b)

  let best: number[]

  if (count === 3)       { best = sorted.slice(0, 1) }
  else if (count === 4)  { best = sorted.slice(0, 1) }
  else if (count === 5)  { best = sorted.slice(0, 2) }
  else if (count <= 8)   { best = sorted.slice(0, 2) }
  else if (count <= 11)  { best = sorted.slice(0, 3) }
  else if (count <= 14)  { best = sorted.slice(0, 4) }
  else if (count <= 16)  { best = sorted.slice(0, 5) }
  else if (count <= 18)  { best = sorted.slice(0, 6) }
  else if (count === 19) { best = sorted.slice(0, 7) }
  else                   { best = sorted.slice(0, 8) }

  const avg = best.reduce((s, d) => s + d, 0) / best.length
  const index = avg * 0.96
  return Math.min(Math.round(index * 10) / 10, 54.0)
}

/**
 * Applies a handicap allowance percentage to a course handicap.
 * Standard allowances: 100% (full), 80% (four-ball/team), 75%, etc.
 * Always rounds to the nearest whole number.
 */
export function applyHandicapPercent(courseHandicap: number, percent: number): number {
  return Math.round(courseHandicap * (percent / 100))
}

export function buildStrokeAllocation(courseHandicap: number, holes: Hole[]): number[] {
  const sorted = [...holes].sort((a, b) => a.number - b.number)

  return sorted.map((hole) => {
    const si = hole.handicap // stroke index

    if (courseHandicap === 0) return 0

    if (courseHandicap > 0) {
      if (courseHandicap <= 18) {
        return si <= courseHandicap ? 1 : 0
      } else {
        // Over 18: every hole gets 1, plus extra stroke on hardest (courseHandicap - 18) holes
        return si <= courseHandicap - 18 ? 2 : 1
      }
    } else {
      // Plus handicap (negative): hardest abs(courseHandicap) holes get -1
      return si <= Math.abs(courseHandicap) ? -1 : 0
    }
  })
}
