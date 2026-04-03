import { z } from 'zod'

const holeSchema = z.object({
  number: z.number().int().min(1).max(18),
  par: z.number().int().min(3).max(5),
  yardage: z.number().int().min(1).max(700),
  handicap: z.number().int().min(1).max(18),
})

export const courseFormSchema = z.object({
  name: z.string().min(2, 'Course name must be at least 2 characters'),
})

export const teeFormSchema = z
  .object({
    name: z.string().min(1, 'Tee name is required'),
    par: z.coerce.number().int().min(60).max(80),
    yardage: z.coerce.number().int().min(1000).max(8000),
    slope: z.coerce.number().min(55).max(155),
    rating: z.coerce.number().min(60).max(80),
    holes: z.array(holeSchema).length(18, 'Must have exactly 18 holes'),
  })
  .superRefine((data, ctx) => {
    // Validate handicap values 1-18 are all unique
    const hcaps = data.holes.map((h) => h.handicap)
    const unique = new Set(hcaps)
    if (unique.size !== 18) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each hole must have a unique handicap value (1-18)',
        path: ['holes'],
      })
    }
    // Validate hole numbers 1-18 are all unique
    const nums = data.holes.map((h) => h.number)
    const uniqueNums = new Set(nums)
    if (uniqueNums.size !== 18) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each hole number must be unique (1-18)',
        path: ['holes'],
      })
    }
  })

export type CourseFormValues = z.infer<typeof courseFormSchema>
export type TeeFormValues = z.infer<typeof teeFormSchema>
