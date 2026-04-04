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

  console.log('\n✅ All rounds seeded. Open the app and look for "[Seed]" rounds.')
  console.log('   Navigate to any round → its detail page → View Summary to test the leaderboard.')
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
