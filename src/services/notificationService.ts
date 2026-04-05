import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Notification } from '@/types'

function itemsPath(uid: string) {
  return collection(db, 'notifications', uid, 'items')
}

export const notificationService = {
  async createNotification(
    uid: string,
    data: Omit<Notification, 'notificationId' | 'uid' | 'read' | 'createdAt'>,
  ): Promise<void> {
    const ref = await addDoc(itemsPath(uid), {
      ...data,
      uid,
      read: false,
      createdAt: serverTimestamp(),
    })
    await updateDoc(ref, { notificationId: ref.id })
  },

  onNotificationsSnapshot(uid: string, callback: (notifications: Notification[]) => void): () => void {
    const q = query(itemsPath(uid), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ notificationId: d.id, ...d.data() }) as Notification))
    })
  },

  async markRead(uid: string, notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', uid, 'items', notificationId), { read: true })
  },

  async markAllRead(uid: string, notifications: Notification[]): Promise<void> {
    const unread = notifications.filter((n) => !n.read)
    if (unread.length === 0) return
    const batch = writeBatch(db)
    for (const n of unread) {
      batch.update(doc(db, 'notifications', uid, 'items', n.notificationId), { read: true })
    }
    await batch.commit()
  },
}
