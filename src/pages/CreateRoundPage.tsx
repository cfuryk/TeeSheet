import { useState } from 'react'
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
import type { ScoringFormat, RoundType } from '@/types'

const INDIVIDUAL_TYPES: { value: RoundType; label: string; detail: string }[] = [
  {
    value: 'STROKE_GROSS',
    label: 'Stroke (Gross)',
    detail: 'Every player competes individually. Total strokes across all 18 holes determines the winner. No handicaps applied.',
  },
  {
    value: 'STROKE_NET',
    label: 'Stroke (Net)',
    detail: 'Every player competes individually. Handicap strokes are subtracted from gross score. The lowest net score wins.',
  },
  {
    value: 'BEST_BALL_GROSS',
    label: '2-Man Best Ball (Gross)',
    detail: 'Players are paired into 2-man teams. On each hole, the lower of the two partners\' gross scores counts as the team score. The team with the lowest 18-hole total wins.',
  },
  {
    value: 'BEST_BALL_NET',
    label: '2-Man Best Ball (Net)',
    detail: 'Players are paired into 2-man teams. On each hole, the lower of the two partners\' net scores (after handicap) counts as the team score. The team with the lowest 18-hole total wins.',
  },
]

const TWO_TEAM_TYPES: { value: RoundType; label: string; detail: string }[] = [
  {
    value: 'TWO_TEAM_STROKE_GROSS',
    label: 'Stroke (Gross)',
    detail: 'All participants are split into two event-wide teams (A and B). Every player\'s gross score is added together. The team with the lowest combined total wins.',
  },
  {
    value: 'TWO_TEAM_STROKE_NET',
    label: 'Stroke (Net)',
    detail: 'All participants are split into two event-wide teams (A and B). Every player\'s net score (after handicap) is added together. The team with the lowest combined total wins.',
  },
  {
    value: 'TWO_TEAM_BB_MATCH_GROSS',
    label: '2-Man Best Ball - Match Play (Gross)',
    detail: 'Players from each team are paired 2v2 within each group. On each hole, the best ball of Team A is compared to the best ball of Team B. The team that wins more holes wins the group and earns 1 point for their team. A tied group earns ½ point each. Tied holes award no points.',
  },
  {
    value: 'TWO_TEAM_BB_MATCH_NET',
    label: '2-Man Best Ball - Match Play (Net)',
    detail: 'Players from each team are paired 2v2. On each hole, the best net ball of Team A is compared to the best net ball of Team B after handicap strokes are applied. The team that wins more holes wins the group and earns 1 point. A tied group earns ½ point each. Tied holes award no points.',
  },
  {
    value: 'TWO_TEAM_BB_STROKE_GROSS',
    label: '2-Man Best Ball - Stroke (Gross)',
    detail: 'Players are paired into 2-man teams. The best gross score on each hole is kept for each pair. At the end of the round, all pairs\' best ball totals are added together by team. The team with the lowest combined best ball score wins.',
  },
  {
    value: 'TWO_TEAM_BB_STROKE_NET',
    label: '2-Man Best Ball - Stroke (Net)',
    detail: 'Players are paired into 2-man teams. On each hole, the lower of the two partners\' net scores (after handicap) counts as the pair\'s score. At the end of the round, all pairs\' best ball net totals are added together by team. The team with the lowest combined total wins.',
  },
]

const SCRAMBLE_TYPES: { value: RoundType; label: string; detail: string }[] = [
  {
    value: 'SCRAMBLE_GROSS',
    label: 'Scramble',
    detail: 'All players hit each shot, the best shot is selected and everyone plays from that spot. One shared group score is recorded per hole. Scores do not affect handicaps.',
  },
]

