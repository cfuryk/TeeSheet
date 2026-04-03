import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { GolferScore } from '@/types'
import { calculateDifferential } from '@/lib/handicap'

async function createScoreDoc(data: Record<string, unknown>): Promise<string> {
  const ref = await addDoc(collection(db, 'scores'), data)
  await updateDoc(ref, { scoreId: ref.id })
  return ref.id
}

export const golferScoreService = {
  async addScoreFromSimple(params: {
    golferId: string
    golferName: string
    roundId: string | null
    courseId: string
    courseName: string
    teeId: string
    teeName: string
    date: Timestamp
    grossScore: number
    courseRating: number
    slope: number
  }): Promise<string> {
    const differential = calculateDifferential(params.grossScore, params.courseRating, params.slope)
    return createScoreDoc({
      golferId: params.golferId,
      golferName: params.golferName,
      roundId: params.roundId,
      courseId: params.courseId,
      courseName: params.courseName,
      teeId: params.teeId,
      teeName: params.teeName,
      date: params.date,
      grossScore: params.grossScore,
      netScore: null,
      differential,
      source: 'simple',
      createdAt: serverTimestamp(),
    })
  },

  async addScoreFromFull(params: {
    golferId: string
    golferName: string
    roundId: string
    courseId: string
    courseName: string
    teeId: string
    teeName: string
    date: Timestamp
    grossScore: number
    netScore: number | null
    courseRating: number
    slope: number
  }): Promise<string> {
    const differential = calculateDifferential(params.grossScore, params.courseRating, params.slope)
    return createScoreDoc({
      golferId: params.golferId,
      golferName: params.golferName,
      roundId: params.roundId,
      courseId: params.courseId,
      courseName: params.courseName,
      teeId: params.teeId,
      teeName: params.teeName,
      date: params.date,
      grossScore: params.grossScore,
      netScore: params.netScore,
      differential,
      source: 'full',
      createdAt: serverTimestamp(),
    })
  },

  async deleteScoresByRound(roundId: string): Promise<void> {
    const snap = await getDocs(
      query(collection(db, 'scores'), where('roundId', '==', roundId))
    )
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  },

  async getRecentDifferentials(golferId: string, maxCount = 20): Promise<number[]> {
    const snap = await getDocs(
      query(
        collection(db, 'scores'),
        where('golferId', '==', golferId),
        orderBy('date', 'desc'),
        limit(maxCount),
      )
    )
    return snap.docs.map((d) => (d.data() as GolferScore).differential)
  },

  onMyScoresSnapshot(golferId: string, callback: (scores: GolferScore[]) => void): () => void {
    return onSnapshot(
      query(
        collection(db, 'scores'),
        where('golferId', '==', golferId),
        orderBy('date', 'desc'),
      ),
      (snap) => {
        callback(snap.docs.map((d) => d.data() as GolferScore))
      }
    )
  },

  onAllScoresSnapshot(callback: (scores: GolferScore[]) => void): () => void {
    return onSnapshot(
      query(collection(db, 'scores'), orderBy('date', 'desc')),
      (snap) => {
        callback(snap.docs.map((d) => d.data() as GolferScore))
      }
    )
  },

  async updateScore(scoreId: string, data: Partial<Pick<GolferScore, 'grossScore' | 'netScore'>>): Promise<void> {
    await updateDoc(doc(db, 'scores', scoreId), { ...data })
  },
}
