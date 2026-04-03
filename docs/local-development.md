# Local Development

## Prerequisites

- Node.js 20+
- npm 10+
- A Firebase project (see Firebase console)
- Optionally: Firebase CLI (`npm install -g firebase-tools`)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your Firebase project values:

```bash
cp .env.example .env
```

Find your Firebase config at: Firebase Console → Project Settings → Your apps → Web app → Config

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_APP_ENV=development
```

### 3. Start the dev server

```bash
npm run dev
```

Opens at http://localhost:5173

## Firebase Setup (First Time)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Sign-in methods → Email/Password and Google
4. Enable **Firestore** → Create database → Production mode
5. Copy the web app config to `.env`
6. Deploy security rules:
   ```bash
   firebase login
   firebase init firestore   # select your project, accept defaults
   firebase deploy --only firestore:rules,firestore:indexes
   ```

## Setting the First Admin

After registering your first user:
1. Go to Firebase Console → Firestore → `users` collection
2. Find your user document
3. Manually set `isAdmin: true`

All subsequent admin promotions can be done from the app's `/admin` page.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (HMR) |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run typecheck` | Run TypeScript type check without emitting files |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

## Using Firebase Emulator (Optional)

For fully offline development:

```bash
firebase emulators:start --only auth,firestore
```

Then update `src/config/firebase.ts` to connect to emulator:

```typescript
import { connectAuthEmulator } from 'firebase/auth'
import { connectFirestoreEmulator } from 'firebase/firestore'

if (import.meta.env.VITE_APP_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099')
  connectFirestoreEmulator(db, 'localhost', 8080)
}
```

## Troubleshooting

**"Missing required environment variable"** — Check `.env` file exists and all `VITE_FIREBASE_*` values are set.

**Firestore permission denied** — Check security rules are deployed; in development you may temporarily set rules to `allow read, write: if true` for testing (never in production).

**Google sign-in blocked** — Add `localhost` to authorized domains in Firebase Console → Authentication → Settings → Authorized domains.
