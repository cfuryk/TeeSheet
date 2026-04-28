import { Timestamp } from 'firebase/firestore'

export type SideBetType =
  | 'STROKE_GROSS'
  | 'STROKE_NET'
  | 'NASSAU_GROSS'
  | 'NASSAU_NET'
  | 'MATCH_GROSS'
  | 'MATCH_NET'
  | 'HAMMER'
  | 'SKINS_GROSS'
  | 'SKINS_NET'

export type SideBetStatus = 'pending' | 'active' | 'settled' | 'cancelled'

export type HammerFormat = '1v1' | '2v2'
export type HammerFirstRule = 'random' | 'open'

export interface HammerHoleResult {
  hole: number
  /** Final stake for this hole — base × 2^(accepted hammers) */
  stake: number
  /** Winning side after the hole is played, or null if folded */
  winningSide: 'A' | 'B' | 'tie' | null
  /** How many times the hammer was thrown this hole */
  hammersThrown: number
  /** Which side folded (they pay the pre-double stake); null if no fold */
  foldedBy: 'A' | 'B' | null
}

export interface HammerConfig {
  format: HammerFormat
  firstRule: HammerFirstRule
  sideA: string[]
  sideB: string[]
  baseStake: number
  scoring: 'gross' | 'net'
  holeResults: HammerHoleResult[]
  /** Live stake on the current hole — doubles each time hammer is thrown */
  currentHoleStake: number
  /** Which side has thrown the hammer and is awaiting a response; null if no pending hammer */
  hammerHolder: 'A' | 'B' | null
  /** Which side threw last on this hole (persists after accept so opponent knows they can re-hammer) */
  lastThrowerSide: 'A' | 'B' | null
  /** How many times the hammer has been thrown on the current hole */
  currentHoleHammers: number
}

export interface HammerResult {
  /** Positive = side A won this amount; negative = side A owes */
  sideANet: number
  sideBNet: number
  holeByHole: { hole: number; amount: number; winner: 'A' | 'B' | 'tie' }[]
}

export interface SkinsHoleResult {
  hole: number
  /** UID of the winner; null = wash (tie) */
  winnerId: string | null
  /** Winning score for display */
  score: number | null
}

export interface SkinsResult {
  holeResults: SkinsHoleResult[]
  totalPot: number
  skinsCount: number
  payoutPerSkin: number
  /** Total earnings keyed by UID */
  earningsByPlayer: Record<string, number>
}

export type MatchFormat = '1v1' | '2v2'

export interface MatchPlayers {
  format: MatchFormat
  sideA: string[]
  sideB: string[]
  scoring: 'gross' | 'net'
}

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
  /** Hammer only */
  hammerConfig?: HammerConfig
  /** Hammer only — written at settlement */
  hammerResult?: HammerResult
  /** Skins only — written at settlement */
  skinsResult?: SkinsResult
  /** Match Play only */
  matchPlayers?: MatchPlayers
  settledAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