export function CreateRoundPage() {
  const { currentUser } = useAuth()
  const { courses } = useCourses()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [scoringFormat, setScoringFormat] = useState<ScoringFormat>('individual')
  const [showInfo, setShowInfo] = useState(false)
  const [showFormatInfo, setShowFormatInfo] = useState(false)

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
  const selectedRoundType = watch('roundType')
  const selectedCourse = courses.find((c) => c.courseId === selectedCourseId)
  const teeOptions = selectedCourse?.tees.map((t) => ({ value: t.teeId, label: t.name })) ?? []
  const typeOptions = scoringFormat === 'individual' ? INDIVIDUAL_TYPES : scoringFormat === 'two_team' ? TWO_TEAM_TYPES : SCRAMBLE_TYPES

  function handleFormatChange(fmt: ScoringFormat) {
    setScoringFormat(fmt)
    setValue('scoringFormat', fmt)
    const defaultType = fmt === 'individual' ? 'STROKE_GROSS' : fmt === 'two_team' ? 'TWO_TEAM_STROKE_GROSS' : 'SCRAMBLE_GROSS'
    setValue('roundType', defaultType)
  }

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
      <h1 className="text-2xl font-bold text-white">Create Round</h1>

      {error && <Alert message={error} />}


      {/* Scoring Format Info Modal */}
      {showFormatInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h2 className="text-base font-semibold text-white">Scoring Formats</h2>
              <button onClick={() => setShowFormatInfo(false)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto max-h-[70vh] divide-y divide-gray-700">
              <div className="px-4 py-4">
                <p className="text-sm font-semibold text-white mb-1">Individual</p>
                <p className="text-sm text-gray-400 leading-relaxed">Each player competes on their own. Scores are tracked per player and count toward handicap calculation.</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm font-semibold text-white mb-1">Two Team</p>
                <p className="text-sm text-gray-400 leading-relaxed">All players are divided into two event-wide teams (Team A and Team B). Various formats are available including stroke play and best ball match play.</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm font-semibold text-white mb-1">Scramble</p>
                <p className="text-sm text-gray-400 leading-relaxed">Each group records one shared score. All players hit each shot, the best shot is selected, and everyone plays from that spot. Groups can be any size. Scores do not affect handicaps.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Round Type Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h2 className="text-base font-semibold text-white">
                Round Types — {scoringFormat === 'individual' ? 'Individual' : 'Two Team'}
              </h2>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto max-h-[70vh] divide-y divide-gray-700">
              {typeOptions.map((opt) => (
                <div key={opt.value} className="px-4 py-4">
                  <p className="text-sm font-semibold text-white mb-1">{opt.label}</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{opt.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Card className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Input
            label="Round Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="e.g. Saturday Morning"
          />

          {/* Scoring Format */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">Scoring Format</span>
              <button
                type="button"
                onClick={() => setShowFormatInfo(true)}
                className="w-5 h-5 rounded-full border border-green-500 text-green-400 hover:text-white hover:bg-green-500 text-xs font-bold leading-none flex items-center justify-center transition-colors"
                aria-label="Scoring format descriptions"
              >
                i
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['individual', 'two_team', 'scramble'] as ScoringFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleFormatChange(fmt)}
                  className={`py-3 px-2 rounded-xl border-2 text-sm font-semibold transition-all text-center ${
                    scoringFormat === fmt
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {fmt === 'individual' ? 'Individual' : fmt === 'two_team' ? 'Two Team' : 'Scramble'}
                </button>
              ))}
            </div>
          </div>

          {/* Round Type */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">Round Type</span>
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className="w-5 h-5 rounded-full border border-green-500 text-green-400 hover:text-white hover:bg-green-500 text-xs font-bold leading-none flex items-center justify-center transition-colors"
                aria-label="Round type descriptions"
              >
                i
              </button>
            </div>
            <SelectField
              options={typeOptions.map((o) => ({ value: o.value, label: o.label }))}
              value={selectedRoundType}
              onChange={(val) => setValue('roundType', val as RoundType)}
            />
            {(() => {
              const selected = typeOptions.find((o) => o.value === selectedRoundType)
              return selected ? (
                <p className="text-sm text-gray-400 leading-relaxed px-1">{selected.detail}</p>
              ) : null
            })()}
          </div>

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

          {/* Wager */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Wager per Person (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register('wager')}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500">Each player antes in. Winner(s) split the pot.</p>
          </div>

          <Button type="submit" loading={isSubmitting} className="w-full mt-2">
            Create Round
          </Button>
        </form>
      </Card>
    </div>
  )
}
