const API_KEY = 'Key UPJJE3YAR3E3PXM5JLIKVN4YNE'
const BASE_URL = 'https://api.golfcourseapi.com/v1'

export interface ApiTee {
  tee_name: string
  course_rating: number
  slope_rating: number
  par_total: number
  total_yards: number
  holes: { par: number; yardage: number; handicap: number }[]
}

export interface ApiCourse {
  id: number
  club_name: string
  course_name: string
  location: {
    city: string
    state: string
    country: string
  }
  tees: {
    female?: ApiTee[]
    male?: ApiTee[]
  }
}

export const golfCourseApiService = {
  async search(query: string): Promise<ApiCourse[]> {
    const res = await fetch(
      `${BASE_URL}/search?search_query=${encodeURIComponent(query)}`,
      { headers: { Authorization: API_KEY } },
    )
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()
    return (data.courses ?? []) as ApiCourse[]
  },

  async getCourse(id: number): Promise<ApiCourse | null> {
    const res = await fetch(`${BASE_URL}/courses/${id}`, {
      headers: { Authorization: API_KEY },
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.course ?? null) as ApiCourse | null
  },
}
