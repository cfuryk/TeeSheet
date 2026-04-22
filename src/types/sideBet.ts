import { Timestamp } from 'firebase/firestore'

export type SideBetType =
  | 'CHALLENGE_GROSS'
  | 'CHALLENGE_NET'
  | 'NASSAU_GROSS'
  | 'NASSAU_NET'

export type SideBetStatus = 'pending' | 'active' | 'settled' | 'cancelled'

export interface SideBet {
  sideBetId: string
  roundId: string
  type: SideBetType
  status: SideBetStatus
  /** true = any round member can join freely; false = invite only */
  isPublic: boolean
  wagerPerPerson: number
  createdBy: string
  /** Confirmed participants — creator always included */
  participantIds: string[]
  /** Invited but not yet responded (private bets) */
  invitedIds: string[]
  /** Declined invitees */
  declinedIds: string[]
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
