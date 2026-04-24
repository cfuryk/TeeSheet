import { Timestamp } from 'firebase/firestore'

export type SideBetType =
  | 'STROKE_GROSS'
  | 'STROKE_NET'
  | 'NASSAU_GROSS'
  | 'NASSAU_NET'
  | 'MATCH_GROSS'
  | 'MATCH_NET'

export type SideBetStatus = 'pending' | 'active' | 'settled' | 'cancelled'

export interface SideBet {
  sideBetId: string
  roundId: string
  type: SideBetType
  status: SideBetStatus
  wagerPerPerson: number
  createdBy: string
  /** Confirmed participants — creator always included */
  participantIds: string[]
  /** Invited but not yet responded */
  invitedIds: string[]
  /** Declined invitees */
  declinedIds: string[]
  /** Pending join requests — non-participants who requested to join */
  requestIds: string[]
  /** UIDs of lowest scorers once settled (multiple on tie) */
  winnersIds: string[] | null
  /** Nassau only: per-segment winners. null = tied or segment not yet complete */
  nassauResult?: {
    front9Winners: string[] | null
    back9Winners: string[] | null
    totalWinners: string[] | null
  }
  settledAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
