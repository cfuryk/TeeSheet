import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { GolfEvent, EventFormData, EventStatus } from '@/types'
import { localDateFromString } from '@/lib/formatters'
import { userService } from './userService'

export const eventService = {
  async createEvent(data: EventFormData, createdBy: string): Promise<string> {
    const ref = await addDoc(collection(db, 'events'), {
      name: data.name,
      description: data.description,
      type: data.type,
      createdBy,
      status: 'upcoming' as EventStatus,
      roundIds: [],
      memberIds: [createdBy],
      handicaps: { [createdBy]: 0 },
      isPrivate: data.isPrivate,
      date: Timestamp.fromDate(localDateFromString(data.date)),
      endDate: data.endDate ? Timestamp.fromDate(localDateFromString(data.endDate)) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await updateDoc(ref, { eventId: ref.id })
    return ref.id
  },

  async getEvent(eventId: string): Promise<GolfEvent | null> {
    const snap = await getDoc(doc(db, 'events', eventId))
    if (!snap.exists()) return null
    return { eventId: snap.id, ...snap.data() } as GolfEvent
  },

  onEventSnapshot(eventId: string, callback: (event: GolfEvent | null) => void): () => void {
    return onSnapshot(doc(db, 'events', eventId), (snap) => {
      callback(snap.exists() ? ({ eventId: snap.id, ...snap.data() } as GolfEvent) : null)
    })
  },

  onTeeSheetEventsSnapshot(callback: (events: GolfEvent[]) => void): () => void {
    const q = query(
      collection(db, 'events'),
      where('isPrivate', '==', false),
      where('status', 'in', ['upcoming', 'active']),
      orderBy('date', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ eventId: d.id, ...d.data() }) as GolfEvent))
    })
  },

  async updateEvent(eventId: string, data: Partial<EventFormData>): Promise<void> {
    const update: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() }
    if (data.date) update.date = Timestamp.fromDate(localDateFromString(data.date))
    if (data.endDate) update.endDate = Timestamp.fromDate(localDateFromString(data.endDate))
    await updateDoc(doc(db, 'events', eventId), update)
  },

  async addRoundToEvent(eventId: string, roundId: string): Promise<void> {
    await updateDoc(doc(db, 'events', eventId), {
      roundIds: arrayUnion(roundId),
      updatedAt: serverTimestamp(),
    })
  },

  async joinEvent(eventId: string, uid: string): Promise<void> {
    const profile = await userService.getProfile(uid)
    const handicap = profile?.teeSheetHandicap ?? 0
    await updateDoc(doc(db, 'events', eventId), {
      memberIds: arrayUnion(uid),
      [`handicaps.${uid}`]: handicap,
      updatedAt: serverTimestamp(),
    })
  },

  async updateParticipantHandicap(eventId: string, uid: string, handicap: number): Promise<void> {
    await updateDoc(doc(db, 'events', eventId), {
      [`handicaps.${uid}`]: handicap,
      updatedAt: serverTimestamp(),
    })
  },

  onMyEventsSnapshot(createdBy: string, callback: (events: GolfEvent[]) => void): () => void {
    const q = query(
      collection(db, 'events'),
      where('createdBy', '==', createdBy),
      orderBy('date', 'desc'),
    )
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ eventId: d.id, ...d.data() }) as GolfEvent))
    })
  },

  onMemberEventsSnapshot(uid: string, callback: (events: GolfEvent[]) => void): () => void {
    const q = query(
      collection(db, 'events'),
      where('memberIds', 'array-contains', uid),
      orderBy('date', 'desc'),
    )
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ eventId: d.id, ...d.data() }) as GolfEvent))
    })
  },

  onAllEventsSnapshot(callback: (events: GolfEvent[]) => void): () => void {
    return onSnapshot(
      query(collection(db, 'events'), orderBy('date', 'desc')),
      (snap) => {
        callback(snap.docs.map((d) => ({ eventId: d.id, ...d.data() }) as GolfEvent))
      }
    )
  },
}
