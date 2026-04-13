import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
import { eventService } from '@/services/eventService'
import { Input, Button, Alert, Card, DateInput } from '@/components/ui'
import { eventFormSchema } from '@/schemas/eventSchemas'
import type { EventFormData } from '@/types'

export function CreateEventPage() {
  const { currentUser } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: { type: 'multi_round', isPrivate: false, date: new Date().toISOString().slice(0, 10) },
  })

  async function onSubmit(data: EventFormData) {
    if (!currentUser) return
    setLoading(true)
    setError('')
    try {
      const eventId = await eventService.createEvent(data, currentUser.uid)
      navigate(`/events/${eventId}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-brand">Create Event</h1>

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
          <label className="flex items-center gap-2 text-sm text-brand">
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
