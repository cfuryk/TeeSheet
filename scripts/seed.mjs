/**
 * Seed script — populates Firestore with one completed round per scoring type.
 *
 * Usage:
 *   node scripts/seed.mjs            # seed all round types
 *   node scripts/seed.mjs --clean    # delete all seeded data
 *
 * Requirements:
 *   npm install firebase dotenv      (firebase is already in package.json)
 *
 * The script reads VITE_* vars from .env in the project root.
 * It uses fake UIDs for golfers — no real auth accounts needed.
 * All seeded docs are tagged with  __seeded: true  for easy cleanup.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'

// ─── Load .env manually (no dotenv required) ─────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env')
const envVars = {}
try {
  const raw = readFileSync(envPath, 'utf-8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    envVars[key] = val
  }
} catch {
  console.error('Could not read .env file at', envPath)
  process.exit(1)
}

function env(key) {
  const v = envVars[key]
  if (!v) { console.error(`Missing env var: ${key}`); process.exit(1) }
  return v
}

const app = initializeApp({
  apiKey:            env('VITE_FIREBASE_API_KEY'),
  authDomain:        env('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId:         env('VITE_FIREBASE_PROJECT_ID'),
  storageBucket:     env('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: env('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId:             env('VITE_FIREBASE_APP_ID'),
})
const auth = getAuth(app)
const db = getFirestore(app)

// Sign in with credentials from env (never hard-coded)
const SEED_EMAIL    = envVars['SEED_EMAIL']
const SEED_PASSWORD = envVars['SEED_PASSWORD']
if (!SEED_EMAIL || !SEED_PASSWORD) {
  console.error('Add SEED_EMAIL and SEED_PASSWORD to your .env file.')
  console.error('These are your normal login credentials — used only locally, never committed.')
  process.exit(1)
}
console.log(`\n🔐 Signing in as ${SEED_EMAIL} (password length: ${SEED_PASSWORD.length})...`)
const cred = await signInWithEmailAndPassword(auth, SEED_EMAIL, SEED_PASSWORD)
// Use the real UID so rounds show up in "My Rounds"
const CREATOR_UID = cred.user.uid
// Ensure seed user has an admin profile so it can delete its own subcollection docs
await setDoc(doc(db, 'users', CREATOR_UID), {
  displayName: 'Seed User',
  email: SEED_EMAIL,
  isAdmin: true,
  teeSheetHandicap: 0,
}, { merge: true })

console.log(`  Signed in (uid: ${CREATOR_UID})`)

// ─── Fake golfers ─────────────────────────────────────────────────────────────
const GOLFERS = [
  { uid: 'seed-golfer-001', name: 'Alice Johnson',   handicap: 8  },
  { uid: 'seed-golfer-002', name: 'Bob Martinez',    handicap: 14 },
  { uid: 'seed-golfer-003', name: 'Carol Williams',  handicap: 5  },
  { uid: 'seed-golfer-004', name: 'David Lee',       handicap: 20 },
  { uid: 'seed-golfer-005', name: 'Ethan Brooks',    handicap: 11 },
  { uid: 'seed-golfer-006', name: 'Fiona Chen',      handicap: 3  },
  { uid: 'seed-golfer-007', name: 'George Patel',    handicap: 17 },
  { uid: 'seed-golfer-008', name: 'Hannah Kim',      handicap: 9  },
  { uid: 'seed-golfer-009', name: 'Ivan Torres',     handicap: 22 },
  { uid: 'seed-golfer-010', name: 'Julia Novak',     handicap: 6  },
  { uid: 'seed-golfer-011', name: 'Kevin Walsh',     handicap: 15 },
  { uid: 'seed-golfer-012', name: 'Laura Singh',     handicap: 12 },
  { uid: 'seed-golfer-013', name: 'Marcus Reed',     handicap: 18 },
  { uid: 'seed-golfer-014', name: 'Nina Clarke',     handicap: 4  },
  { uid: 'seed-golfer-015', name: 'Omar Hassan',     handicap: 25 },
  { uid: 'seed-golfer-016', name: 'Petra Volkov',    handicap: 7  },
]

// ─── A realistic 18-hole par layout (slope 128, rating 71.4) ─────────────────
const HOLES = [
  { number: 1,  par: 4, yardage: 412, handicap: 5  },
  { number: 2,  par: 3, yardage: 178, handicap: 15 },
  { number: 3,  par: 5, yardage: 521, handicap: 1  },
  { number: 4,  par: 4, yardage: 388, handicap: 11 },
  { number: 5,  par: 4, yardage: 401, handicap: 7  },
  { number: 6,  par: 3, yardage: 162, handicap: 17 },
  { number: 7,  par: 5, yardage: 548, handicap: 3  },
  { number: 8,  par: 4, yardage: 376, handicap: 13 },
  { number: 9,  par: 4, yardage: 395, handicap: 9  },
  { number: 10, par: 4, yardage: 420, handicap: 4  },
  { number: 11, par: 3, yardage: 191, handicap: 16 },
  { number: 12, par: 5, yardage: 533, handicap: 2  },
  { number: 13, par: 4, yardage: 367, handicap: 12 },
  { number: 14, par: 4, yardage: 444, handicap: 6  },
  { number: 15, par: 3, yardage: 155, handicap: 18 },
  { number: 16, par: 5, yardage: 512, handicap: 8  },
  { number: 17, par: 4, yardage: 393, handicap: 10 },
  { number: 18, par: 4, yardage: 408, handicap: 14 },
]
const TOTAL_PAR = HOLES.reduce((s, h) => s + h.par, 0) // 72

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Course handicap formula: handicapIndex * (slope/113) + (rating - par) */
function courseHandicap(index, slope = 128, rating = 71.4, par = 72) {
  return Math.round(index * (slope / 113) + (rating - par))
}

