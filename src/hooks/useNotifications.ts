import { useState, useEffect } from 'react'
import { notificationService } from '@/services/notificationService'
import type { Notification } from '@/types'

export function useNotifications(uid: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const unsub = notificationService.onNotificationsSnapshot(uid, (items) => {
      setNotifications(items)
      setLoading(false)
    })
    return unsub
  }, [uid])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, loading }
}
