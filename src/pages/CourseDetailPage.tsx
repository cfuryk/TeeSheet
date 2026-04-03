import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { courseService } from '@/services/courseService'
import type { ApiCourse, ApiTee } from '@/services/golfCourseApiService'
import { apiTeeToTee, displayCourseName } from '@/lib/courseApiMapper'
import type { Course } from '@/types'
import { Button, Card, Alert, Spinner } from '@/components/ui'
import { TeeList } from '@/components/course/TeeList'
import { TeeForm } from '@/components/course/TeeForm'
import { CourseSearchBox } from '@/components/course/CourseSearchBox'
import { ApiTeeSelector } from '@/components/course/ApiTeeSelector'

type Step = 'search' | 'select-tees' | 'saving'

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const isNew = !courseId
  const { currentUser, userProfile } = useAuth()
  const navigate = useNavigate()

  // Existing course state
  const [course, setCourse] = useState<Course | null>(null)
  const [courseLoading, setCourseLoading] = useState(!isNew)
  const [showTeeForm, setShowTeeForm] = useState(false)
  const [editTeeId, setEditTeeId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // API import flow state
  const [step, setStep] = useState<Step>('search')
  const [selectedApiCourse, setSelectedApiCourse] = useState<ApiCourse | null>(null)
  const [selectedApiTees, setSelectedApiTees] = useState<ApiTee[]>([])

  useEffect(() => {
    if (courseId) {
      courseService.getCourse(courseId).then((c) => {
        setCourse(c)
        setCourseLoading(false)
      })
    }
  }, [courseId])

  function handleApiCourseSelect(apiCourse: ApiCourse) {
    setSelectedApiCourse(apiCourse)
    setSelectedApiTees([]) // reset selection when switching course
    setStep('select-tees')
  }

  function toggleTee(tee: ApiTee) {
    setSelectedApiTees((prev) => {
      const exists = prev.some(
        (t) => t.tee_name === tee.tee_name && t.course_rating === tee.course_rating,
      )
      return exists
        ? prev.filter((t) => !(t.tee_name === tee.tee_name && t.course_rating === tee.course_rating))
        : [...prev, tee]
    })
  }

  async function handleImport() {
    if (!currentUser || !selectedApiCourse || selectedApiTees.length === 0) return
    setStep('saving')
    setError('')
    try {
      const tees = selectedApiTees.map(apiTeeToTee)
      const name = displayCourseName(selectedApiCourse)
      const id = await courseService.createCourseWithTees(name, tees, currentUser.uid)
      navigate(`/courses/${id}`, { replace: true })
    } catch {
      setError('Failed to save course. Please try again.')
      setStep('select-tees')
    }
  }

  const canEdit = isNew || course?.createdBy === currentUser?.uid || userProfile?.isAdmin

  // ── Existing course view ─────────────────────────────────────────────────
  if (!isNew) {
    if (courseLoading) {
      return (
        <div className="flex items-center justify-center pt-16">
          <Spinner size="lg" />
        </div>
      )
    }
    if (!course) return <Alert message="Course not found." />

    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">{course.name}</h2>

        <TeeList
          course={course}
          canEdit={!!canEdit}
          onEdit={(teeId) => { setEditTeeId(teeId); setShowTeeForm(true) }}
          onDelete={async (teeId) => {
            await courseService.deleteTee(course.courseId, teeId)
            setCourse((prev) => prev ? { ...prev, tees: prev.tees.filter((t) => t.teeId !== teeId) } : null)
          }}
        />

        {canEdit && !showTeeForm && (
          <Button variant="secondary" onClick={() => { setEditTeeId(null); setShowTeeForm(true) }}>
            + Add Tee Set Manually
          </Button>
        )}

        {showTeeForm && (
          <TeeForm
            course={course}
            teeId={editTeeId}
            onSave={async (data) => {
              if (editTeeId) {
                await courseService.updateTee(course.courseId, editTeeId, data)
              } else {
                await courseService.addTee(course.courseId, data)
              }
              const updated = await courseService.getCourse(course.courseId)
              if (updated) setCourse(updated)
              setShowTeeForm(false)
              setEditTeeId(null)
            }}
            onCancel={() => { setShowTeeForm(false); setEditTeeId(null) }}
          />
        )}
      </div>
    )
  }

  // ── New course — API import flow ─────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white">Add Course</h2>

      {error && <Alert message={error} />}

      {step === 'search' && (
        <Card className="p-4">
          <CourseSearchBox onSelect={handleApiCourseSelect} />
        </Card>
      )}

      {step === 'select-tees' && selectedApiCourse && (
        <>
          <Card className="p-4">
            <ApiTeeSelector
              course={selectedApiCourse}
              selectedTees={selectedApiTees}
              onToggle={toggleTee}
            />
          </Card>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => { setStep('search'); setSelectedApiCourse(null) }}
              className="flex-1"
            >
              ← Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedApiTees.length === 0}
              className="flex-1"
            >
              Save to Database
            </Button>
          </div>
        </>
      )}

      {step === 'saving' && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Spinner size="lg" />
          <p className="text-gray-400">Saving course...</p>
        </div>
      )}
    </div>
  )
}
