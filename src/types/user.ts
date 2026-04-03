import { Timestamp } from 'firebase/firestore'

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  teeSheetHandicap: number | null
  isAdmin: boolean
  participantRoundIds: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface UserProfileUpdate {
  displayName: string
}
