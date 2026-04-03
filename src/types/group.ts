import { Timestamp } from 'firebase/firestore'
import type { HoleScore } from './round'
import type { Tee } from './course'

export type GroupStatus = 'pending' | 'active' | 'completed' | 'signed'

export interface Group {
  groupId: string
  roundId: string
  name: string | null
  golferIds: string[]
  teams: { teamA: string[]; teamB: string[] } | null
  status: GroupStatus
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Score {
  golferId: string
  golferName: string
  courseHandicap: number
  strokeAllocation: number[]
  scores: HoleScore[]
  totalGross: number | null
  totalNet: number | null
  signedAt: Timestamp | null
  signedBy: string | null
  isLocked: boolean
  updatedAt: Timestamp
}

export interface GroupFormData {
  name?: string
  golferIds: string[]
}

export interface ActiveGroupContext {
  round: import('./round').Round
  group: Group
  scores: Score[]
  tee: Tee
}
