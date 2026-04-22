import type { Timestamp } from 'firebase/firestore'

export type AlertType = 'positive' | 'negative' | 'leader' | 'correction'

export interface RoundMessage {
  messageId: string
  uid: string
  displayName: string
  text: string
  createdAt: Timestamp
  isAlert?: boolean
  alertType?: AlertType
}
