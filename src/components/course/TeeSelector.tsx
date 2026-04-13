import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { golfCourseApiService, type ApiCourse, type ApiTee } from '@/services/golfCourseApiService'
import { courseService } from '@/services/courseService'
import { apiTeeToTee } from '@/lib/courseApiMapper'
import { ApiTeeSelector } from './ApiTeeSelector'
import { Button, Spinner, SelectField } from '@/components/ui'
import type { Course } from '@/types'

interface Props {
  course: Course
  value: string
  onChange: (teeId: string) => void
  onTeesAdded?: (teeId: string) => void
  error?: string
}

type Step = 'idle' | 'loading' | 'select' | 'saving'

export function TeeSelector({ course, value, onChange, onTeesAdded, error }: Props) {
  const { currentUser } = useAuth()
  const [step, setStep] = useState<Step>('idle')
  const [apiCourse, setApiCourse] = useState<ApiCourse | null>(null)
  const [selectedApiTees, setSelectedApiTees] = useState<ApiTee[]>([])
  const [fetchError, setFetchError] = useState('')

  const teeOptions = course.tees.map((t) => ({ value: t.teeId, label: t.name }))
  const hasApiId = (course as Course & { apiId?: string }).apiId !== undefined

  async function handleOpenTeeImport() {
    setStep('loading')
    setFetchError('')
    setSelectedApiTees([])
    try {
      const fetched = await golfCourseApiService.getCourse(Number((course as Course & { apiId?: string }).apiId!))
      if (!fetched) throw new Error('Not found')
      setApiCourse(fetched)
      setStep('select')
    } catch {
      setFetchError('Failed to load tees. Please try again.')
      setStep('idle')
    }
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

  async function handleConfirm() {
    if (!currentUser || selectedApiTees.length === 0) return
    setStep('saving')
    setFetchError('')
    try {
      const isDuplicate = (apiTee: ApiTee) =>
        course.tees.some(
          (t) =>
            t.name === apiTee.tee_name &&
            t.slope === apiTee.slope_rating &&
            t.rating === apiTee.course_rating,
        )

      const newApiTees = selectedApiTees.filter((t) => !isDuplicate(t))
      const newTees = newApiTees.map(apiTeeToTee)

      if (newTees.length > 0) {
        for (const tee of newTees) {
          await courseService.addTee(course.courseId, tee)
        }
      }

      // Resolve which teeId to select for the first chosen tee
      const first = selectedApiTees[0]
      const existingMatch = course.tees.find(
        (t) =>
          t.name === first.tee_name &&
          t.slope === first.slope_rating &&
          t.rating === first.course_rating,
      )
      const teeIdToSelect = existingMatch?.teeId ?? newTees[0]?.teeId

      setStep('idle')
      setApiCourse(null)
      setSelectedApiTees([])
      if (teeIdToSelect) {
        onChange(teeIdToSelect)
        onTeesAdded?.(teeIdToSelect)
      }
    } catch {
      setFetchError('Failed to save tees. Please try again.')
      setStep('select')
    }
  }

  function handleCancel() {
    setStep('idle')
    setApiCourse(null)
    setSelectedApiTees([])
    setFetchError('')
  }

  if (step === 'loading') {
    return (
      <div className="flex items-center gap-3 py-4">
        <Spinner size="sm" />
        <p className="text-sm text-muted">Loading tees…</p>
      </div>
    )
  }

  if (step === 'saving') {
    return (
      <div className="flex items-center gap-3 py-4">
        <Spinner size="sm" />
        <p className="text-sm text-muted">Saving tees…</p>
      </div>
    )
  }

  if ((step === 'select') && apiCourse) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-bg p-4">
        {fetchError && <p className="text-sm text-danger">{fetchError}</p>}
        <ApiTeeSelector
          course={apiCourse}
          selectedTees={selectedApiTees}
          onToggle={toggleTee}
        />
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" size="sm" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={selectedApiTees.length === 0}
            onClick={handleConfirm}
            className="flex-1"
          >
            Add &amp; Select
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {fetchError && <p className="text-sm text-danger">{fetchError}</p>}
      <SelectField
        label="Tee"
        value={value}
        onChange={onChange}
        options={teeOptions}
        placeholder="Select tees"
        error={error}
        dropdownFooter={
          hasApiId
            ? (close) => (
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); close(); handleOpenTeeImport() }}
                  className="w-full px-3 py-2 text-sm text-brand hover:text-brand-hover hover:bg-card-bg text-left transition-colors"
                >
                  + Tees not listed? Search &amp; add them
                </button>
              )
            : undefined
        }
      />
    </div>
  )
}
