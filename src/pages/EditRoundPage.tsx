import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { useRound } from '@/hooks/useRound'
import { useCourses } from '@/hooks/useCourses'
import { roundService } from '@/services/roundService'
import { roundFormSchema, RoundFormValues } from '@/schemas/roundSchemas'
import { Input, Button, Alert, SelectField, Card, DateInput, Spinner } from '@/components/ui'
import { CourseSelector } from '@/components/course/CourseSelector'
import { localDateFromString } from '@/lib/formatters'
import { useState } from 'react'

const roundTypeOptions = [
  { value: 'STROKE_GROSS', label: 'Stroke Play (Gross)' },
  { value: 'STROKE_NET', label: 'Stroke Play (Net)' },
  { value: 'BEST_BALL_GROSS', label: 'Best Ball (Gross) - 2v2' },
  { value: 'BEST_BALL_NET', label: 'Best Ball (Net) - 2v2' },
]

export function EditRoundPage() {
  const { roundId } = useParams<{ roundId: string }>()
  const { round, loading } = useRound(roundId!)
  const { courses } = useCourses()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, control, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<RoundFormValues>({
      resolver: zodResolver(roundFormSchema),
      defaultValues: { roundType: 'STROKE_GROSS', isPrivate: false, date: '' },
    })

  useEffect(() => {
    if (!round) return
    reset({
      name: round.name,
      courseId: round.courseId,
      teeId: round.teeId,
      date: round.date.toDate().toISOString().slice(0, 10),
      roundType: round.roundType,
      isPrivate: round.isPrivate,
    })
  }, [round, reset])

  const selectedCourseId = watch('courseId')
  const selectedCourse = courses.find((c) => c.courseId === selectedCourseId)
  const teeOptions = selectedCourse?.tees.map((t) => ({ value: t.teeId, label: t.name })) ?? []

  async function onSubmit(data: RoundFormValues) {
    if (!round) return
    try {
      setError('')
      const course = courses.find((c) => c.courseId === data.courseId)
      const tee = course?.tees.find((t) => t.teeId === data.teeId)
      await roundService.updateRound(round.roundId, {
        name: data.name,
        courseId: data.courseId,
        courseName: course?.name ?? round.courseName,
        teeId: data.teeId,
        teeName: tee?.name ?? round.teeName,
        date: Timestamp.fromDate(localDateFromString(data.date)),
        roundType: data.roundType,
        isPrivate: data.isPrivate,
      })
      navigate(`/rounds/${round.roundId}`)
    } catch {
      setError('Failed to update round. Please try again.')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white">Edit Round</h2>
      <Card className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && <Alert message={error} />}
          <Input label="Round Name" {...register('name')} error={errors.name?.message} />
          <Controller
            name="courseId"
            control={control}
            render={({ field }) => (
              <CourseSelector
                value={field.value ?? ''}
                onChange={field.onChange}
                onImport={(_courseId, teeIds) => {
                  if (teeIds.length === 1) setValue('teeId', teeIds[0], { shouldValidate: true })
                }}
                error={errors.courseId?.message}
              />
            )}
          />
          {selectedCourse && (
            <Controller
              name="teeId"
              control={control}
              render={({ field }) => (
                <SelectField
                  label="Tee"
                  options={teeOptions}
                  placeholder="Select tees"
                  error={errors.teeId?.message}
                  {...field}
                />
              )}
            />
          )}
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DateInput
                label="Date"
                value={field.value}
                onChange={field.onChange}
                error={errors.date?.message}
              />
            )}
          />
          <Controller
            name="roundType"
            control={control}
            render={({ field }) => (
              <SelectField label="Round Type" options={roundTypeOptions} error={errors.roundType?.message} {...field} />
            )}
          />
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" {...register('isPrivate')} className="rounded" />
            Private round (only visible to invited players)
          </label>
          <div className="flex gap-2 mt-2">
            <Button type="submit" loading={isSubmitting} className="flex-1">
              Save Changes
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/rounds/${roundId}`)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
