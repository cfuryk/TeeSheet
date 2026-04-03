export interface Hole {
  number: number   // 1–18
  par: number      // 3 | 4 | 5
  yardage: number
  handicap: number // stroke index 1–18
}

export interface Tee {
  teeId: string
  name: string
  par: number
  yardage: number
  slope: number
  rating: number
  holes: Hole[]
}

export interface Course {
  courseId: string
  name: string
  createdBy: string
  createdAt: import('firebase/firestore').Timestamp
  updatedAt: import('firebase/firestore').Timestamp
  tees: Tee[]
}

export interface CourseFormData {
  name: string
}

export interface TeeFormData {
  name: string
  par: number
  yardage: number
  slope: number
  rating: number
  holes: Hole[]
}
