import type { Timestamp } from 'firebase/firestore'

export interface RoundMessage {
  messageId: string
  uid: string
  displayName: string
  text: string
  createdAt: Timestamp
}
