import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { UserProfile, UserProfileUpdate } from '@/types'
import { calculateHandicapIndex } from '@/lib/handicap'

interface CreateProfileData {
  displayName: string
  email: string
}

export const userService = {
  async createProfile(uid: string, data: CreateProfileData): Promise<void> {
    const ref = doc(db, 'users', uid)
    await setDoc(ref, {
      uid,
      displayName: data.displayName,
      email: data.email,
      teeSheetHandicap: null,
      isAdmin: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  },

  async getProfile(uid: string): Promise<UserProfile | null> {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return snap.data() as UserProfile
  },

  async updateProfile(uid: string, data: UserProfileUpdate): Promise<void> {
    const ref = doc(db, 'users', uid)
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
  },

  async setAdmin(uid: string, isAdmin: boolean): Promise<void> {
    const ref = doc(db, 'users', uid)
    await updateDoc(ref, { isAdmin, updatedAt: serverTimestamp() })
  },

  async listAllUsers(): Promise<UserProfile[]> {
    const snap = await getDocs(collection(db, 'users'))
    return snap.docs.map((d) => d.data() as UserProfile)
  },

  async addParticipantRoundId(uid: string, roundId: string): Promise<void> {
    await setDoc(doc(db, 'users', uid), {
      participantRoundIds: arrayUnion(roundId),
      updatedAt: serverTimestamp(),
    }, { merge: true })
  },

  async recalculateHandicap(uid: string): Promise<void> {
    const snap = await getDocs(
      query(
        collection(db, 'scores'),
        where('golferId', '==', uid),
      )
    )
    console.log('[handicap] scores found:', snap.docs.length)
    const differentials = snap.docs.map((d) => d.data().differential as number)
    console.log('[handicap] differentials:', differentials)
    const teeSheetHandicap = calculateHandicapIndex(differentials)
    console.log('[handicap] teeSheetHandicap:', teeSheetHandicap)
    await setDoc(doc(db, 'users', uid), { teeSheetHandicap, updatedAt: serverTimestamp() }, { merge: true })
  },
}
