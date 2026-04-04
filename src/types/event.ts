import { Timestamp } from 'firebase/firestore'

export type EventType = 'single_round' | 'multi_round'
export type EventStatus = 'upcoming' | 'active' | 'completed'

export interface GolfEvent {
  eventId: string
  name: string
  description: string
  type: EventType
  createdBy: string
  status: EventStatus
  roundIds: string[]
  memberIds: string[]
  handicaps: Record<string, number>
  isPrivate: boolean
  date: Timestamp
  endDate: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface EventFormData {
  name: string
  description: string
  type: EventType
  date: string
  endDate?: string
  isPrivate: boolean
}
