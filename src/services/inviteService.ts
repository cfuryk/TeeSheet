import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Invite, InviteTargetType } from '@/types'
import { eventService } from './eventService'

export const inviteService = {
  async createInvite(
    targetType: InviteTargetType,
    targetId: string,
    createdBy: string,
  ): Promise<string> {
    const token = Math.random().toString(36).slice(2, 10)
    await setDoc(doc(db, 'invites', token), {
      token,
      targetType,
      targetId,
      createdBy,
      createdAt: serverTimestamp(),
      expiresAt: null,
    })
    return token
  },

  async getInvite(token: string): Promise<Invite | null> {
    const snap = await getDoc(doc(db, 'invites', token))
    if (!snap.exists()) return null
    return snap.data() as Invite
  },

  async fulfillInvite(token: string, uid: string): Promise<{ targetType: InviteTargetType; targetId: string } | null> {
    const invite = await inviteService.getInvite(token)
    if (!invite) return null
    if (invite.targetType === 'event') {
      await eventService.joinEvent(invite.targetId, uid)
    }
    return { targetType: invite.targetType, targetId: invite.targetId }
  },
}
