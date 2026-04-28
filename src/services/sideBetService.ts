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
import { nassauSegmentScore, computeMatchHole } from '@/lib/scoring'
import type { SideBet, SideBetStatus, SideBetType, HammerConfig, HammerHoleResult, SkinsHoleResult, MatchPlayers } from '@/types'
import type { Score } from '@/types'

const IMPLEMENTED_TYPES: SideBetType[] = [
  'STROKE_GROSS',
  'STROKE_NET',
  'NASSAU_GROSS',
  'NASSAU_NET',
  'HAMMER',
  'SKINS_GROSS',
  'SKINS_NET',
  'MATCH_GROSS',
  'MATCH_NET',
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

  /** Create a Hammer bet — creator is confirmed, all other assigned players are invited */
  async createHammerBet(
    roundId: string,
    data: {
      createdBy: string
      groupId: string
      format: HammerConfig['format']
      firstRule: HammerConfig['firstRule']
      sideA: string[]
      sideB: string[]
      baseStake: number
      scoring: 'gross' | 'net'
    },
  ): Promise<string> {
    const hammerConfig: HammerConfig = {
      format: data.format,
      firstRule: data.firstRule,
      sideA: data.sideA,
      sideB: data.sideB,
      baseStake: data.baseStake,
      scoring: data.scoring,
      holeResults: [],
      currentHoleStake: data.baseStake,
      hammerHolder: null,
      lastThrowerSide: null,
      currentHoleHammers: 0,
    }
    const allPlayers = [...data.sideA, ...data.sideB]
    const invitedIds = allPlayers.filter((uid) => uid !== data.createdBy)
    const ref = await addDoc(sideBetsPath(roundId), {
      roundId,
      type: 'HAMMER' as SideBetType,
      status: 'pending' as SideBetStatus,
      wagerPerPerson: data.baseStake,
      createdBy: data.createdBy,
      participantIds: [data.createdBy],
      invitedIds,
      declinedIds: [],
      requestIds: [],
      winnersIds: null,
      hammerConfig,
      settledAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await updateDoc(ref, { sideBetId: ref.id })
    return ref.id
  },

  /** Create a Match Play bet — creator is confirmed, all other assigned players are invited */
  async createMatchBet(
    roundId: string,
    data: {
      createdBy: string
      format: MatchPlayers['format']
      sideA: string[]
      sideB: string[]
      wager: number
      scoring: 'gross' | 'net'
    },
  ): Promise<string> {
    const type: SideBetType = data.scoring === 'net' ? 'MATCH_NET' : 'MATCH_GROSS'
    const matchPlayers: MatchPlayers = {
      format: data.format,
      sideA: data.sideA,
      sideB: data.sideB,
      scoring: data.scoring,
    }
    const allPlayers = [...data.sideA, ...data.sideB]
    const invitedIds = allPlayers.filter((uid) => uid !== data.createdBy)
    const ref = await addDoc(sideBetsPath(roundId), {
      roundId,
      type,
      status: 'pending' as SideBetStatus,
      wagerPerPerson: data.wager,
      createdBy: data.createdBy,
      participantIds: [data.createdBy],
      invitedIds,
      declinedIds: [],
      requestIds: [],
      winnersIds: null,
      matchPlayers,
      settledAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await updateDoc(ref, { sideBetId: ref.id })
    return ref.id
  },

  /** Side throws the hammer — doubles current hole stake and marks holder */
  async throwHammer(roundId: string, sideBetId: string, bySide: 'A' | 'B', currentStake: number, currentHammers: number): Promise<void> {
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      'hammerConfig.hammerHolder': bySide,
      'hammerConfig.lastThrowerSide': bySide,
      'hammerConfig.currentHoleStake': currentStake * 2,
      'hammerConfig.currentHoleHammers': currentHammers + 1,
      updatedAt: serverTimestamp(),
    })
  },

  /** Receiving side accepts the hammer — play continues at doubled stake, ownership flips */
  async acceptHammer(roundId: string, sideBetId: string, acceptingSide: 'A' | 'B'): Promise<void> {
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      'hammerConfig.hammerHolder': null,
      'hammerConfig.lastThrowerSide': acceptingSide, // accepting side now holds the right to throw next
      updatedAt: serverTimestamp(),
    })
  },

  /** Receiving side folds — they pay the pre-double stake (currentStake / 2) */
  async foldHammer(
    roundId: string,
    sideBetId: string,
    foldingSide: 'A' | 'B',
    hole: number,
    currentStake: number,
    currentHammers: number,
    baseStake: number,
  ): Promise<void> {
    const result: HammerHoleResult = {
      hole,
      stake: currentStake / 2,
      winningSide: null,
      hammersThrown: currentHammers,
      foldedBy: foldingSide,
    }
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      'hammerConfig.holeResults': arrayUnion(result),
      'hammerConfig.currentHoleStake': baseStake,
      'hammerConfig.hammerHolder': null,
      'hammerConfig.lastThrowerSide': foldingSide, // folding side gets the hammer next
      'hammerConfig.currentHoleHammers': 0,
      updatedAt: serverTimestamp(),
    })
  },

  /** Record the outcome of a played hole (no fold) */
  async recordHoleResult(
    roundId: string,
    sideBetId: string,
    hole: number,
    winningSide: 'A' | 'B' | 'tie',
    currentStake: number,
    currentHammers: number,
    baseStake: number,
  ): Promise<void> {
    const result: HammerHoleResult = {
      hole,
      stake: currentStake,
      winningSide,
      hammersThrown: currentHammers,
      foldedBy: null,
    }
    await updateDoc(sideBetDocPath(roundId, sideBetId), {
      'hammerConfig.holeResults': arrayUnion(result),
      'hammerConfig.currentHoleStake': baseStake,
      'hammerConfig.hammerHolder': null,
      'hammerConfig.currentHoleHammers': 0,
      updatedAt: serverTimestamp(),
    })
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

      // ── Hammer ──────────────────────────────────────────────────────────────
      if (bet.type === 'HAMMER') {
        const config = bet.hammerConfig
        if (!config) continue
        // Deduplicate by hole before counting
        const uniqueResults = Object.values(Object.fromEntries(config.holeResults.map((r) => [r.hole, r])))
        if (uniqueResults.length < 18) continue

        let sideANet = 0
        const holeByHole: { hole: number; amount: number; winner: 'A' | 'B' | 'tie' }[] = []

        for (const r of uniqueResults) {
          if (r.foldedBy === 'B' || r.winningSide === 'A') {
            sideANet += r.stake
            holeByHole.push({ hole: r.hole, amount: r.stake, winner: 'A' })
          } else if (r.foldedBy === 'A' || r.winningSide === 'B') {
            sideANet -= r.stake
            holeByHole.push({ hole: r.hole, amount: r.stake, winner: 'B' })
          } else {
            holeByHole.push({ hole: r.hole, amount: 0, winner: 'tie' })
          }
        }

        batch.update(sideBetDocPath(roundId, bet.sideBetId), {
          status: 'settled' as SideBetStatus,
          hammerResult: { sideANet, sideBNet: -sideANet, holeByHole },
          winnersIds: sideANet > 0 ? config.sideA : sideANet < 0 ? config.sideB : [],
          settledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        continue
      }

      // ── Skins ────────────────────────────────────────────────────────────────
      if (bet.type === 'SKINS_GROSS' || bet.type === 'SKINS_NET') {
        const useNet = bet.type === 'SKINS_NET'
        const participantScores = allScores.filter((s) => bet.participantIds.includes(s.golferId))

        // Require all participants to have all 18 holes scored
        const allComplete = bet.participantIds.every((uid) => {
          const sc = participantScores.find((s) => s.golferId === uid)
          return sc && sc.scores.length >= 18 &&
            sc.scores.every((h) => (useNet ? h.netScore : h.grossScore) != null)
        })
        if (!allComplete) continue

        const holeResults: SkinsHoleResult[] = []
        for (let hole = 1; hole <= 18; hole++) {
          const holeScores: { uid: string; score: number }[] = []
          for (const sc of participantScores) {
            const hs = sc.scores.find((h) => h.hole === hole)
            if (!hs) continue
            const score = useNet ? hs.netScore : hs.grossScore
            if (score != null) holeScores.push({ uid: sc.golferId, score })
          }
          if (holeScores.length < bet.participantIds.length) continue
          const minScore = Math.min(...holeScores.map((h) => h.score))
          const winners = holeScores.filter((h) => h.score === minScore)
          holeResults.push({
            hole,
            winnerId: winners.length === 1 ? winners[0].uid : null,
            score: minScore,
          })
        }

        if (holeResults.length < 18) continue

        const skinsCount = holeResults.filter((r) => r.winnerId !== null).length
        const totalPot = bet.participantIds.length * bet.wagerPerPerson
        const payoutPerSkin = skinsCount > 0 ? totalPot / skinsCount : 0
        const earningsByPlayer: Record<string, number> = {}
        for (const r of holeResults) {
          if (r.winnerId) {
            earningsByPlayer[r.winnerId] = (earningsByPlayer[r.winnerId] ?? 0) + payoutPerSkin
          }
        }
        const winnersIds = bet.participantIds.filter((uid) => (earningsByPlayer[uid] ?? 0) > 0)

        batch.update(sideBetDocPath(roundId, bet.sideBetId), {
          status: 'settled' as SideBetStatus,
          skinsResult: { holeResults, totalPot, skinsCount, payoutPerSkin, earningsByPlayer },
          winnersIds,
          settledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        continue
      }

      // ── Match Play ──────────────────────────────────────────────────────────
      if (bet.type === 'MATCH_GROSS' || bet.type === 'MATCH_NET') {
        const mp = bet.matchPlayers
        if (!mp) continue
        const useNet = bet.type === 'MATCH_NET'
        const allPlayers = [...mp.sideA, ...mp.sideB]
        const participantScores = allScores.filter((s) => allPlayers.includes(s.golferId))
        const allComplete = allPlayers.every((uid) => {
          const sc = participantScores.find((s) => s.golferId === uid)
          return sc && sc.scores.length >= 18 &&
            sc.scores.every((h) => (useNet ? h.netScore : h.grossScore) != null)
        })
        if (!allComplete) continue

        const scoreMap: Record<string, Score> = {}
        for (const sc of participantScores) scoreMap[sc.golferId] = sc

        let aWins = 0, bWins = 0
        for (let hole = 1; hole <= 18; hole++) {
          const result = computeMatchHole(hole, mp.sideA, mp.sideB, scoreMap, useNet)
          if (result === 'A') aWins++
          else if (result === 'B') bWins++
        }

        const winnersIds = aWins > bWins ? mp.sideA : bWins > aWins ? mp.sideB : []
        batch.update(sideBetDocPath(roundId, bet.sideBetId), {
          status: 'settled' as SideBetStatus,
          winnersIds,
          settledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        continue
      }

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

