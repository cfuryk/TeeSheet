import { Timestamp } from 'firebase/firestore'

export type InviteTargetType = 'event' | 'round'

export interface Invite {
  token: string
  targetType: InviteTargetType
  targetId: string
  createdBy: string
  createdAt: Timestamp
  expiresAt: Timestamp | null
}
