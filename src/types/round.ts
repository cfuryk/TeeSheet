import { Timestamp } from 'firebase/firestore'
import type { Score } from './group'

export type ScoringFormat = 'individual' | 'two_team' | 'scramble'

export type RoundType =
  // Individual
  | 'STROKE_GROSS'
  | 'STROKE_NET'
  | 'BEST_BALL_GROSS'
  | 'BEST_BALL_NET'
  // Two Team
  | 'TWO_TEAM_STROKE_GROSS'
  | 'TWO_TEAM_STROKE_NET'
  | 'TWO_TEAM_BB_MATCH_GROSS'
  | 'TWO_TEAM_BB_MATCH_NET'
  | 'TWO_TEAM_BB_STROKE_GROSS'
  | 'TWO_TEAM_BB_STROKE_NET'
  // Scramble
  | 'SCRAMBLE_GROSS'

export type RoundStatus = 'pending' | 'active' | 'completed'

export interface Team {
  teamA: [string, string]
  teamB: [string, string]
}

export interface HoleScore {
  hole: number
  grossScore: number
  netScore: number
}

/** @deprecated Use Score from types/group.ts. Kept for component compatibility. */
export type Scorecard = Score

export interface Round {
  roundId: string
  name: string
  courseId: string
  courseName: string
  teeId: string
  teeName: string
  date: Timestamp
  scoringFormat: ScoringFormat
  roundType: RoundType
  isPrivate: boolean
  createdBy: string
  status: RoundStatus
  eventId: string | null
  groupIds: string[]
  memberIds: string[]
  /** For two_team rounds: maps uid -> 'A' | 'B' */
  teamAssignments: Record<string, 'A' | 'B'> | null
  simpleGrossScore?: number
  /** Optional wager amount per person in dollars. 0 or undefined means no wager. */
  wager?: number
  /** @deprecated moved to Group */
  golferIds?: string[]
  /** @deprecated moved to Group */
  teams?: Team | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface RoundFormData {
  name: string
  courseId: string
  teeId: string
  date: string
  scoringFormat: ScoringFormat
  roundType: RoundType
  isPrivate: boolean
  wager?: number
  eventId?: string
}

/** @deprecated Use ActiveGroupContext from types/group.ts */
export interface ActiveRoundContext {
  round: Round
  scorecards: Scorecard[]
  tee: import('./course').Tee
}
