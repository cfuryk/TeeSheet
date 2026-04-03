import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
import { useCourses } from '@/hooks/useCourses'
import { eventService } from '@/services/eventService'
import { roundService } from '@/services/roundService'
import { courseService } from '@/services/courseService'
import { Input, SelectField, Button, Alert, Card, DateInput } from '@/components/ui'
import { CourseSelector } from '@/components/course/CourseSelector'
import { eventFormSchema } from '@/schemas/eventSchemas'
import type { EventFormData } from '@/types'

const roundTypeOptions = [
  { value: 'STROKE_GROSS', label: 'Stroke (Gross)' },
  { value: 'STROKE_NET', label: 'Stroke (Net)' },
  { value: 'BEST_BALL_GROSS', label: 'Best Ball (Gross)' },
  { value: 'BEST_BALL_NET', label: 'Best Ball (Net)' },
]

export function CreateEventPage() {
  const { currentUser } = useAuth()
  const { courses } = useCourses()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: { type: 'single_round', isPrivate: false, date: new Date().toISOString().slice(0, 10) },
  })

  const watchedCourseId = watch('courseId')
  const selectedCourse = courses.find((c) => c.courseId === watchedCourseId)
  const teeOptions = selectedCourse?.tees.map((t) => ({ value: t.teeId, label: t.name })) ?? []

  async function onSubmit(data: EventFormData) {
    if (!currentUser) return
    setLoading(true)
    setError('')
    try {
      const eventId = await eventService.createEvent(data, currentUser.uid)

      if (data.type === 'single_round' && data.courseId && data.teeId) {
        const course = await courseService.getCourse(data.courseId)
        const tee = course?.tees.find((t) => t.teeId === data.teeId)
        if (course && tee) {
          const roundId = await roundService.createRound(
            {
              name: data.name,
              courseId: data.courseId,
              teeId: data.teeId,
              date: data.date,
              roundType: data.roundType ?? 'STROKE_GROSS',
              isPrivate: data.isPrivate,
            },
            currentUser.uid,
            course.name,
            tee.name,
            eventId,
          )
          await eventService.addRoundToEvent(eventId, roundId)
          navigate(`/rounds/${roundId}`)
          return
        }
      }

      navigate(`/events/${eventId}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Create Event</h1>

      {error && <Alert message={error} />}

      <Card className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Event Name" error={errors.name?.message} {...register('name')} />
          <Input label="Description" error={errors.description?.message} {...register('description')} />
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
          {teeOptions.length > 0 && (
            <SelectField
              label="Tee"
              options={teeOptions}
              placeholder="Select tee"
              error={errors.teeId?.message}
              {...register('teeId')}
            />
          )}
          <SelectField
            label="Round Type"
            options={roundTypeOptions}
            error={errors.roundType?.message}
            {...register('roundType')}
          />
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" {...register('isPrivate')} className="rounded" />
            Private event
          </label>
          <Button type="submit" loading={loading} className="w-full">
            Create Event
          </Button>
        </form>
      </Card>
    </div>
  )
}
