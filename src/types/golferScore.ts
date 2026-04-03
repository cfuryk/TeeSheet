import { Timestamp } from 'firebase/firestore'

export type ScoreSource = 'simple' | 'full'

export interface GolferScore {
  scoreId: string
  golferId: string
  golferName: string
  roundId: string | null      // null for simple scores with no associated round
  courseId: string
  courseName: string
  teeId: string
  teeName: string
  date: Timestamp
  grossScore: number
  netScore: number | null
  differential: number
  source: ScoreSource
  createdAt: Timestamp
}
