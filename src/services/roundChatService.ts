import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { RoundMessage, AlertType } from '@/types'

function messagesPath(roundId: string) {
  return collection(db, 'rounds', roundId, 'messages')
}

export const roundChatService = {
  onMessagesSnapshot(roundId: string, callback: (msgs: RoundMessage[]) => void): () => void {
    const q = query(messagesPath(roundId), orderBy('createdAt', 'asc'))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ messageId: d.id, ...d.data() }) as RoundMessage))
    })
  },

  async sendMessage(roundId: string, uid: string, displayName: string, text: string, isAlert = false, alertType?: AlertType): Promise<void> {
    const payload: Record<string, unknown> = {
      uid,
      displayName,
      text: text.trim(),
      createdAt: serverTimestamp(),
    }
    if (isAlert) payload.isAlert = true
    if (alertType) payload.alertType = alertType
    await addDoc(messagesPath(roundId), payload)
  },
}
