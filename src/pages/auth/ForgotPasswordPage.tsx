import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/schemas/userSchemas'
import { Input, Button, Alert } from '@/components/ui'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  async function onSubmit(data: ForgotPasswordFormData) {
    try {
      setError('')
      await resetPassword(data.email)
      setSent(true)
    } catch {
      setError('Failed to send reset email. Check the address and try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-black text-white text-center mb-8">Reset Password</h1>

        {sent ? (
          <Alert message="Check your email for a password reset link." type="success" />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {error && <Alert message={error} />}
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            <Button type="submit" loading={isSubmitting} className="w-full">
              Send Reset Email
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="text-green-400 hover:text-green-300">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
