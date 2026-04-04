import { z } from 'zod'

export const eventFormSchema = z.object({
  name: z.string().min(2, 'Event name must be at least 2 characters'),
  description: z.string().default(''),
  type: z.enum(['single_round', 'multi_round']),
  date: z.string().min(1, 'Select a date'),
  endDate: z.string().optional(),
  isPrivate: z.boolean(),
})
