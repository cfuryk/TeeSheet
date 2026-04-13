import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/hooks/useAuth'
import { useCourses } from '@/hooks/useCourses'
import { Input, Button, Alert, SelectField, Card, DateInput } from '@/components/ui'
import { CourseSelector } from '@/components/course/CourseSelector'
import { localDateFromString } from '@/lib/formatters'
import { golferScoreService } from '@/services/golferScoreService'
import { userService } from '@/services/userService'

const schema = z.object({
  courseId: z.string().min(1, 'Select a course'),
  teeId: z.string().min(1, 'Select a tee'),
  date: z.string().min(1, 'Select a date'),
  grossScore: z.coerce.number().int().min(50, 'Score seems too low').max(200, 'Score seems too high'),
})

type FormValues = z.infer<typeof schema>

export function SimpleScorePage() {
  const { currentUser, userProfile } = useAuth()
  const { courses } = useCourses()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, control, setValue, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { date: new Date().toISOString().slice(0, 10), grossScore: undefined },
    })

  const selectedCourseId = watch('courseId')
  const selectedCourse = courses.find((c) => c.courseId === selectedCourseId)
  const teeOptions = selectedCourse?.tees.map((t) => ({ value: t.teeId, label: t.name })) ?? []

  async function onSubmit(data: FormValues) {
    if (!currentUser || !userProfile) return
    try {
      setError('')
      const course = courses.find((c) => c.courseId === data.courseId)
      const tee = course?.tees.find((t) => t.teeId === data.teeId)
      if (!course || !tee) {
        setError('Invalid course or tee selection.')
        return
      }

      const roundDate = Timestamp.fromDate(localDateFromString(data.date))

      await golferScoreService.addScoreFromSimple({
        golferId: currentUser.uid,
        golferName: userProfile.displayName,
        roundId: null,
        courseId: data.courseId,
        courseName: course.name,
        teeId: data.teeId,
        teeName: tee.name,
        date: roundDate,
        grossScore: data.grossScore,
        courseRating: tee.rating,
        slope: tee.slope,
      })

      await userService.recalculateHandicap(currentUser.uid)
      navigate('/my-scores')
    } catch (e) {
      console.error('SimpleScorePage error:', e)
      setError('Failed to save score. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-brand">Enter Score</h2>
      <Card className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && <Alert message={error} />}

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
                label="Date Played"
                value={field.value}
                onChange={field.onChange}
                error={errors.date?.message}
              />
            )}
          />

          <Input
            label="Score"
            type="number"
            placeholder="e.g. 92"
            {...register('grossScore')}
            error={errors.grossScore?.message}
          />

          <div className="flex gap-2 mt-2">
            <Button type="submit" loading={isSubmitting} className="flex-1">
              Save Score
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/rounds/new')} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
