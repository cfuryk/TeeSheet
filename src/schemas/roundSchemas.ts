import { z } from 'zod'

export const roundFormSchema = z.object({
  name: z.string().min(2, 'Round name must be at least 2 characters'),
  courseId: z.string().min(1, 'Select a course'),
  teeId: z.string().min(1, 'Select a tee'),
  date: z.string().min(1, 'Select a date and time'),
  scoringFormat: z.enum(['individual', 'two_team', 'scramble']),
  roundType: z.enum([
    'STROKE_GROSS',
    'STROKE_NET',
    'BEST_BALL_GROSS',
    'BEST_BALL_NET',
    'TWO_TEAM_STROKE_GROSS',
    'TWO_TEAM_STROKE_NET',
    'TWO_TEAM_BB_MATCH_GROSS',
    'TWO_TEAM_BB_MATCH_NET',
    'TWO_TEAM_BB_STROKE_GROSS',
    'TWO_TEAM_BB_STROKE_NET',
    'SCRAMBLE_GROSS',
  ]),
  isPrivate: z.boolean(),
})

export type RoundFormValues = z.infer<typeof roundFormSchema>
