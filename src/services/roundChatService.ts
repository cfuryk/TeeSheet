import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { RoundMessage } from '@/types'

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

  async sendMessage(roundId: string, uid: string, displayName: string, text: string): Promise<void> {
    await addDoc(messagesPath(roundId), {
      uid,
      displayName,
      text: text.trim(),
      createdAt: serverTimestamp(),
    })
  },
}
