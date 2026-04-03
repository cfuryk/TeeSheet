import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Round, RoundFormData, RoundStatus } from '@/types'
import { localDateFromString } from '@/lib/formatters'

function autoCloseStale(rounds: Round[]): Round[] {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  rounds.forEach((r) => {
    if (r.status !== 'completed' && r.date.toDate() < startOfToday) {
      updateDoc(doc(db, 'rounds', r.roundId), {
        status: 'completed' as RoundStatus,
        updatedAt: serverTimestamp(),
      })
    }
  })
  return rounds.map((r) =>
    r.status !== 'completed' && r.date.toDate() < startOfToday
      ? { ...r, status: 'completed' as RoundStatus }
      : r,
  )
}

export const roundService = {
  async createRound(
    data: RoundFormData,
    createdBy: string,
    courseName: string,
    teeName: string,
    eventId: string | null = null,
  ): Promise<string> {
    const ref = await addDoc(collection(db, 'rounds'), {
      name: data.name,
      courseId: data.courseId,
      courseName,
      teeId: data.teeId,
      teeName,
      date: Timestamp.fromDate(localDateFromString(data.date)),
      roundType: data.roundType,
      isPrivate: data.isPrivate,
      createdBy,
      status: 'pending' as RoundStatus,
      eventId,
      groupIds: [],
      memberIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await updateDoc(ref, { roundId: ref.id })
    return ref.id
  },

  async getRound(roundId: string): Promise<Round | null> {
    const snap = await getDoc(doc(db, 'rounds', roundId))
    if (!snap.exists()) return null
    return { roundId: snap.id, ...snap.data() } as Round
  },

  onRoundSnapshot(roundId: string, callback: (round: Round | null) => void): () => void {
    return onSnapshot(doc(db, 'rounds', roundId), (snap) => {
      callback(snap.exists() ? ({ roundId: snap.id, ...snap.data() } as Round) : null)
    })
  },

  onTeeSheetSnapshot(callback: (rounds: Round[]) => void): () => void {
    const q = query(
      collection(db, 'rounds'),
      where('isPrivate', '==', false),
      where('status', 'in', ['pending', 'active']),
      orderBy('date', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      const rounds = snap.docs.map((d) => ({ roundId: d.id, ...d.data() }) as Round)
      callback(autoCloseStale(rounds))
    })
  },

  onMyRoundsSnapshot(participantRoundIds: string[], callback: (rounds: Round[]) => void): () => void {
    if (participantRoundIds.length === 0) {
      callback([])
      return () => {}
    }
    const q = query(
      collection(db, 'rounds'),
      where('roundId', 'in', participantRoundIds.slice(0, 30)),
      orderBy('date', 'desc'),
    )
    return onSnapshot(q, (snap) => {
      const rounds = snap.docs.map((d) => ({ roundId: d.id, ...d.data() }) as Round)
      callback(autoCloseStale(rounds))
    })
  },

  onRoundsByMemberSnapshot(uid: string, callback: (rounds: Round[]) => void): () => void {
    const q = query(
      collection(db, 'rounds'),
      where('memberIds', 'array-contains', uid),
      orderBy('date', 'desc'),
    )
    return onSnapshot(q, (snap) => {
      const rounds = snap.docs.map((d) => ({ roundId: d.id, ...d.data() }) as Round)
      callback(autoCloseStale(rounds))
    })
  },

  onRoundsByCreatorSnapshot(uid: string, callback: (rounds: Round[]) => void): () => void {
    const q = query(
      collection(db, 'rounds'),
      where('createdBy', '==', uid),
      orderBy('date', 'desc'),
    )
    return onSnapshot(q, (snap) => {
      const rounds = snap.docs.map((d) => ({ roundId: d.id, ...d.data() }) as Round)
      callback(autoCloseStale(rounds))
    })
  },

  async updateRound(roundId: string, data: Partial<Round>): Promise<void> {
    await updateDoc(doc(db, 'rounds', roundId), { ...data, updatedAt: serverTimestamp() })
  },

  async deleteRound(roundId: string): Promise<void> {
    await deleteDoc(doc(db, 'rounds', roundId))
  },

  onActiveRoundsSnapshot(callback: (rounds: Round[]) => void): () => void {
    const q = query(
      collection(db, 'rounds'),
      where('status', 'in', ['pending', 'active']),
      orderBy('date', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      const rounds = snap.docs.map((d) => ({ roundId: d.id, ...d.data() }) as Round)
      callback(autoCloseStale(rounds))
    })
  },
}
