/**
 * One-time script — creates the Rolling Green course in Firestore.
 *
 * Usage:
 *   node scripts/create-rolling-green.mjs
 *
 * Reads Firebase config from .env in the project root.
 * Requires SEED_EMAIL and SEED_PASSWORD in .env for auth.
 * Safe to re-run — checks for an existing course with the same name first.
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
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'

// ─── Load .env ────────────────────────────────────────────────────────────────
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

const SEED_EMAIL    = envVars['SEED_EMAIL']
const SEED_PASSWORD = envVars['SEED_PASSWORD']
if (!SEED_EMAIL || !SEED_PASSWORD) {
  console.error('Add SEED_EMAIL and SEED_PASSWORD to your .env file.')
  process.exit(1)
}
console.log(`\n🔐 Signing in as ${SEED_EMAIL}...`)
const cred = await signInWithEmailAndPassword(auth, SEED_EMAIL, SEED_PASSWORD)
const CREATOR_UID = cred.user.uid
console.log(`   Signed in (uid: ${CREATOR_UID})`)

// ─── Course data ──────────────────────────────────────────────────────────────

const COURSE_NAME = 'Rolling Green'

const par      = [4, 4, 4, 4, 3, 4, 4, 3, 5,   4, 5, 4, 4, 3, 4, 3, 5, 4]
const handicap = [9, 7,11, 5, 3,13,15,17, 1,  10, 2,12, 6,18, 8,16, 4,14]

const blueYardages  = [350,360,335,405,210,260,240,165,430, 305,495,330,325,180,385,140,455,260]
const whiteYardages = [325,340,305,370,185,245,225,155,380, 290,450,310,310,165,340,125,415,240]

function buildHoles(yardages) {
  return yardages.map((yardage, i) => ({
    number:   i + 1,
    par:      par[i],
    yardage,
    handicap: handicap[i],
  }))
}

const blueHoles  = buildHoles(blueYardages)
const whiteHoles = buildHoles(whiteYardages)

const bluePar    = blueHoles.reduce((s, h) => s + h.par, 0)   // 71
const whitePar   = whiteHoles.reduce((s, h) => s + h.par, 0)  // 71
const blueYards  = blueHoles.reduce((s, h) => s + h.yardage, 0)   // 5630
const whiteYards = whiteHoles.reduce((s, h) => s + h.yardage, 0)  // 5175

const tees = [
  {
    teeId:   'rolling-green-blue',
    name:    'Blue',
    par:     bluePar,
    yardage: blueYards,
    slope:   111,
    rating:  68.00,
    holes:   blueHoles,
  },
  {
    teeId:   'rolling-green-white',
    name:    'White',
    par:     whitePar,
    yardage: whiteYards,
    slope:   107,
    rating:  66.10,
    holes:   whiteHoles,
  },
]

// ─── Create course ────────────────────────────────────────────────────────────

console.log(`\n⛳ Checking for existing "${COURSE_NAME}" course...`)
const existing = await getDocs(query(collection(db, 'courses'), where('name', '==', COURSE_NAME)))
if (!existing.empty) {
  console.log(`   ⚠  Course already exists (id: ${existing.docs[0].id}). Nothing written.`)
  console.log('   Delete it in Firestore first if you want to recreate it.')
  process.exit(0)
}

const NOW = Timestamp.now()
console.log(`   Creating "${COURSE_NAME}"...`)
const courseRef = await addDoc(collection(db, 'courses'), {
  name: COURSE_NAME,
  createdBy: CREATOR_UID,
  tees,
  createdAt: NOW,
  updatedAt: NOW,
})
await updateDoc(courseRef, { courseId: courseRef.id })

console.log(`\n✅ Rolling Green created!`)
console.log(`   courseId: ${courseRef.id}`)
console.log(`   Tees:     Blue (${blueYards} yds, par ${bluePar}, ${68.00}/${111})`)
console.log(`             White (${whiteYards} yds, par ${whitePar}, ${66.10}/${107})`)
process.exit(0)
