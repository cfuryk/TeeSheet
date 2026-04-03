import { v4 as uuidv4 } from 'uuid'
import type { Tee, Hole } from '@/types'
import type { ApiTee, ApiCourse } from '@/services/golfCourseApiService'

export function apiTeeToTee(apiTee: ApiTee): Tee {
  const holes: Hole[] = apiTee.holes.map((h, i) => ({
    number: i + 1,
    par: h.par,
    yardage: h.yardage,
    handicap: h.handicap,
  }))

  return {
    teeId: uuidv4(),
    name: apiTee.tee_name,
    par: apiTee.par_total,
    yardage: apiTee.total_yards,
    slope: apiTee.slope_rating,
    rating: apiTee.course_rating,
    holes,
  }
}

export function displayCourseName(course: ApiCourse): string {
  // Avoid duplication like "Pebble Beach Gl / Pebble Beach Gl"
  if (course.club_name === course.course_name) return course.club_name
  return `${course.club_name} — ${course.course_name}`
}

export function allApiTees(course: ApiCourse): ApiTee[] {
  return [...(course.tees.male ?? []), ...(course.tees.female ?? [])]
}
