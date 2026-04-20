import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { useRound } from '@/hooks/useRound'
import { useCourses } from '@/hooks/useCourses'
import { roundService } from '@/services/roundService'
import { userService } from '@/services/userService'
import { eventService } from '@/services/eventService'
import { groupService } from '@/services/groupService'
import { roundFormSchema, RoundFormValues, MatchFormValues } from '@/schemas/roundSchemas'
import { Input, Button, Alert, SelectField, Card, DateInput, Spinner } from '@/components/ui'
import { CourseSelector } from '@/components/course/CourseSelector'
import { MatchForm } from '@/components/round/MatchForm'
import { localDateFromString } from '@/lib/formatters'

export function EditRoundPage() {
  const { roundId } = useParams<{ roundId: string }>()
  const { round, loading } = useRound(roundId!)
  const { courses } = useCourses()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [match, setMatch] = useState<MatchFormValues | null>(null)
  const [roundMembers, setRoundMembers] = useState<{ uid: string; displayName: string; handicap: number | null }[]>([])

  const { register, handleSubmit, watch, control, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<RoundFormValues>({
      resolver: zodResolver(roundFormSchema),
      defaultValues: { roundType: 'STROKE_GROSS', scoringFormat: 'individual', isPrivate: false, date: '' },
    })

  useEffect(() => {
    if (!round) return
    reset({
      name: round.name,
      courseId: round.courseId,
      teeId: round.teeId,
      date: round.date.toDate().toISOString().slice(0, 10),
      roundType: round.roundType,
      scoringFormat: round.scoringFormat,
      isPrivate: round.isPrivate,
    })
    setMatch(round.match
      ? {
          teamFormat: round.match.teamFormat,
          scoring: round.match.scoring,
          handicapPercent: round.match.handicapPercent,
          matchType: round.match.matchType,
          teamA: round.match.teamA ?? [],
          teamB: round.match.teamB ?? [],
          foursomes: round.match.foursomes ?? [],
        }
      : null
    )
  }, [round, reset])

  // Load member display names + handicaps for team builder.
  // Uses event handicaps when the round belongs to an event, otherwise teeSheetHandicap.
  useEffect(() => {
    if (!round || round.memberIds.length === 0) return
    async function load() {
      const [profiles, event] = await Promise.all([
        Promise.all(round!.memberIds.map((uid) => userService.getProfile(uid))),
        round!.eventId ? eventService.getEvent(round!.eventId) : Promise.resolve(null),
      ])
      const eventHandicaps = event?.handicaps ?? {}
      setRoundMembers(
        profiles
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map((p) => ({
            uid: p.uid,
            displayName: p.displayName,
            handicap: round!.eventId
              ? (eventHandicaps[p.uid] ?? null)
              : p.teeSheetHandicap,
          })),
      )
    }
    load()
  }, [round?.memberIds.join(','), round?.eventId])

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
        ...(tee?.yardage != null ? { teeYardage: tee.yardage } : {}),
        ...(tee?.rating != null ? { teeRating: tee.rating } : {}),
        ...(tee?.slope != null ? { teeSlope: tee.slope } : {}),
        date: Timestamp.fromDate(localDateFromString(data.date)),
        roundType: round.roundType,
        isPrivate: data.isPrivate,
        ...(round.wager != null ? { wager: round.wager } : {}),
        ...(match != null ? { match } : {}),
      })
      if (match?.foursomes && match.foursomes.length > 0) {
        await groupService.applyMatchFoursomes(round.roundId, match.foursomes)
      }
      navigate(`/rounds/${round.roundId}`)
    } catch (e) {
      console.error(e)
      setError('Failed to update round. Please try again.')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-brand">Edit Round</h2>
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
          <label className="flex items-center gap-2 text-sm text-brand">
            <input type="checkbox" {...register('isPrivate')} className="rounded" />
            Private round (only visible to invited players)
          </label>
          {round?.scoringFormat === 'scramble' ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand/10 border border-brand/30">
              <span className="text-xs font-semibold text-brand uppercase tracking-wide">Scramble · Gross</span>
              <span className="text-xs text-muted">(scoring format cannot be changed after creation)</span>
            </div>
          ) : (
            <MatchForm value={match} onChange={setMatch} roundMembers={roundMembers} />
          )}
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
