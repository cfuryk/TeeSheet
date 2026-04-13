import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Round, RoundFormData, RoundStatus, Score } from '@/types'
import { localDateFromString } from '@/lib/formatters'
import { courseService } from './courseService'
import { golferScoreService } from './golferScoreService'
import { userService } from './userService'

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
      scoringFormat: data.scoringFormat,
      roundType: data.roundType,
      isPrivate: data.isPrivate,
      createdBy,
      status: 'pending' as RoundStatus,
      eventId,
      groupIds: [],
      memberIds: [],
      teamAssignments: null,
      ...(data.wager && data.wager > 0 ? { wager: data.wager } : {}),
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

  async activateRound(roundId: string): Promise<void> {
    await updateDoc(doc(db, 'rounds', roundId), {
      status: 'active' as RoundStatus,
      updatedAt: serverTimestamp(),
    })
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
    // Delete group subcollections first (while round doc still exists for rules evaluation)
    const groupsSnap = await getDocs(collection(db, 'rounds', roundId, 'groups'))
    for (const groupDoc of groupsSnap.docs) {
      const scoresSnap = await getDocs(
        collection(db, 'rounds', roundId, 'groups', groupDoc.id, 'scores')
      )
      await Promise.all(scoresSnap.docs.map((d) => deleteDoc(d.ref)))
      await deleteDoc(groupDoc.ref)
    }
    // Delete the round doc last
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

  async getSeededRounds(): Promise<Round[]> {
    const q = query(collection(db, 'rounds'), where('__seeded', '==', true))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ roundId: d.id, ...d.data() }) as Round)
  },

  /** Admin: real-time snapshot of all rounds that have a wager set */
  onWagerRoundsSnapshot(callback: (rounds: Round[]) => void): () => void {
    const q = query(
      collection(db, 'rounds'),
      where('wager', '>', 0),
      orderBy('wager'),
      orderBy('date', 'desc'),
    )
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ roundId: d.id, ...d.data() }) as Round))
    })
  },

  /** Admin: fetch id→name map for all rounds */
  async getAllRoundNames(): Promise<Record<string, string>> {
    const snap = await getDocs(collection(db, 'rounds'))
    const map: Record<string, string> = {}
    for (const d of snap.docs) map[d.id] = (d.data().name as string) ?? d.id
    return map
  },

  async updateTeamAssignments(
    roundId: string,
    assignments: Record<string, 'A' | 'B'>,
  ): Promise<void> {
    await updateDoc(doc(db, 'rounds', roundId), {
      teamAssignments: assignments,
      updatedAt: serverTimestamp(),
    })
  },

  /** Force-complete a round: mark all groups signed + round completed, regardless of signing state.
   *  Players who already signed (isLocked) will still have their score submitted for handicap. */
  async forceCompleteRound(roundId: string): Promise<void> {
    const round = await roundService.getRound(roundId)
    if (!round) return

    // Mark all groups as signed
    const groupsSnap = await getDocs(collection(db, 'rounds', roundId, 'groups'))
    await Promise.all(
      groupsSnap.docs.map((d) =>
        updateDoc(d.ref, { status: 'signed', updatedAt: serverTimestamp() })
      )
    )

    // Mark round completed
    await updateDoc(doc(db, 'rounds', roundId), {
      status: 'completed',
      updatedAt: serverTimestamp(),
    })

    // Submit handicap scores for players who already signed their card
    if (round.scoringFormat !== 'scramble') {
      const course = await courseService.getCourse(round.courseId)
      const tee = course?.tees.find((t: { teeId: string }) => t.teeId === round.teeId)
      if (tee) {
        for (const uid of round.memberIds ?? []) {
          for (const groupDoc of groupsSnap.docs) {
            const scoreSnap = await getDoc(doc(db, 'rounds', roundId, 'groups', groupDoc.id, 'scores', uid))
            if (!scoreSnap.exists()) continue
            const s = scoreSnap.data() as Score
            if (!s.isLocked || s.totalGross == null) continue
            await golferScoreService.addScoreFromFull({
              golferId: uid,
              golferName: s.golferName,
              roundId,
              courseId: round.courseId,
              courseName: round.courseName,
              teeId: round.teeId,
              teeName: round.teeName,
              date: round.date,
              grossScore: s.totalGross,
              netScore: s.totalNet ?? null,
              courseRating: tee.rating,
              slope: tee.slope,
            })
            break
          }
          await userService.recalculateHandicap(uid)
        }
      }
    }
  },
}
