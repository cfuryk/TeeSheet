import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
  where,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { SideBet, SideBetStatus, SideBetType } from '@/types'
import type { Score } from '@/types'

const IMPLEMENTED_TYPES: SideBetType[] = [
  'CHALLENGE_GROSS',
  'CHALLENGE_NET',
  'CHALLENGE_TEAM_GROSS',
  'CHALLENGE_TEAM_NET',
]

function sideBetsPath(roundId: string) {
  return collection(db, 'rounds', roundId, 'sideBets')
}

function sideBetDocPath(roundId: string, sideBetId: string) {
  return doc(db, 'rounds', roundId, 'sideBets', sideBetId)
}

export const sideBetService = {
  async createSideBet(
    roundId: string,
    data: {
      type: SideBetType
      wagerPerPerson: number
      createdBy: string
      isPublic: boolean
      invitedIds: string[]
    },
  ): Promise<string> {
    const ref = await addDoc(sideBetsPath(roundId), {
      roundId,
      type: data.type,
      status: 'pending' as SideBetStatus,
      isPublic: data.isPublic,
      wagerPerPerson: data.wagerPerPerson,
      createdBy: data.createdBy,
      participantIds: [data.createdBy],
      invitedIds: data.invitedIds,
      declinedIds: [],
      winnersIds: null,
      settledAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await updateDoc(ref, { sideBetId: ref.id })

    return ref.id
  },

  /** Invited person accepts — moves them from invitedIds to participantIds */
  async acceptInvite(
    roundId: string,
    sideBetId: string,
    uid: string,
    _creatorUid: string,
    _betType: SideBetType,
  ): Promise<void> {
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      participantIds: arrayUnion(uid),
      invitedIds: arrayRemove(uid),
      updatedAt: serverTimestamp(),
    })
  },

  /** Invited person declines — moves to declinedIds; cancels if no one left */
  async declineInvite(roundId: string, sideBetId: string, uid: string, bet: SideBet): Promise<void> {
    const remainingInvited = bet.invitedIds.filter((id) => id !== uid)
    const updates: Record<string, unknown> = {
      declinedIds: arrayUnion(uid),
      invitedIds: arrayRemove(uid),
      updatedAt: serverTimestamp(),
    }
    if (remainingInvited.length === 0 && bet.participantIds.length <= 1) {
      updates.status = 'cancelled' as SideBetStatus
    }
    await updateDoc(sideBetDocPath(roundId, sideBetId), updates)
  },

  /** Public bet — any round member joins freely */
  async joinBet(
    roundId: string,
    sideBetId: string,
    uid: string,
    _existingParticipantIds: string[],
    _betType: SideBetType,
  ): Promise<void> {
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      participantIds: arrayUnion(uid),
      updatedAt: serverTimestamp(),
    })
  },

  async cancelSideBet(roundId: string, sideBetId: string): Promise<void> {
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      status: 'cancelled' as SideBetStatus,
      updatedAt: serverTimestamp(),
    })
  },

  onSideBetsSnapshot(roundId: string, callback: (bets: SideBet[]) => void): () => void {
    return onSnapshot(sideBetsPath(roundId), (snap) => {
      const bets = snap.docs.map((d) => ({ sideBetId: d.id, ...d.data() }) as SideBet)
      bets.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
      callback(bets)
    })
  },

  async getAllSideBets(roundId: string): Promise<SideBet[]> {
    const snap = await getDocs(sideBetsPath(roundId))
    return snap.docs.map((d) => ({ sideBetId: d.id, ...d.data() }) as SideBet)
  },

  /** Admin: real-time snapshot of all side bets across all rounds */
  onAllSideBetsSnapshot(callback: (bets: SideBet[]) => void): () => void {
    return onSnapshot(collectionGroup(db, 'sideBets'), (snap) => {
      const bets = snap.docs.map((d) => ({ sideBetId: d.id, ...d.data() }) as SideBet)
      bets.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
      callback(bets)
    })
  },

  /** User: real-time snapshot of all bets the user is a participant in, across all rounds */
  onUserBetsSnapshot(uid: string, callback: (bets: SideBet[]) => void): () => void {
    const q = query(
      collectionGroup(db, 'sideBets'),
      where('participantIds', 'array-contains', uid),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ sideBetId: d.id, ...d.data() }) as SideBet))
    })
  },

  async settleSideBets(roundId: string, allScores: Score[]): Promise<void> {
    const bets = await sideBetService.getAllSideBets(roundId)
    const settleableBets = bets.filter(
      (b) => (b.status === 'active' || b.status === 'pending') && IMPLEMENTED_TYPES.includes(b.type),
    )
    if (settleableBets.length === 0) return

    const batch = writeBatch(db)

    for (const bet of settleableBets) {
      if (bet.participantIds.length < 2) continue

      const useNet = bet.type === 'CHALLENGE_NET' || bet.type === 'CHALLENGE_TEAM_NET'
      const participantScores = allScores.filter((s) => bet.participantIds.includes(s.golferId))

      const totals: Record<string, number> = {}
      for (const sc of participantScores) {
        const val = useNet ? sc.totalNet : sc.totalGross
        if (val !== null) totals[sc.golferId] = val
      }

      if (Object.keys(totals).length < bet.participantIds.length) continue

      const minScore = Math.min(...Object.values(totals))
      const winnersIds = bet.participantIds.filter((uid) => totals[uid] === minScore)

      batch.update(sideBetDocPath(roundId, bet.sideBetId), {
        status: 'settled' as SideBetStatus,
        winnersIds,
        settledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    await batch.commit()
  },
}
