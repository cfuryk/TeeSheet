import { Timestamp } from 'firebase/firestore'

export type SideBetType =
  | 'CHALLENGE_GROSS'
  | 'CHALLENGE_NET'
  | 'CHALLENGE_TEAM_GROSS'
  | 'CHALLENGE_TEAM_NET'
  | 'NASSAU_GROSS'
  | 'NASSAU_NET'
  | 'SKINS'

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
  settledAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
