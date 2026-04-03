import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/config/firebase'
import { v4 as uuidv4 } from 'uuid'
import type { Course, CourseFormData, Tee, TeeFormData } from '@/types'

export const courseService = {
  async createCourse(data: CourseFormData, createdBy: string): Promise<string> {
    const ref = await addDoc(collection(db, 'courses'), {
      name: data.name,
      createdBy,
      tees: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await updateDoc(ref, { courseId: ref.id })
    return ref.id
  },

  async createCourseWithTees(name: string, tees: Tee[], createdBy: string): Promise<string> {
    const ref = await addDoc(collection(db, 'courses'), {
      name,
      createdBy,
      tees,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await updateDoc(ref, { courseId: ref.id })
    return ref.id
  },

  async getCourse(courseId: string): Promise<Course | null> {
    const snap = await getDoc(doc(db, 'courses', courseId))
    if (!snap.exists()) return null
    return { courseId: snap.id, ...snap.data() } as Course
  },

  async listCourses(): Promise<Course[]> {
    const snap = await getDocs(collection(db, 'courses'))
    return snap.docs.map((d) => ({ courseId: d.id, ...d.data() }) as Course)
  },

  onCoursesSnapshot(callback: (courses: Course[]) => void): () => void {
    return onSnapshot(collection(db, 'courses'), (snap) => {
      callback(snap.docs.map((d) => ({ courseId: d.id, ...d.data() }) as Course))
    })
  },

  async updateCourse(courseId: string, data: Partial<CourseFormData>): Promise<void> {
    await updateDoc(doc(db, 'courses', courseId), {
      ...data,
      updatedAt: serverTimestamp(),
    })
  },

  async addTee(courseId: string, data: TeeFormData): Promise<void> {
    const course = await courseService.getCourse(courseId)
    if (!course) throw new Error('Course not found')
    const newTee: Tee = { teeId: uuidv4(), ...data }
    const tees = [...course.tees, newTee]
    await updateDoc(doc(db, 'courses', courseId), { tees, updatedAt: serverTimestamp() })
  },

  async updateTee(courseId: string, teeId: string, data: TeeFormData): Promise<void> {
    const course = await courseService.getCourse(courseId)
    if (!course) throw new Error('Course not found')
    const tees = course.tees.map((t) => (t.teeId === teeId ? { teeId, ...data } : t))
    await updateDoc(doc(db, 'courses', courseId), { tees, updatedAt: serverTimestamp() })
  },

  async deleteTee(courseId: string, teeId: string): Promise<void> {
    const course = await courseService.getCourse(courseId)
    if (!course) throw new Error('Course not found')
    const tees = course.tees.filter((t) => t.teeId !== teeId)
    await updateDoc(doc(db, 'courses', courseId), { tees, updatedAt: serverTimestamp() })
  },
}
