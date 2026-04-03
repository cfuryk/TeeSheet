import {
  doc,
  collection,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Score, HoleScore } from '@/types'

function scoresPath(roundId: string, groupId: string) {
  return collection(db, 'rounds', roundId, 'groups', groupId, 'scores')
}

function scoreDocPath(roundId: string, groupId: string, uid: string) {
  return doc(db, 'rounds', roundId, 'groups', groupId, 'scores', uid)
}

export const scoreService = {
  onScoresSnapshot(
    roundId: string,
    groupId: string,
    callback: (scores: Score[]) => void,
  ): () => void {
    return onSnapshot(scoresPath(roundId, groupId), (snap) => {
      callback(snap.docs.map((d) => d.data() as Score))
    })
  },

  async getScore(roundId: string, groupId: string, uid: string): Promise<Score | null> {
    const snap = await getDoc(scoreDocPath(roundId, groupId, uid))
    return snap.exists() ? (snap.data() as Score) : null
  },

  async getAllScores(roundId: string, groupId: string): Promise<Score[]> {
    const snap = await getDocs(scoresPath(roundId, groupId))
    return snap.docs.map((d) => d.data() as Score)
  },

  async updateHoleScore(
    roundId: string,
    groupId: string,
    uid: string,
    holeScore: HoleScore,
    allScores: HoleScore[],
  ): Promise<void> {
    const updated = [
      ...allScores.filter((s) => s.hole !== holeScore.hole),
      holeScore,
    ].sort((a, b) => a.hole - b.hole)

    const totalGross = updated.length === 18 ? updated.reduce((sum, s) => sum + s.grossScore, 0) : null
    const totalNet = updated.length === 18 ? updated.reduce((sum, s) => sum + s.netScore, 0) : null

    await updateDoc(scoreDocPath(roundId, groupId, uid), {
      scores: updated,
      totalGross,
      totalNet,
      updatedAt: serverTimestamp(),
    })
  },

  async signScore(roundId: string, groupId: string, uid: string, signedByUid: string): Promise<void> {
    await updateDoc(scoreDocPath(roundId, groupId, uid), {
      isLocked: true,
      signedAt: Timestamp.now(),
      signedBy: signedByUid,
      updatedAt: serverTimestamp(),
    })
  },

  async unlockScore(roundId: string, groupId: string, uid: string): Promise<void> {
    await updateDoc(scoreDocPath(roundId, groupId, uid), {
      isLocked: false,
      signedAt: null,
      signedBy: null,
      updatedAt: serverTimestamp(),
    })
  },
}
