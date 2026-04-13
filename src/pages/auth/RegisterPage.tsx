import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { registerSchema, RegisterFormData } from '@/schemas/userSchemas'
import { Input, Button, Alert } from '@/components/ui'

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterFormData) {
    try {
      setError('')
      await registerUser(data.email, data.password, data.displayName)
      navigate('/')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-4">
          <img src="/images/events/USBROPEN_LOGIN3.png" alt="USBROPEN" className="w-3/4 h-auto mx-auto" />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && <Alert message={error} />}
          <Input label="Name" type="text" {...register('displayName')} error={errors.displayName?.message} />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
          <Input label="Confirm Password" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-brand font-semibold hover:text-brand/70">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