/** Build stroke allocation array: 1 on holes where handicap <= courseHcp, else 0.
 *  Returns array[18] where value is strokes received on that hole. */
function strokeAllocation(courseHcp) {
  return HOLES.map((h) => (h.handicap <= courseHcp ? 1 : 0))
}

/** Generate a plausible gross score for a hole given player handicap.
 *  Higher handicap = slightly worse, with some randomness. */
function holeGross(holePar, playerCourseHcp, strokesOnHole) {
  // Base: bogey golf for a 18-hcp, scratch for 0
  const base = holePar + Math.round(playerCourseHcp / 18)
  const jitter = Math.random() < 0.25 ? -1 : Math.random() < 0.25 ? 1 : 0
  return Math.max(1, base + jitter)
}

/** Build 18 HoleScore objects for a golfer */
function buildScores(golfer) {
  const chp = courseHandicap(golfer.handicap)
  const sa = strokeAllocation(chp)
  return HOLES.map((h, i) => {
    const gross = holeGross(h.par, chp, sa[i])
    const net = gross - sa[i]
    return { hole: h.number, grossScore: gross, netScore: net }
  })
}

function totalGross(scores) { return scores.reduce((s, h) => s + h.grossScore, 0) }
function totalNet(scores)   { return scores.reduce((s, h) => s + h.netScore, 0) }

const NOW = Timestamp.now()
// Past date + completed status so rounds appear in admin and "View Summary" is accessible
const LAST_WEEK = new Date(); LAST_WEEK.setDate(LAST_WEEK.getDate() - 7); LAST_WEEK.setHours(0, 0, 0, 0)
const ROUND_DATE = Timestamp.fromDate(LAST_WEEK)

// ─── Course + Tee (created once, reused across all rounds) ───────────────────

async function ensureSeedCourse() {
  // Check if we already created a seed course
  const q = query(collection(db, 'courses'), where('__seeded', '==', true))
  const snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0]
    const data = d.data()
    return { courseId: d.id, teeId: data.tees[0].teeId }
  }

  const teeId = 'seed-tee-white'
  const courseRef = await addDoc(collection(db, 'courses'), {
    name: 'Seed Golf Club',
    createdBy: CREATOR_UID,
    __seeded: true,
    tees: [{
      teeId,
      name: 'White',
      par: TOTAL_PAR,
      yardage: HOLES.reduce((s, h) => s + h.yardage, 0),
      slope: 128,
      rating: 71.4,
      holes: HOLES,
    }],
    createdAt: NOW,
    updatedAt: NOW,
  })
  await updateDoc(courseRef, { courseId: courseRef.id })
  return { courseId: courseRef.id, teeId }
}

// ─── Pending round writer (no scores, groups are pending) ────────────────────

