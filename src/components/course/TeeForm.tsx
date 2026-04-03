import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Course } from '@/types'
import { teeFormSchema, TeeFormValues } from '@/schemas/courseSchemas'
import { Input, Button, Alert, Card } from '@/components/ui'
import { HoleTable } from './HoleTable'

interface Props {
  course: Course
  teeId: string | null
  onSave: (data: TeeFormValues) => Promise<void>
  onCancel: () => void
}

function defaultHoles() {
  return Array.from({ length: 18 }, (_, i) => ({
    number: i + 1,
    par: 4,
    yardage: 350,
    handicap: i + 1,
  }))
}

export function TeeForm({ course, teeId, onSave, onCancel }: Props) {
  const existingTee = course.tees.find((t) => t.teeId === teeId)

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<TeeFormValues>({
    resolver: zodResolver(teeFormSchema),
    defaultValues: existingTee ?? {
      name: '',
      par: 72,
      yardage: 6200,
      slope: 113,
      rating: 72.0,
      holes: defaultHoles(),
    },
  })

  const { fields } = useFieldArray({ control, name: 'holes' })

  async function onSubmit(data: TeeFormValues) {
    await onSave(data)
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-gray-900 mb-4">{existingTee ? 'Edit Tee Set' : 'Add Tee Set'}</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {errors.holes?.message && <Alert message={errors.holes.message as string} />}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tee Name" {...register('name')} error={errors.name?.message} placeholder="e.g. Blue" />
          <Input label="Slope" type="number" step="1" {...register('slope')} error={errors.slope?.message} />
          <Input label="Rating" type="number" step="0.1" {...register('rating')} error={errors.rating?.message} />
          <Input label="Total Par" type="number" {...register('par')} error={errors.par?.message} />
          <Input label="Total Yardage" type="number" {...register('yardage')} error={errors.yardage?.message} />
        </div>

        <HoleTable fields={fields} register={register} errors={errors} />

        <div className="flex gap-3">
          <Button type="submit" loading={isSubmitting}>Save Tee Set</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}
