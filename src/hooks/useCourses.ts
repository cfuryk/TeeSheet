import { useState, useEffect } from 'react'
import { courseService } from '@/services/courseService'
import type { Course } from '@/types'

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = courseService.onCoursesSnapshot((c) => {
      setCourses(c)
      setLoading(false)
    })
    return unsub
  }, [])

  return { courses, loading }
}
