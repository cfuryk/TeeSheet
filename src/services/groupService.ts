import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Group, Score, GroupStatus } from '@/types'
import { courseService } from './courseService'
import { userService } from './userService'
import { roundService } from './roundService'
import { calculateCourseHandicap, buildStrokeAllocation } from '@/lib/handicap'
import { golferScoreService } from './golferScoreService'

function groupsPath(roundId: string) {
  return collection(db, 'rounds', roundId, 'groups')
}

function groupDocPath(roundId: string, groupId: string) {
  return doc(db, 'rounds', roundId, 'groups', groupId)
}

export const groupService = {
  async createGroup(roundId: string, firstGolferId: string, name?: string): Promise<string> {
    const existingSnap = await getDocs(groupsPath(roundId))
    const autoName = name ?? `Group ${existingSnap.size + 1}`
    const ref = await addDoc(groupsPath(roundId), {
      roundId,
      name: autoName,
      golferIds: [firstGolferId],
      teams: null,
      status: 'pending' as GroupStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await updateDoc(ref, { groupId: ref.id })
    // Denormalize groupId and memberId onto round
    await updateDoc(doc(db, 'rounds', roundId), {
      groupIds: arrayUnion(ref.id),
      memberIds: arrayUnion(firstGolferId),
      updatedAt: serverTimestamp(),
    })
    return ref.id
  },

  async addGolferToGroup(roundId: string, groupId: string, golferId: string): Promise<void> {
    const batch = writeBatch(db)
    batch.update(groupDocPath(roundId, groupId), {
      golferIds: arrayUnion(golferId),
      updatedAt: serverTimestamp(),
    })
    batch.update(doc(db, 'rounds', roundId), {
      memberIds: arrayUnion(golferId),
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
    // Track on user profile for My Rounds queries
    await userService.addParticipantRoundId(golferId, roundId)
  },

  async getGroup(roundId: string, groupId: string): Promise<Group | null> {
    const snap = await getDoc(groupDocPath(roundId, groupId))
    if (!snap.exists()) return null
    return { groupId: snap.id, ...snap.data() } as Group
  },

  onGroupSnapshot(roundId: string, groupId: string, callback: (group: Group | null) => void): () => void {
    return onSnapshot(groupDocPath(roundId, groupId), (snap) => {
      callback(snap.exists() ? ({ groupId: snap.id, ...snap.data() } as Group) : null)
    })
  },

  onGroupsSnapshot(roundId: string, callback: (groups: Group[]) => void): () => void {
    return onSnapshot(groupsPath(roundId), (snap) => {
      const groups = snap.docs.map((d) => ({ groupId: d.id, ...d.data() }) as Group)
      groups.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
      groups.forEach((g, i) => {
        if (!g.name) g.name = `Group ${i + 1}`
      })
      callback(groups)
    })
  },

  async updateGroupName(roundId: string, groupId: string, name: string): Promise<void> {
    await updateDoc(groupDocPath(roundId, groupId), {
      name: name || null,
      updatedAt: serverTimestamp(),
    })
  },

  async moveGolfer(roundId: string, fromGroupId: string, toGroupId: string, golferId: string): Promise<void> {
    const batch = writeBatch(db)
    batch.update(groupDocPath(roundId, fromGroupId), {
      golferIds: arrayRemove(golferId),
      updatedAt: serverTimestamp(),
    })
    batch.update(groupDocPath(roundId, toGroupId), {
      golferIds: arrayUnion(golferId),
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
  },

  async deleteGroup(roundId: string, groupId: string): Promise<void> {
    const group = await groupService.getGroup(roundId, groupId)
    if (!group) return
    const batch = writeBatch(db)
    batch.delete(groupDocPath(roundId, groupId))
    batch.update(doc(db, 'rounds', roundId), {
      groupIds: arrayRemove(groupId),
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
  },

  async updateGroupTeams(
    roundId: string,
    groupId: string,
    teams: Group['teams'],
  ): Promise<void> {
    await updateDoc(groupDocPath(roundId, groupId), {
      teams,
      updatedAt: serverTimestamp(),
    })
  },

  async startGroup(roundId: string, groupId: string): Promise<void> {
    const [group, round] = await Promise.all([
      groupService.getGroup(roundId, groupId),
      roundService.getRound(roundId),
    ])
    if (!group || !round) throw new Error('Group or round not found')
    const course = await courseService.getCourse(round.courseId)
    const tee = course?.tees.find((t) => t.teeId === round.teeId)
    if (!tee) throw new Error('Tee not found')

    // If round belongs to an event, use the event's locked handicaps
    let eventHandicaps: Record<string, number> = {}
    if (round.eventId) {
      const eventSnap = await getDoc(doc(db, 'events', round.eventId))
      if (eventSnap.exists()) {
        eventHandicaps = eventSnap.data().handicaps ?? {}
      }
    }

    const batch = writeBatch(db)

    for (const golferId of group.golferIds) {
      const profile = await userService.getProfile(golferId)
      if (!profile) continue
      const handicapIndex = round.eventId
        ? (eventHandicaps[golferId] ?? 0)
        : (profile.teeSheetHandicap ?? 0)
      const courseHandicap = calculateCourseHandicap(handicapIndex, tee.slope, tee.rating, tee.par)
      const strokeAllocation = buildStrokeAllocation(courseHandicap, tee.holes)
      const scoreRef = doc(db, 'rounds', roundId, 'groups', groupId, 'scores', golferId)
      const score: Omit<Score, 'updatedAt'> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
        golferId,
        golferName: profile.displayName,
        courseHandicap,
        strokeAllocation,
        scores: [],
        totalGross: null,
        totalNet: null,
        signedAt: null,
        signedBy: null,
        isLocked: false,
        updatedAt: serverTimestamp(),
      }
      batch.set(scoreRef, score)
    }

    batch.update(groupDocPath(roundId, groupId), {
      status: 'active' as GroupStatus,
      updatedAt: serverTimestamp(),
    })
    // Set round to active if not already
    batch.update(doc(db, 'rounds', roundId), {
      status: 'active',
      updatedAt: serverTimestamp(),
    })

    await batch.commit()
  },

  async checkAndCompleteGroup(roundId: string, groupId: string): Promise<void> {
    const scoresSnap = await getDocs(
      collection(db, 'rounds', roundId, 'groups', groupId, 'scores'),
    )
    const scores = scoresSnap.docs.map((d) => d.data() as Score)
    const group = await groupService.getGroup(roundId, groupId)
    if (!group) return

    const allSigned = group.golferIds.every((uid) => {
      const s = scores.find((sc) => sc.golferId === uid)
      return s?.isLocked === true
    })

    if (allSigned) {
      await updateDoc(groupDocPath(roundId, groupId), {
        status: 'signed' as GroupStatus,
        updatedAt: serverTimestamp(),
      })
      // Check if all groups in the round are signed
      const round = await roundService.getRound(roundId)
      if (!round) return
      const groupsSnap = await getDocs(collection(db, 'rounds', roundId, 'groups'))
      const allGroups = groupsSnap.docs.map((d) => d.data() as Group)
      const allGroupsSigned = round.groupIds.every((gid) => {
        const g = allGroups.find((ag) => ag.groupId === gid)
        return g?.status === 'signed'
      })
      if (allGroupsSigned) {
        await updateDoc(doc(db, 'rounds', roundId), {
          status: 'completed',
          updatedAt: serverTimestamp(),
        })
        // Write a GolferScore doc for each participant and recalculate handicap
        const course = await courseService.getCourse(round.courseId)
        const tee = course?.tees.find((t: { teeId: string }) => t.teeId === round.teeId)
        if (tee) {
          for (const uid of round.memberIds ?? []) {
            // Find the locked score for this golfer across all groups
            for (const gid of round.groupIds) {
              const scoreSnap = await getDoc(doc(db, 'rounds', roundId, 'groups', gid, 'scores', uid))
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
            userService.recalculateHandicap(uid)
          }
        }
      }
    }
  },
}