async function createPendingRound({
  name,
  scoringFormat,
  roundType,
  courseId,
  teeId,
  memberUids,   // flat list of all member UIDs who have joined
  groups,       // array of { golfers: Golfer[] } — just the golfer lists, no scores
}) {
  const roundRef = await addDoc(collection(db, 'rounds'), {
    name,
    courseId,
    courseName: 'Seed Golf Club',
    teeId,
    teeName: 'White',
    date: Timestamp.fromDate(new Date()),  // today — pending rounds haven't happened yet
    scoringFormat,
    roundType,
    isPrivate: false,
    createdBy: CREATOR_UID,
    status: 'pending',
    eventId: null,
    groupIds: [],
    memberIds: memberUids,
    teamAssignments: null,
    __seeded: true,
    createdAt: NOW,
    updatedAt: NOW,
  })
  await updateDoc(roundRef, { roundId: roundRef.id })
  const roundId = roundRef.id

  const allGroupIds = []
  for (let gi = 0; gi < groups.length; gi++) {
    const grp = groups[gi]
    const groupRef = await addDoc(collection(db, 'rounds', roundId, 'groups'), {
      roundId,
      name: groups.length === 1 ? 'Group 1' : `Group ${gi + 1}`,
      golferIds: grp.golfers.map((p) => p.uid),
      teams: null,
      status: 'pending',
      groupAdminId: grp.golfers[0].uid,
      __seeded: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
    await updateDoc(groupRef, { groupId: groupRef.id })
    allGroupIds.push(groupRef.id)
  }

  await updateDoc(roundRef, { groupIds: allGroupIds })
  console.log(`  ✓ ${name} (pending)`)
  console.log(`    Detail:  /rounds/${roundId}`)
  console.log(`    SideBets: /rounds/${roundId}/side-bets`)
  return roundId
}

// ─── Side Bets writer ─────────────────────────────────────────────────────────

async function seedSideBets(roundId, bets) {
  for (const bet of bets) {
    const ref = await addDoc(collection(db, 'rounds', roundId, 'sideBets'), {
      ...bet,
      roundId,
      __seeded: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
    await updateDoc(ref, { sideBetId: ref.id })
  }
  console.log(`    + ${bets.length} side bets`)
}

// ─── Active round writer (in progress — partial scores, no sign-off) ─────────

async function createActiveRound({
  name,
  scoringFormat,
  roundType,
  courseId,
  teeId,
  groups, // array of { golfers: Golfer[] }
  holesPlayed = 9, // how many holes have been scored so far
}) {
  const memberIds = groups.flatMap((g) => g.golfers.map((p) => p.uid))
  const roundRef = await addDoc(collection(db, 'rounds'), {
    name,
    courseId,
    courseName: 'Seed Golf Club',
    teeId,
    teeName: 'White',
    date: Timestamp.fromDate(new Date()),
    scoringFormat,
    roundType,
    isPrivate: false,
    createdBy: CREATOR_UID,
    status: 'active',
    eventId: null,
    groupIds: [],
    memberIds,
    teamAssignments: null,
    __seeded: true,
    createdAt: NOW,
    updatedAt: NOW,
  })
  await updateDoc(roundRef, { roundId: roundRef.id })
  const roundId = roundRef.id

  const allGroupIds = []
  for (let gi = 0; gi < groups.length; gi++) {
    const grp = groups[gi]
    const groupRef = await addDoc(collection(db, 'rounds', roundId, 'groups'), {
      roundId,
      name: groups.length === 1 ? 'Group 1' : `Group ${gi + 1}`,
      golferIds: grp.golfers.map((p) => p.uid),
      teams: null,
      status: 'active',
      groupAdminId: grp.golfers[0].uid,
      __seeded: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
    await updateDoc(groupRef, { groupId: groupRef.id })
    const groupId = groupRef.id
    allGroupIds.push(groupId)

    // Write partial scores (only holesPlayed holes scored)
    for (const golfer of grp.golfers) {
      const chp = courseHandicap(golfer.handicap)
      const sa = strokeAllocation(chp)
      const allScores = buildScores(golfer)
      const partialScores = allScores.slice(0, holesPlayed)
      await setDoc(doc(db, 'rounds', roundId, 'groups', groupId, 'scores', golfer.uid), {
        golferId: golfer.uid,
        golferName: golfer.name,
        courseHandicap: chp,
        strokeAllocation: sa,
        scores: partialScores,
        totalGross: totalGross(partialScores),
        totalNet: totalNet(partialScores),
        signedAt: null,
        signedBy: null,
        isLocked: false,
        updatedAt: NOW,
      })
    }
  }

  await updateDoc(roundRef, { groupIds: allGroupIds })
  console.log(`  ✓ ${name} (active, ${holesPlayed} holes played)`)
  console.log(`    Detail:  /rounds/${roundId}`)
  console.log(`    SideBets: /rounds/${roundId}/side-bets`)
  return roundId
}

// ─── Round + Group + Scores writer ───────────────────────────────────────────

async function createRound({
  name,
  scoringFormat,
  roundType,
  teamAssignments = null,
  courseId,
  teeId,
  groups, // array of { golfers: Golfer[], teams?: {teamA: uid[], teamB: uid[]} }
}) {
  // Create round doc
  const roundRef = await addDoc(collection(db, 'rounds'), {
    name,
    courseId,
    courseName: 'Seed Golf Club',
    teeId,
    teeName: 'White',
    date: ROUND_DATE,
    scoringFormat,
    roundType,
    isPrivate: false,
    createdBy: CREATOR_UID,
    status: 'completed',
    eventId: null,
    groupIds: [],
    memberIds: groups.flatMap((g) => g.golfers.map((p) => p.uid)),
    teamAssignments,
    __seeded: true,
    createdAt: NOW,
    updatedAt: NOW,
  })
  await updateDoc(roundRef, { roundId: roundRef.id })
  const roundId = roundRef.id

  const allGroupIds = []

  for (let gi = 0; gi < groups.length; gi++) {
    const grp = groups[gi]
    const groupRef = await addDoc(collection(db, 'rounds', roundId, 'groups'), {
      roundId,
      name: groups.length === 1 ? 'Group 1' : `Group ${gi + 1}`,
      golferIds: grp.golfers.map((p) => p.uid),
      teams: grp.teams ?? null,
      status: 'signed',
      __seeded: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
    await updateDoc(groupRef, { groupId: groupRef.id })
    const groupId = groupRef.id
    allGroupIds.push(groupId)

    // Write scores for each golfer in this group
    for (const golfer of grp.golfers) {
      const chp = courseHandicap(golfer.handicap)
      const sa = strokeAllocation(chp)
      const scores = buildScores(golfer)
      await setDoc(doc(db, 'rounds', roundId, 'groups', groupId, 'scores', golfer.uid), {
        golferId: golfer.uid,
        golferName: golfer.name,
        courseHandicap: chp,
        strokeAllocation: sa,
        scores,
        totalGross: totalGross(scores),
        totalNet: totalNet(scores),
        signedAt: NOW,
        signedBy: golfer.uid,
        isLocked: true,
        updatedAt: NOW,
      })
    }
  }

  // Update round with actual groupIds
  await updateDoc(roundRef, { groupIds: allGroupIds })

  console.log(`  ✓ ${name}`)
  console.log(`    Detail:  /rounds/${roundId}`)
  console.log(`    Summary: /rounds/${roundId}/summary`)
  return roundId
}

// ─── Seed all round types ─────────────────────────────────────────────────────

async function seedAll() {
  console.log('\n📋 Ensuring seed course exists...')
  const { courseId, teeId } = await ensureSeedCourse()
  console.log(`  Course: ${courseId}  Tee: ${teeId}`)

  const [alice, bob, carol, david, ethan, fiona, george, hannah, ivan, julia, kevin, laura, marcus, nina, omar, petra] = GOLFERS
  console.log('\n🌱 Seeding rounds...')

  // ── Individual: Stroke (Gross) — 1 group, 4 players ──────────────────────
  await createRound({
    name: '[Seed] Stroke - Gross',
    scoringFormat: 'individual',
    roundType: 'STROKE_GROSS',
    courseId, teeId,
    groups: [{ golfers: [alice, bob, carol, david] }],
  })

  // ── Individual: Stroke (Net) — 1 group, 4 players ────────────────────────
  await createRound({
    name: '[Seed] Stroke - Net',
    scoringFormat: 'individual',
    roundType: 'STROKE_NET',
    courseId, teeId,
    groups: [{ golfers: [alice, bob, carol, david] }],
  })

  // ── Individual: 2-Man Best Ball (Gross) — 2 groups = 4 teams ─────────────
  await createRound({
    name: '[Seed] 2-Man Best Ball - Gross (4 teams)',
    scoringFormat: 'individual',
    roundType: 'BEST_BALL_GROSS',
    courseId, teeId,
    groups: [
      { golfers: [alice, bob, carol, david],     teams: { teamA: [alice.uid, bob.uid],   teamB: [carol.uid, david.uid] } },
      { golfers: [ethan, fiona, george, hannah],  teams: { teamA: [ethan.uid, fiona.uid], teamB: [george.uid, hannah.uid] } },
    ],
  })

  // ── Individual: 2-Man Best Ball (Net) — 3 groups = 6 teams ───────────────
  await createRound({
    name: '[Seed] 2-Man Best Ball - Net (6 teams)',
    scoringFormat: 'individual',
    roundType: 'BEST_BALL_NET',
    courseId, teeId,
    groups: [
      { golfers: [alice, bob, carol, david],     teams: { teamA: [alice.uid, bob.uid],   teamB: [carol.uid, david.uid] } },
      { golfers: [ethan, fiona, george, hannah],  teams: { teamA: [ethan.uid, fiona.uid], teamB: [george.uid, hannah.uid] } },
      { golfers: [ivan, julia, kevin, laura],     teams: { teamA: [ivan.uid, julia.uid],  teamB: [kevin.uid, laura.uid] } },
    ],
  })

  // ── Individual: 2-Man Best Ball (Gross) — 4 groups = 8 teams ─────────────
  await createRound({
    name: '[Seed] 2-Man Best Ball - Gross (8 teams)',
    scoringFormat: 'individual',
    roundType: 'BEST_BALL_GROSS',
    courseId, teeId,
    groups: [
      { golfers: [alice, bob, carol, david],     teams: { teamA: [alice.uid, bob.uid],    teamB: [carol.uid, david.uid] } },
      { golfers: [ethan, fiona, george, hannah],  teams: { teamA: [ethan.uid, fiona.uid],  teamB: [george.uid, hannah.uid] } },
      { golfers: [ivan, julia, kevin, laura],     teams: { teamA: [ivan.uid, julia.uid],   teamB: [kevin.uid, laura.uid] } },
      { golfers: [marcus, nina, omar, petra],     teams: { teamA: [marcus.uid, nina.uid],  teamB: [omar.uid, petra.uid] } },
    ],
  })

  // ── Two Team: Stroke (Gross) ──────────────────────────────────────────────
  await createRound({
    name: '[Seed] Two Team Stroke - Gross',
    scoringFormat: 'two_team',
    roundType: 'TWO_TEAM_STROKE_GROSS',
    teamAssignments: { [alice.uid]: 'A', [carol.uid]: 'A', [bob.uid]: 'B', [david.uid]: 'B' },
    courseId, teeId,
    groups: [{ golfers: [alice, bob, carol, david] }],
  })

  // ── Two Team: Stroke (Net) ────────────────────────────────────────────────
  await createRound({
    name: '[Seed] Two Team Stroke - Net',
    scoringFormat: 'two_team',
    roundType: 'TWO_TEAM_STROKE_NET',
    teamAssignments: { [alice.uid]: 'A', [carol.uid]: 'A', [bob.uid]: 'B', [david.uid]: 'B' },
    courseId, teeId,
    groups: [{ golfers: [alice, bob, carol, david] }],
  })

  // ── Two Team: 2-Man Best Ball - Match Play (Gross) — 3 groups ────────────
  await createRound({
    name: '[Seed] Two Team BB Match Play - Gross',
    scoringFormat: 'two_team',
    roundType: 'TWO_TEAM_BB_MATCH_GROSS',
    teamAssignments: {
      [alice.uid]: 'A', [carol.uid]: 'A', [ethan.uid]: 'A', [george.uid]: 'A', [ivan.uid]: 'A', [kevin.uid]: 'A',
      [bob.uid]:   'B', [david.uid]: 'B', [fiona.uid]: 'B', [hannah.uid]: 'B', [julia.uid]: 'B', [laura.uid]: 'B',
    },
    courseId, teeId,
    groups: [
      { golfers: [alice, bob, carol, david] },
      { golfers: [ethan, fiona, george, hannah] },
      { golfers: [ivan, julia, kevin, laura] },
    ],
  })

  // ── Two Team: 2-Man Best Ball - Match Play (Net) — 2 groups ──────────────
  await createRound({
    name: '[Seed] Two Team BB Match Play - Net',
    scoringFormat: 'two_team',
    roundType: 'TWO_TEAM_BB_MATCH_NET',
    teamAssignments: {
      [alice.uid]: 'A', [carol.uid]: 'A', [ethan.uid]: 'A', [fiona.uid]: 'A',
      [bob.uid]:   'B', [david.uid]: 'B', [george.uid]: 'B', [hannah.uid]: 'B',
    },
    courseId, teeId,
    groups: [
      { golfers: [alice, bob, carol, david] },
      { golfers: [ethan, fiona, george, hannah] },
    ],
  })

  // ── Two Team: 2-Man Best Ball - Stroke (Gross) — 2 groups ────────────────
  await createRound({
    name: '[Seed] Two Team BB Stroke - Gross',
    scoringFormat: 'two_team',
    roundType: 'TWO_TEAM_BB_STROKE_GROSS',
    teamAssignments: {
      [alice.uid]: 'A', [carol.uid]: 'A', [ethan.uid]: 'A', [fiona.uid]: 'A',
      [bob.uid]:   'B', [david.uid]: 'B', [george.uid]: 'B', [hannah.uid]: 'B',
    },
    courseId, teeId,
    groups: [
      { golfers: [alice, bob, carol, david] },
      { golfers: [ethan, fiona, george, hannah] },
    ],
  })

  // ── Two Team: 2-Man Best Ball - Stroke (Net) — 2 groups ──────────────────
  await createRound({
    name: '[Seed] Two Team BB Stroke - Net',
    scoringFormat: 'two_team',
    roundType: 'TWO_TEAM_BB_STROKE_NET',
    teamAssignments: {
      [alice.uid]: 'A', [carol.uid]: 'A', [ethan.uid]: 'A', [fiona.uid]: 'A',
      [bob.uid]:   'B', [david.uid]: 'B', [george.uid]: 'B', [hannah.uid]: 'B',
    },
    courseId, teeId,
    groups: [
      { golfers: [alice, bob, carol, david] },
      { golfers: [ethan, fiona, george, hannah] },
    ],
  })

  // ── Pending rounds (for testing Create Side Bet form) ────────────────────
  console.log('\n🌱 Seeding pending rounds (for side bet testing)...')

  await createPendingRound({
    name: '[Seed] Pending - Stroke Gross (4 players)',
    scoringFormat: 'individual',
    roundType: 'STROKE_GROSS',
    courseId, teeId,
    memberUids: [CREATOR_UID, ethan.uid, fiona.uid, george.uid],
    groups: [{ golfers: [{ uid: CREATOR_UID, name: 'Seed User', handicap: 10 }, ethan, fiona, george] }],
  })

  await createPendingRound({
    name: '[Seed] Pending - Stroke Net (4 players)',
    scoringFormat: 'individual',
    roundType: 'STROKE_NET',
    courseId, teeId,
    memberUids: [CREATOR_UID, hannah.uid, ivan.uid, julia.uid],
    groups: [{ golfers: [{ uid: CREATOR_UID, name: 'Seed User', handicap: 10 }, hannah, ivan, julia] }],
  })

  await createPendingRound({
    name: '[Seed] Pending - Stroke Gross (8 players, 2 groups)',
    scoringFormat: 'individual',
    roundType: 'STROKE_GROSS',
    courseId, teeId,
    memberUids: [CREATOR_UID, alice.uid, bob.uid, carol.uid, david.uid, ethan.uid, fiona.uid, george.uid],
    groups: [
      { golfers: [{ uid: CREATOR_UID, name: 'Seed User', handicap: 10 }, alice, bob, carol] },
      { golfers: [david, ethan, fiona, george] },
    ],
  })

  // ── Active rounds (in progress) with side bets ────────────────────────────
  console.log('\n⛳ Seeding active rounds (in progress)...')

  const seedUser = { uid: CREATOR_UID, name: 'Seed User', handicap: 10 }

  const activeRound1Id = await createActiveRound({
    name: '[Seed] Active - Stroke Gross (front 9 done)',
    scoringFormat: 'individual',
    roundType: 'STROKE_GROSS',
    courseId, teeId,
    holesPlayed: 9,
    groups: [{ golfers: [seedUser, kevin, laura, marcus] }],
  })
  await seedSideBets(activeRound1Id, [
    // Seed User challenges Kevin and Laura — they're invited, not yet accepted
    {
      type: 'CHALLENGE_GROSS',
      status: 'pending',
      isPublic: false,
      wagerPerPerson: 10,
      createdBy: CREATOR_UID,
      participantIds: [CREATOR_UID],
      invitedIds: [kevin.uid, laura.uid],
      declinedIds: [],
      winnersIds: null,
      settledAt: null,
    },
    // Seed User vs Kevin vs Marcus — all confirmed, active, gross
    {
      type: 'CHALLENGE_GROSS',
      status: 'active',
      isPublic: false,
      wagerPerPerson: 5,
      createdBy: CREATOR_UID,
      participantIds: [CREATOR_UID, kevin.uid, marcus.uid],
      invitedIds: [],
      declinedIds: [],
      winnersIds: null,
      settledAt: null,
    },
    // Public bet — anyone can join, currently 2 participants
    {
      type: 'CHALLENGE_GROSS',
      status: 'pending',
      isPublic: true,
      wagerPerPerson: 3,
      createdBy: laura.uid,
      participantIds: [laura.uid, marcus.uid],
      invitedIds: [],
      declinedIds: [],
      winnersIds: null,
      settledAt: null,
    },
  ])

  const activeRound2Id = await createActiveRound({
    name: '[Seed] Active - Stroke Net (hole 14)',
    scoringFormat: 'individual',
    roundType: 'STROKE_NET',
    courseId, teeId,
    holesPlayed: 13,
    groups: [{ golfers: [seedUser, nina, omar, petra] }],
  })
  await seedSideBets(activeRound2Id, [
    // Seed User vs Nina vs Omar — net bet, all active
    {
      type: 'CHALLENGE_NET',
      status: 'active',
      isPublic: false,
      wagerPerPerson: 15,
      createdBy: CREATOR_UID,
      participantIds: [CREATOR_UID, nina.uid, omar.uid],
      invitedIds: [],
      declinedIds: [],
      winnersIds: null,
      settledAt: null,
    },
    // Omar challenges Petra — pending, she hasn't accepted
    {
      type: 'CHALLENGE_GROSS',
      status: 'pending',
      isPublic: false,
      wagerPerPerson: 5,
      createdBy: omar.uid,
      participantIds: [omar.uid],
      invitedIds: [petra.uid],
      declinedIds: [],
      winnersIds: null,
      settledAt: null,
    },
  ])

  // ── Side bets on completed rounds ─────────────────────────────────────────
  console.log('\n🎲 Seeding side bets on completed rounds...')
  const completedQ = query(
    collection(db, 'rounds'),
    where('__seeded', '==', true),
    where('name', '==', '[Seed] Stroke - Gross'),
  )
  const completedSnap = await getDocs(completedQ)
  if (!completedSnap.empty) {
    const completedRoundId = completedSnap.docs[0].id
    // Get first group in this round
    const groupsSnap = await getDocs(collection(db, 'rounds', completedRoundId, 'groups'))
    const firstGroupId = groupsSnap.docs[0].id
    const scoreSnap = await getDocs(
      collection(db, 'rounds', completedRoundId, 'groups', firstGroupId, 'scores')
    )
    // Determine winner from scores (lower gross)
    const scoreDocs = scoreSnap.docs.map((d) => d.data())
    const aliceScore = scoreDocs.find((s) => s.golferId === alice.uid)
    const bobScore   = scoreDocs.find((s) => s.golferId === bob.uid)
    const carolScore = scoreDocs.find((s) => s.golferId === carol.uid)
    const davidScore = scoreDocs.find((s) => s.golferId === david.uid)

    const aliceWinsVsBob = aliceScore && bobScore
      ? aliceScore.totalGross <= bobScore.totalGross
      : true

    const teamAGross = (aliceScore?.totalGross ?? 0) + (carolScore?.totalGross ?? 0)
    const teamBGross = (bobScore?.totalGross ?? 0) + (davidScore?.totalGross ?? 0)
    const teamAWins = teamAGross <= teamBGross

    await seedSideBets(completedRoundId, [
      // Settled: Alice vs Bob vs Carol (3-way gross) — winner determined by scores
      {
        type: 'CHALLENGE_GROSS',
        status: 'settled',
        isPublic: false,
        wagerPerPerson: 5,
        createdBy: alice.uid,
        participantIds: [alice.uid, bob.uid, carol.uid],
        invitedIds: [],
        declinedIds: [],
        winnersIds: aliceWinsVsBob ? [alice.uid] : [bob.uid],
        settledAt: NOW,
      },
      // Settled: All 4 players — team gross, each loser pays each winner
      {
        type: 'CHALLENGE_TEAM_GROSS',
        status: 'settled',
        isPublic: false,
        wagerPerPerson: 10,
        createdBy: alice.uid,
        participantIds: [alice.uid, carol.uid, bob.uid, david.uid],
        invitedIds: [],
        declinedIds: [],
        winnersIds: teamAWins ? [alice.uid, carol.uid] : [bob.uid, david.uid],
        settledAt: NOW,
      },
      // Active: Carol vs David (waiting to settle — round is completed but bet still active)
      {
        type: 'CHALLENGE_GROSS',
        status: 'active',
        isPublic: false,
        wagerPerPerson: 2,
        createdBy: carol.uid,
        participantIds: [carol.uid, david.uid],
        invitedIds: [],
        declinedIds: [],
        winnersIds: null,
        settledAt: null,
      },
      // Pending: Carol challenges Bob, Bob hasn't responded
      {
        type: 'CHALLENGE_NET',
        status: 'pending',
        isPublic: false,
        wagerPerPerson: 5,
        createdBy: carol.uid,
        participantIds: [carol.uid],
        invitedIds: [bob.uid],
        declinedIds: [],
        winnersIds: null,
        settledAt: null,
      },
    ])
    console.log(`  ✓ Added side bets to [Seed] Stroke - Gross (${completedRoundId})`)
  } else {
    console.log('  ⚠ Could not find [Seed] Stroke - Gross round for side bets')
  }

  // Side bets on [Seed] Stroke - Net (net challenge types)
  const netQ = query(
    collection(db, 'rounds'),
    where('__seeded', '==', true),
    where('name', '==', '[Seed] Stroke - Net'),
  )
  const netSnap = await getDocs(netQ)
  if (!netSnap.empty) {
    const netRoundId = netSnap.docs[0].id
    const netGroupsSnap = await getDocs(collection(db, 'rounds', netRoundId, 'groups'))
    const netFirstGroupId = netGroupsSnap.docs[0].id
    const netScoreSnap = await getDocs(
      collection(db, 'rounds', netRoundId, 'groups', netFirstGroupId, 'scores')
    )
    const netScoreDocs = netScoreSnap.docs.map((d) => d.data())
    const aliceNet = netScoreDocs.find((s) => s.golferId === alice.uid)
    const carolNet = netScoreDocs.find((s) => s.golferId === carol.uid)
    const bobNet   = netScoreDocs.find((s) => s.golferId === bob.uid)
    const davidNet = netScoreDocs.find((s) => s.golferId === david.uid)

    const aliceBeatsCarol = (aliceNet?.totalNet ?? 99) <= (carolNet?.totalNet ?? 99)
    const acTeamNet = (aliceNet?.totalNet ?? 0) + (carolNet?.totalNet ?? 0)
    const bdTeamNet = (bobNet?.totalNet ?? 0) + (davidNet?.totalNet ?? 0)
    const acTeamWins = acTeamNet <= bdTeamNet

    await seedSideBets(netRoundId, [
      // Settled: Alice vs Carol vs Bob (3-way net)
      {
        type: 'CHALLENGE_NET',
        status: 'settled',
        isPublic: false,
        wagerPerPerson: 8,
        createdBy: alice.uid,
        participantIds: [alice.uid, carol.uid, bob.uid],
        invitedIds: [],
        declinedIds: [],
        winnersIds: aliceBeatsCarol ? [alice.uid] : [carol.uid],
        settledAt: NOW,
      },
      // Settled: All 4 players team net
      {
        type: 'CHALLENGE_TEAM_NET',
        status: 'settled',
        isPublic: false,
        wagerPerPerson: 15,
        createdBy: alice.uid,
        participantIds: [alice.uid, carol.uid, bob.uid, david.uid],
        invitedIds: [],
        declinedIds: [],
        winnersIds: acTeamWins ? [alice.uid, carol.uid] : [bob.uid, david.uid],
        settledAt: NOW,
      },
      // Settled tie: Bob vs David (net) — same net score forced to tie
      {
        type: 'CHALLENGE_NET',
        status: 'settled',
        isPublic: false,
        wagerPerPerson: 3,
        createdBy: bob.uid,
        participantIds: [bob.uid, david.uid],
        invitedIds: [],
        declinedIds: [],
        winnersIds: [],  // tie
        settledAt: NOW,
      },
    ])
    console.log(`  ✓ Added side bets to [Seed] Stroke - Net (${netRoundId})`)
  } else {
    console.log('  ⚠ Could not find [Seed] Stroke - Net round for side bets')
  }

  console.log('\n✅ All rounds seeded. Open the app and look for "[Seed]" rounds.')
  console.log('   Pending rounds → Side Bets to test the create form.')
  console.log('   Active rounds  → Side Bets to see in-progress bets.')
  console.log('   [Seed] Stroke - Gross / Net → Side Bets to see settled bets.')
}

// ─── Clean up all seeded data ─────────────────────────────────────────────────

async function cleanAll() {
  console.log('\n🧹 Cleaning seeded data...')

  // Delete seeded rounds (and their subcollections)
  const roundsQ = query(collection(db, 'rounds'), where('__seeded', '==', true))
  const roundsSnap = await getDocs(roundsQ)
  for (const roundDoc of roundsSnap.docs) {
    const roundId = roundDoc.id
    // Delete groups + scores subcollections
    const groupsSnap = await getDocs(collection(db, 'rounds', roundId, 'groups'))
    for (const groupDoc of groupsSnap.docs) {
      const scoresSnap = await getDocs(
        collection(db, 'rounds', roundId, 'groups', groupDoc.id, 'scores')
      )
      for (const scoreDoc of scoresSnap.docs) await deleteDoc(scoreDoc.ref)
      await deleteDoc(groupDoc.ref)
    }
    // Delete sideBets subcollection
    const sideBetsSnap = await getDocs(collection(db, 'rounds', roundId, 'sideBets'))
    for (const sbDoc of sideBetsSnap.docs) await deleteDoc(sbDoc.ref)
    await deleteDoc(roundDoc.ref)
    console.log(`  ✓ Deleted round ${roundId}`)
  }

  // Delete seeded courses
  const coursesQ = query(collection(db, 'courses'), where('__seeded', '==', true))
  const coursesSnap = await getDocs(coursesQ)
  for (const courseDoc of coursesSnap.docs) {
    await deleteDoc(courseDoc.ref)
    console.log(`  ✓ Deleted course ${courseDoc.id}`)
  }

  console.log('\n✅ All seeded data removed.')
}

// ─── Entry point ──────────────────────────────────────────────────────────────
const clean = process.argv.includes('--clean')
try {
  if (clean) {
    await cleanAll()
  } else {
    await seedAll()
  }
  process.exit(0)
} catch (err) {
  console.error('\n❌ Error:', err)
  process.exit(1)
}
