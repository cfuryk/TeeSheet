import { Timestamp } from 'firebase/firestore'

export type NotificationType =
  | 'round_invite'
  | 'bet_invite'
  | 'bet_joined'
  | 'bet_accepted'
  | 'bet_settled'

export interface Notification {
  notificationId: string
  uid: string
  type: NotificationType
  title: string
  body: string
  roundId: string
  sideBetId?: string
  read: boolean
  createdAt: Timestamp
}
