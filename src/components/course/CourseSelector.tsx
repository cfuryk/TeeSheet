import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCourses } from '@/hooks/useCourses'
import { courseService } from '@/services/courseService'
import type { ApiCourse, ApiTee } from '@/services/golfCourseApiService'
import { apiTeeToTee, displayCourseName } from '@/lib/courseApiMapper'
import { CourseSearchBox } from './CourseSearchBox'
import { ApiTeeSelector } from './ApiTeeSelector'
import { Button, Spinner, SelectField } from '@/components/ui'

interface Props {
  value: string
  onChange: (courseId: string) => void
  onImport?: (courseId: string, teeIds: string[]) => void
  error?: string
  label?: string
}

type ImportStep = 'search' | 'select-tees' | 'saving'

export function CourseSelector({ value, onChange, onImport, error, label = 'Course' }: Props) {
  const { currentUser } = useAuth()
  const { courses } = useCourses()
  const [showImport, setShowImport] = useState(false)
  const [importStep, setImportStep] = useState<ImportStep>('search')
  const [apiCourse, setApiCourse] = useState<ApiCourse | null>(null)
  const [selectedTees, setSelectedTees] = useState<ApiTee[]>([])
  const [importError, setImportError] = useState('')

  function handleApiCourseSelect(course: ApiCourse) {
    setApiCourse(course)
    setSelectedTees([])
    setImportStep('select-tees')
  }

  function toggleTee(tee: ApiTee) {
    setSelectedTees((prev) => {
      const exists = prev.some(
        (t) => t.tee_name === tee.tee_name && t.course_rating === tee.course_rating,
      )
      return exists
        ? prev.filter((t) => !(t.tee_name === tee.tee_name && t.course_rating === tee.course_rating))
        : [...prev, tee]
    })
  }

  async function handleImport() {
    if (!currentUser || !apiCourse || selectedTees.length === 0) return
    setImportStep('saving')
    setImportError('')
    try {
      const tees = selectedTees.map(apiTeeToTee)
      const name = displayCourseName(apiCourse)
      const courseId = await courseService.createCourseWithTees(name, tees, currentUser.uid)
      // snapshot listener will update courses in all useCourses() instances automatically
      onChange(courseId)
      onImport?.(courseId, tees.map((t) => t.teeId))
      setShowImport(false)
      setImportStep('search')
      setApiCourse(null)
      setSelectedTees([])
    } catch {
      setImportError('Failed to save course. Please try again.')
      setImportStep('select-tees')
    }
  }

  function cancelImport() {
    setShowImport(false)
    setImportStep('search')
    setApiCourse(null)
    setSelectedTees([])
    setImportError('')
  }

  return (
    <div className="flex flex-col gap-2">
      {!showImport ? (
        <SelectField
          label={label}
          value={value}
          onChange={onChange}
          options={[...courses].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')).map((c) => ({ value: c.courseId, label: c.name }))}
          placeholder="Select a course"
          error={error}
          dropdownFooter={(close) => (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); close(); setShowImport(true) }}
              className="w-full px-3 py-2 text-sm text-brand hover:text-brand hover:bg-card-bg text-left transition-colors"
            >
              + Course not listed? Search &amp; add it
            </button>
          )}
        />
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-bg p-4">
          {importError && <p className="text-sm text-danger">{importError}</p>}

          {importStep === 'search' && (
            <>
              <CourseSearchBox onSelect={handleApiCourseSelect} />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={cancelImport}
              >
                ← Back to course list
              </Button>
            </>
          )}

          {importStep === 'select-tees' && apiCourse && (
            <>
              <ApiTeeSelector
                course={apiCourse}
                selectedTees={selectedTees}
                onToggle={toggleTee}
              />
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => { setImportStep('search'); setApiCourse(null) }}
                  className="flex-1"
                >
                  ← Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={selectedTees.length === 0}
                  onClick={handleImport}
                  className="flex-1"
                >
                  Save &amp; Select
                </Button>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={cancelImport}
                className="w-full"
              >
                Cancel
              </Button>
            </>
          )}

          {importStep === 'saving' && (
            <div className="flex items-center justify-center gap-3 py-6">
              <Spinner size="sm" />
              <p className="text-muted text-sm">Saving course...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
