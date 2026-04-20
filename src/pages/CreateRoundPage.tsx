import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCourses } from '@/hooks/useCourses'
import { roundService } from '@/services/roundService'
import { groupService } from '@/services/groupService'
import { eventService } from '@/services/eventService'
import { roundFormSchema, RoundFormValues, MatchFormValues } from '@/schemas/roundSchemas'
import { Input, Button, Alert, SelectField, Card, DateInput } from '@/components/ui'
import { CourseSelector } from '@/components/course/CourseSelector'
import { MatchForm } from '@/components/round/MatchForm'
import { useState, useEffect } from 'react'

export function CreateRoundPage() {
  const { currentUser, userProfile } = useAuth()
  const { courses } = useCourses()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId') ?? undefined
  const [error, setError] = useState('')
  const [match, setMatch] = useState<MatchFormValues | null>(null)

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
  const selectedCourse = courses.find((c) => c.courseId === selectedCourseId)
  const isScramble = watch('scoringFormat') === 'scramble'

  const namePlaceholder = (() => {
    const options = [
      'Weekend Warriors',
      'A Game of Whack Fuck',
      'Saturdays Are For the Boys',
      'Edward Fore Tee Hands',
      'Drunk Driver',
      'The Mulligan Mafia',
      'Fore Skins',
      'Hazard Hunters',
      'Glizzy Gobblers',
    ]
    return `Ex: ${options[Math.floor(Math.random() * options.length)]}`
  })()
  const teeOptions = selectedCourse?.tees.map((t) => ({ value: t.teeId, label: t.name })) ?? []

  // Auto-fill round name from host name + course name whenever either changes,
  // but only if the user hasn't manually edited the name field
  const hostName = userProfile?.displayName ?? currentUser?.displayName ?? ''
  useEffect(() => {
    if (!selectedCourse) return
    const generated = `${hostName} @ ${selectedCourse.name}`.trim()
    setValue('name', generated, { shouldValidate: false })
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
        eventId,
        match ?? undefined,
        tee?.yardage,
        tee?.rating,
        tee?.slope,
      )
      if (eventId) {
        await eventService.addRoundToEvent(eventId, roundId)
        await eventService.cascadeEventMembersToRound(eventId, roundId)
      }
      // Create the creator's group first, then fill remaining members into groups of 4.
      // If a match with foursomes is configured, those replace the auto-filled groups.
      if (match?.foursomes && match.foursomes.length > 0) {
        await groupService.applyMatchFoursomes(roundId, match.foursomes)
      } else {
        await groupService.createGroup(roundId, currentUser.uid)
        if (eventId) {
          const event = await eventService.getEvent(eventId)
          if (event && event.memberIds.length > 1) {
            await groupService.fillGroupsFromMembers(roundId, event.memberIds, currentUser.uid)
          }
        }
      }
      navigate(`/rounds/${roundId}`)
    } catch (e) {
      console.error('createRound error:', e)
      setError('Failed to create round. Please try again.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-brand">Start Round</h1>

      {error && <Alert message={error} />}

      <Card className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Input
              label="Round Name"
              {...register('name')}
              error={errors.name?.message}
              placeholder={namePlaceholder}
            />

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

          <label className="flex items-center gap-2 text-sm text-brand">
            <input type="checkbox" {...register('isPrivate')} className="rounded" />
            Private round (only visible to invited players)
          </label>

          <label className="flex items-center gap-2 text-sm text-brand">
            <input
              type="checkbox"
              className="rounded"
              checked={isScramble}
              onChange={(e) => {
                if (e.target.checked) {
                  setValue('scoringFormat', 'scramble')
                  setValue('roundType', 'SCRAMBLE_GROSS')
                  setMatch(null)
                } else {
                  setValue('scoringFormat', 'individual')
                  setValue('roundType', 'STROKE_GROSS')
                }
              }}
            />
            Scramble — one score per group, gross only
          </label>

          {!isScramble && <MatchForm value={match} onChange={setMatch} />}

          <Button type="submit" loading={isSubmitting} className="w-full mt-2">
            Start Round
          </Button>
        </form>
      </Card>
    </div>
  )
}
