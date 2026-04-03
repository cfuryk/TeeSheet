# Auth Flows

## Authentication Provider

TeeSheet uses **Firebase Authentication** with:
- Email and password sign-in
- Google sign-in (OAuth via `signInWithPopup`)

## Auth State Machine

```
App loads
    │
    ▼
onAuthStateChanged fires (Firebase)
    │
    ├── user == null ──────────────────→ Loading = false, currentUser = null
    │                                    ProtectedRoute redirects to /login
    │
    └── user != null
            │
            ▼
        Fetch users/{uid} from Firestore
            │
            ├── Doc exists ───────────→ userProfile = doc data
            │                           Loading = false
            │                           App renders
            │
            └── Doc missing (first-time Google login)
                        │
                        ▼
                    Create profile with defaults
                    (displayName from Google, handicap=0, isAdmin=false)
                        │
                        ▼
                    userProfile = new doc
                    Loading = false
```

Implementation: `src/contexts/AuthContext.tsx`

---

## Registration Flow (Email/Password)

1. User fills out `RegisterForm`: displayName, email, password, confirmPassword, handicap
2. Zod validation runs client-side (`registerSchema`)
3. `createUserWithEmailAndPassword(auth, email, password)` called
4. On success: `userService.createProfile(uid, { displayName, email, handicap })` writes to Firestore
5. `onAuthStateChanged` fires, sets `currentUser` and `userProfile`
6. Redirect to `/`

---

## Login Flow (Email/Password)

1. User fills out `LoginForm`: email, password
2. `signInWithEmailAndPassword(auth, email, password)` called
3. `onAuthStateChanged` fires, fetches profile
4. Redirect to `/`

---

## Google Sign-In Flow

1. User clicks "Continue with Google"
2. `signInWithPopup(auth, googleProvider)` opens Google OAuth popup
3. On success: check if `users/{uid}` exists in Firestore
   - If yes: existing user, no action needed — `onAuthStateChanged` will load the profile
   - If no: first-time login; create profile with `displayName` from Google account, `handicap=0`, `isAdmin=false`
4. Redirect to `/`

---

## Password Reset Flow

1. User enters email on `/forgot-password`
2. `sendPasswordResetEmail(auth, email)` called
3. Firebase sends reset email
4. Success alert shown; user redirected back to sign-in

---

## ProtectedRoute

`src/components/layout/ProtectedRoute.tsx`

- If `loading == true`: renders a loading spinner (prevents flash of login page)
- If `currentUser == null`: `<Navigate to="/login" replace />`
- If `requireAdmin == true` and `!userProfile.isAdmin`: `<Navigate to="/" replace />`
- Otherwise: renders `children`

All main app routes are wrapped in `ProtectedRoute` inside `App.tsx`. Auth pages (`/login`, `/register`, `/forgot-password`) are outside `ProtectedRoute`.

---

## Session Persistence

Firebase Auth persists the session in browser local storage by default. Users remain signed in across page reloads and browser restarts until they explicitly sign out.

## Sign Out

`signOut()` in `AuthContext` calls `firebaseSignOut(auth)`, which clears the session. `onAuthStateChanged` fires with `null`, clearing `currentUser` and `userProfile`. `ProtectedRoute` then redirects to `/login`.
