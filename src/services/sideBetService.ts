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
import { nassauSegmentScore } from '@/lib/scoring'
import type { SideBet, SideBetStatus, SideBetType } from '@/types'
import type { Score } from '@/types'

const IMPLEMENTED_TYPES: SideBetType[] = [
  'STROKE_GROSS',
  'STROKE_NET',
  'NASSAU_GROSS',
  'NASSAU_NET',
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
      invitedIds: string[]
    },
  ): Promise<string> {
    const ref = await addDoc(sideBetsPath(roundId), {
      roundId,
      type: data.type,
      status: 'pending' as SideBetStatus,
      wagerPerPerson: data.wagerPerPerson,
      createdBy: data.createdBy,
      participantIds: [data.createdBy],
      invitedIds: data.invitedIds,
      declinedIds: [],
      requestIds: [],
      winnersIds: null,
      settledAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await updateDoc(ref, { sideBetId: ref.id })

    return ref.id
  },

  /** Invited person accepts — moves them from invitedIds to participantIds, activates the bet */
  async acceptInvite(
    roundId: string,
    sideBetId: string,
    uid: string,
  ): Promise<void> {
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      participantIds: arrayUnion(uid),
      invitedIds: arrayRemove(uid),
      status: 'active' as SideBetStatus,
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

  /** Participant invites additional players */
  async invitePlayers(roundId: string, sideBetId: string, uids: string[]): Promise<void> {
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      invitedIds: arrayUnion(...uids),
      updatedAt: serverTimestamp(),
    })
  },

  /** Non-participant requests to join — added to requestIds pending approval */
  async requestJoin(roundId: string, sideBetId: string, uid: string): Promise<void> {
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      requestIds: arrayUnion(uid),
      updatedAt: serverTimestamp(),
    })
  },

  /** Existing participant approves a join request */
  async approveJoinRequest(roundId: string, sideBetId: string, uid: string): Promise<void> {
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      participantIds: arrayUnion(uid),
      requestIds: arrayRemove(uid),
      updatedAt: serverTimestamp(),
    })
  },

  /** Existing participant denies a join request */
  async denyJoinRequest(roundId: string, sideBetId: string, uid: string): Promise<void> {
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      requestIds: arrayRemove(uid),
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

      const isNassau = bet.type === 'NASSAU_GROSS' || bet.type === 'NASSAU_NET'
      const useNet = bet.type === 'STROKE_NET' || bet.type === 'NASSAU_NET'
      const participantScores = allScores.filter((s) => bet.participantIds.includes(s.golferId))

      if (isNassau) {
        const allComplete = bet.participantIds.every((uid) => {
          const sc = participantScores.find((s) => s.golferId === uid)
          return sc && nassauSegmentScore(sc.scores, 'total', useNet) !== null
        })
        if (!allComplete) continue

        function nassauWinners(segment: 'front' | 'back' | 'total'): string[] {
          const segScores: Record<string, number> = {}
          for (const sc of participantScores) {
            const val = nassauSegmentScore(sc.scores, segment, useNet)
            if (val !== null) segScores[sc.golferId] = val
          }
          const min = Math.min(...Object.values(segScores))
          const winners = bet.participantIds.filter((uid) => segScores[uid] === min)
          return winners.length === bet.participantIds.length ? [] : winners
        }

        batch.update(sideBetDocPath(roundId, bet.sideBetId), {
          status: 'settled' as SideBetStatus,
          winnersIds: null,
          nassauResult: {
            front9Winners: nassauWinners('front'),
            back9Winners: nassauWinners('back'),
            totalWinners: nassauWinners('total'),
          },
          settledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        continue
      }

      // Stroke bets
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
