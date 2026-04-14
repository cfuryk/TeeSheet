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
import type { Foursome } from '@/types/round'
import { courseService } from './courseService'
import { userService } from './userService'
import { roundService } from './roundService'
import { calculateCourseHandicap, buildStrokeAllocation, applyHandicapPercent } from '@/lib/handicap'
import { golferScoreService } from './golferScoreService'
import { sideBetService } from './sideBetService'
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
      groupAdminId: firstGolferId,
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

  /**
   * Distribute all memberIds of a round into groups of 4, creating new groups
   * as needed. The creator is placed in the first group (already created).
   * Called after cascading event members to a new round.
   */
  async fillGroupsFromMembers(roundId: string, memberIds: string[], _creatorId: string): Promise<void> {
    if (memberIds.length === 0) return

    // Fetch existing groups
    const existingSnap = await getDocs(groupsPath(roundId))
    const existing = existingSnap.docs.map((d) => ({ groupId: d.id, ...d.data() }) as Group)

    // Build mutable buckets from existing groups
    const groupBuckets: { groupId: string; members: string[] }[] = existing.map((g) => ({
      groupId: g.groupId,
      members: [...g.golferIds],
    }))

    // Determine who still needs a slot
    const alreadyPlaced = new Set(groupBuckets.flatMap((b) => b.members))
    const toPlace = memberIds.filter((uid) => !alreadyPlaced.has(uid))

    if (toPlace.length === 0) return

    let newGroupIndex = existing.length + 1

    for (const uid of toPlace) {
      const bucket = groupBuckets.find((b) => b.members.length < 4)
      if (bucket) {
        bucket.members.push(uid)
      } else {
        // Create a new group document
        const name = `Group ${newGroupIndex++}`
        const ref = await addDoc(groupsPath(roundId), {
          roundId,
          name,
          golferIds: [uid],
          teams: null,
          groupAdminId: uid,
          status: 'pending' as GroupStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        await updateDoc(ref, { groupId: ref.id })
        await updateDoc(doc(db, 'rounds', roundId), {
          groupIds: arrayUnion(ref.id),
          updatedAt: serverTimestamp(),
        })
        groupBuckets.push({ groupId: ref.id, members: [uid] })
      }
    }

    // Persist updated golferIds for existing buckets that changed
    const batch = writeBatch(db)
    for (const bucket of groupBuckets) {
      const orig = existing.find((g) => g.groupId === bucket.groupId)
      if (orig && orig.golferIds.length !== bucket.members.length) {
        batch.update(groupDocPath(roundId, bucket.groupId), {
          golferIds: bucket.members,
          updatedAt: serverTimestamp(),
        })
      }
    }
    await batch.commit()
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

  async swapGolfers(
    roundId: string,
    golferA: { golferId: string; groupId: string },
    golferB: { golferId: string; groupId: string },
  ): Promise<void> {
    if (golferA.groupId === golferB.groupId) return
    // Fetch both groups to get current golferIds arrays
    const [snapA, snapB] = await Promise.all([
      getDoc(groupDocPath(roundId, golferA.groupId)),
      getDoc(groupDocPath(roundId, golferB.groupId)),
    ])
    if (!snapA.exists() || !snapB.exists()) return
    const idsA: string[] = snapA.data().golferIds ?? []
    const idsB: string[] = snapB.data().golferIds ?? []
    // Build new arrays: replace A with B in groupA, replace B with A in groupB
    const newIdsA = idsA.map((id) => (id === golferA.golferId ? golferB.golferId : id))
    const newIdsB = idsB.map((id) => (id === golferB.golferId ? golferA.golferId : id))
    const batch = writeBatch(db)
    batch.update(groupDocPath(roundId, golferA.groupId), {
      golferIds: newIdsA,
      updatedAt: serverTimestamp(),
    })
    batch.update(groupDocPath(roundId, golferB.groupId), {
      golferIds: newIdsB,
      updatedAt: serverTimestamp(),
    })
    await batch.commit()
  },

  async abandonGroup(roundId: string, groupId: string, golferId: string): Promise<void> {
    // Delete only this golfer's score doc and reset the group to pending
    const batch = writeBatch(db)
    batch.delete(doc(db, 'rounds', roundId, 'groups', groupId, 'scores', golferId))
    batch.update(groupDocPath(roundId, groupId), {
      status: 'pending' as GroupStatus,
      updatedAt: serverTimestamp(),
    })
    batch.update(doc(db, 'rounds', roundId), {
      status: 'pending',
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

    if (round.scoringFormat === 'scramble') {
      // Scramble: one shared score doc keyed to the group admin
      const adminId = group.groupAdminId ?? group.golferIds[0]
      const adminProfile = await userService.getProfile(adminId)
      const scoreRef = doc(db, 'rounds', roundId, 'groups', groupId, 'scores', adminId)
      const score: Omit<Score, 'updatedAt'> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
        golferId: adminId,
        golferName: group.name ?? 'Group',
        courseHandicap: 0,
        strokeAllocation: Array(18).fill(0),
        scores: [],
        totalGross: null,
        totalNet: null,
        signedAt: null,
        signedBy: null,
        isLocked: false,
        updatedAt: serverTimestamp(),
      }
      // Suppress unused variable warning
      void adminProfile
      batch.set(scoreRef, score)
    } else {
      // Apply match handicap percentage if round has a NET match configured
      const handicapPercent = round.match?.scoring === 'NET'
        ? (round.match.handicapPercent ?? 80)
        : 100

      for (const golferId of group.golferIds) {
        const profile = await userService.getProfile(golferId)
        if (!profile) continue
        const handicapIndex = round.eventId
          ? (eventHandicaps[golferId] ?? 0)
          : (profile.teeSheetHandicap ?? 0)
        const rawCourseHandicap = calculateCourseHandicap(handicapIndex, tee.slope, tee.rating, tee.par)
        const courseHandicap = applyHandicapPercent(rawCourseHandicap, handicapPercent)
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

    const round = await roundService.getRound(roundId)
    if (!round) return

    const isScramble = round.scoringFormat === 'scramble'

    // For scramble: only the admin's score doc needs to be signed
    // For normal rounds: every golfer in the group must have a signed score
    const allSigned = isScramble
      ? scores.every((s) => s.isLocked)
      : group.golferIds.every((uid) => {
          const s = scores.find((sc) => sc.golferId === uid)
          return s?.isLocked === true
        })

    if (allSigned) {
      await updateDoc(groupDocPath(roundId, groupId), {
        status: 'signed' as GroupStatus,
        updatedAt: serverTimestamp(),
      })
      // Check if all groups in the round are signed
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
        // Scramble scores do NOT feed into handicap calculation
        if (!isScramble) {
          const course = await courseService.getCourse(round.courseId)
          const tee = course?.tees.find((t: { teeId: string }) => t.teeId === round.teeId)
          if (tee) {
            for (const uid of round.memberIds ?? []) {
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
              await userService.recalculateHandicap(uid)
            }
          }
        }
        // Settle any active/pending side bets
        const allGroupScoreSnaps = await Promise.all(
          round.groupIds.map((gid) =>
            getDocs(collection(db, 'rounds', roundId, 'groups', gid, 'scores'))
          )
        )
        const allFlatScores = allGroupScoreSnaps.flatMap((snap) =>
          snap.docs.map((d) => d.data() as Score)
        )
        await sideBetService.settleSideBets(roundId, allFlatScores)
      }
    }
  },

  /**
   * Replace all existing groups for a round with the foursomes defined in the
   * match team builder. Each Foursome becomes one Group with golferIds = teamA + teamB
   * and teams = { teamA, teamB }. Existing pending groups are deleted first.
   * Groups that are already active/completed/signed are left untouched.
   */
  async applyMatchFoursomes(roundId: string, foursomes: Foursome[]): Promise<void> {
    if (foursomes.length === 0) return

    // Fetch existing groups — only delete pending ones to avoid destroying in-progress play
    const existingSnap = await getDocs(groupsPath(roundId))
    const existing = existingSnap.docs.map((d) => ({ groupId: d.id, ...d.data() }) as Group)
    const pendingGroups = existing.filter((g) => g.status === 'pending')

    const batch = writeBatch(db)
    for (const g of pendingGroups) {
      batch.delete(groupDocPath(roundId, g.groupId))
      batch.update(doc(db, 'rounds', roundId), {
        groupIds: arrayRemove(g.groupId),
        updatedAt: serverTimestamp(),
      })
    }
    await batch.commit()

    // Create one group per foursome
    const allMemberIds: string[] = []
    for (let i = 0; i < foursomes.length; i++) {
      const fs = foursomes[i]
      const golferIds = [...fs.teamA, ...fs.teamB]
      allMemberIds.push(...golferIds)
      const ref = await addDoc(groupsPath(roundId), {
        roundId,
        name: `Group ${i + 1}`,
        golferIds,
        teams: { teamA: fs.teamA, teamB: fs.teamB },
        groupAdminId: golferIds[0] ?? null,
        status: 'pending' as GroupStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      await updateDoc(ref, { groupId: ref.id })
      await updateDoc(doc(db, 'rounds', roundId), {
        groupIds: arrayUnion(ref.id),
        updatedAt: serverTimestamp(),
      })
    }

    // Ensure all foursome members are in round.memberIds
    if (allMemberIds.length > 0) {
      await updateDoc(doc(db, 'rounds', roundId), {
        memberIds: arrayUnion(...allMemberIds),
        updatedAt: serverTimestamp(),
      })
    }
  },
}
