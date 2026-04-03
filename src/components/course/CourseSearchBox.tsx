import { useState, useRef } from 'react'
import { golfCourseApiService, type ApiCourse } from '@/services/golfCourseApiService'
import { displayCourseName } from '@/lib/courseApiMapper'
import { Input, Spinner } from '@/components/ui'

interface Props {
  onSelect: (course: ApiCourse) => void
}

export function CourseSearchBox({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ApiCourse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(value: string) {
    setQuery(value)
    setError('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 3) {
      setResults([])
      setSearched(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const courses = await golfCourseApiService.search(value.trim())
        setResults(courses)
        setSearched(true)
      } catch {
        setError('Search failed. Check your connection and try again.')
      } finally {
        setLoading(false)
      }
    }, 500)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          label="Search for a course"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="e.g. Pebble Beach, Augusta..."
        />
        {loading && (
          <div className="absolute right-3 top-9">
            <Spinner size="sm" />
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {searched && results.length === 0 && !loading && (
        <p className="text-sm text-gray-500 text-center py-2">No courses found for "{query}"</p>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto rounded-xl border border-gray-700">
          {results.map((course) => (
            <button
              key={course.id}
              onClick={() => { onSelect(course); setResults([]); setQuery('') }}
              className="text-left px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-0"
            >
              <p className="font-medium text-white text-sm">{displayCourseName(course)}</p>
              <p className="text-xs text-gray-400">
                {[course.location.city, course.location.state, course.location.country]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
