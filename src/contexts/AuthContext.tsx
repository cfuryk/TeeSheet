import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '@/config/firebase'
import { userService } from '@/services/userService'
import type { UserProfile } from '@/types'

interface AuthContextValue {
  currentUser: User | null
  userProfile: UserProfile | null
  loading: boolean
  register: (email: string, password: string, displayName: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<{ user: User }>
  signInWithGoogle: () => Promise<{ user: User }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const googleProvider = new GoogleAuthProvider()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        let profile = await userService.getProfile(user.uid)
        if (!profile) {
          // User exists in Firebase Auth but has no Firestore document — create it now
          await userService.createProfile(user.uid, {
            displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Golfer',
            email: user.email ?? '',
          })
          profile = await userService.getProfile(user.uid)
        }
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function register(email: string, password: string, displayName: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await userService.createProfile(user.uid, { displayName, email })
    const profile = await userService.getProfile(user.uid)
    setUserProfile(profile)
  }

  async function signIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  async function signInWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider)
    const { user } = cred
    const existing = await userService.getProfile(user.uid)
    if (!existing) {
      await userService.createProfile(user.uid, {
        displayName: user.displayName ?? 'Golfer',
        email: user.email ?? '',
      })
      const profile = await userService.getProfile(user.uid)
      setUserProfile(profile)
    }
    return cred
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }

  return (
    <AuthContext.Provider
      value={{ currentUser, userProfile, loading, register, signIn, signInWithGoogle, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
