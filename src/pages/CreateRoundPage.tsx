import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCourses } from '@/hooks/useCourses'
import { roundService } from '@/services/roundService'
import { groupService } from '@/services/groupService'
import { roundFormSchema, RoundFormValues } from '@/schemas/roundSchemas'
import { Input, Button, Alert, SelectField, Card, DateInput } from '@/components/ui'
import { CourseSelector } from '@/components/course/CourseSelector'
import { useState, useEffect } from 'react'

export function CreateRoundPage() {
  const { currentUser, userProfile } = useAuth()
  const { courses } = useCourses()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, control, setValue, formState: { errors, isSubmitting } } = useForm<RoundFormValues>({
    resolver: zodResolver(roundFormSchema),
    defaultValues: {
      scoringFormat: 'individual',
      roundType: 'STROKE_GROSS',
      isPrivate: false,
      date: new Date().toISOString().slice(0, 10),
    },
  })

  const selectedCourseId = watch('courseId')
  const roundName = watch('name')
  const selectedCourse = courses.find((c) => c.courseId === selectedCourseId)
  const teeOptions = selectedCourse?.tees.map((t) => ({ value: t.teeId, label: t.name })) ?? []

  // Auto-fill round name from host name + course name whenever either changes,
  // but only if the user hasn't manually edited the name field
  const hostName = userProfile?.displayName ?? currentUser?.displayName ?? ''
  useEffect(() => {
    if (!selectedCourse) return
    const generated = `${hostName} @ ${selectedCourse.name}`.trim()
    if (!roundName || roundName === watch('name')) {
      setValue('name', generated, { shouldValidate: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, hostName])

  async function onSubmit(data: RoundFormValues) {
    if (!currentUser) return
    try {
      setError('')
      const course = courses.find((c) => c.courseId === data.courseId)
      const tee = course?.tees.find((t) => t.teeId === data.teeId)
      const roundId = await roundService.createRound(
        data,
        currentUser.uid,
        course?.name ?? '',
        tee?.name ?? '',
      )
      const groupId = await groupService.createGroup(roundId, currentUser.uid)
      navigate(`/rounds/${roundId}/groups/${groupId}`)
    } catch {
      setError('Failed to create round. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-white">Start Round</h1>

      {error && <Alert message={error} />}

      <Card className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {roundName && (
            <Input
              label="Round Name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="e.g. Saturday Morning"
            />
          )}

          {/* Course */}
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
                minToday
              />
            )}
          />

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" {...register('isPrivate')} className="rounded" />
            Private round (only visible to invited players)
          </label>

          <Button type="submit" loading={isSubmitting} className="w-full mt-2">
            Start Round
          </Button>
        </form>
      </Card>
    </div>
  )
}
